import { Transaction } from '@/models/Transaction';
import { checkAbacatePix, isAbacatePix } from '@/lib/abacatePix';
import { executeRechargeCredit } from '@/lib/creditRecharge';

/** Caller connects to the database first. Both webhook and polling use this path. */
export async function settleAbacatePix(id: string, userId?: string) {
    const filter = { abacatePayId: id, ...(userId ? { userId } : {}) };
    const existing = await Transaction.findOne(filter);
    if (!existing || !isAbacatePix(existing)) return null;

    // Se já foi completamente creditada (possui creditedAt), retorna
    if (existing.status === 'PAID' && existing.metadata?.creditedAt) {
        return { transaction: existing, credited: false };
    }

    // Se ainda não estava PAID, valida com a API da AbacatePay
    let providerStatus = typeof existing.metadata?.providerStatus === 'string'
        ? existing.metadata.providerStatus
        : undefined;
    if (existing.status !== 'PAID') {
        try {
            providerStatus = await checkAbacatePix(id);
            await Transaction.updateOne(filter, {
                $set: {
                    'metadata.lastProviderStatus': providerStatus,
                    'metadata.lastReconciliationAt': new Date(),
                },
                $inc: { 'metadata.reconciliationAttempts': 1 },
                $unset: { 'metadata.lastReconciliationError': 1 },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown provider lookup error';
            await Transaction.updateOne(filter, {
                $set: {
                    'metadata.lastReconciliationAt': new Date(),
                    'metadata.lastReconciliationError': message,
                },
                $inc: { 'metadata.reconciliationAttempts': 1 },
            });
            throw error;
        }
        if (providerStatus !== 'PAID') {
            if (providerStatus === 'EXPIRED' || providerStatus === 'CANCELLED') {
                await Transaction.updateOne({ ...filter, status: 'PENDING' }, {
                    $set: { status: 'CANCELLED', 'metadata.providerStatus': providerStatus },
                });
            }
            return { transaction: await Transaction.findOne(filter) || existing, credited: false };
        }
    }

    const creditResult = await executeRechargeCredit({
        paymentId: id,
        userId: existing.userId,
        provider: 'abacatepay',
        providerStatus: providerStatus || 'PAID',
    });

    if (!creditResult.success) {
        const message = creditResult.message || 'Failed to credit confirmed AbacatePay PIX';
        await Transaction.updateOne(filter, {
            $set: {
                'metadata.lastReconciliationAt': new Date(),
                'metadata.lastReconciliationError': message,
            },
        });
        console.error('[pix-settlement]', { paymentId: id, outcome: 'credit_failed', error: message });
        throw new Error(message);
    }

    return {
        transaction: creditResult.transaction || existing,
        credited: creditResult.creditedNow,
    };
}
