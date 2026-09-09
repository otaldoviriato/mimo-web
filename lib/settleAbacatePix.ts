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
    let providerStatus = existing.metadata?.providerStatus;
    if (existing.status !== 'PAID') {
        providerStatus = await checkAbacatePix(id);
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
        return { transaction: await Transaction.findOne(filter) || existing, credited: false };
    }

    return {
        transaction: creditResult.transaction || existing,
        credited: creditResult.creditedNow,
    };
}
