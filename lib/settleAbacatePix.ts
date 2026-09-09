import mongoose from 'mongoose';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { checkAbacatePix, isAbacatePix } from '@/lib/abacatePix';
import { recordAcquisitionEvent } from '@/lib/acquisitionAnalytics';
import { CampaignVisit } from '@/models/CampaignVisit';

/** Caller connects to the database first. Both webhook and polling use this path. */
export async function settleAbacatePix(id: string, userId?: string) {
    const filter = { abacatePayId: id, ...(userId ? { userId } : {}) };
    const existing = await Transaction.findOne(filter);
    if (!existing || !isAbacatePix(existing)) return null;
    if (existing.status === 'PAID') return { transaction: existing, credited: false };

    // Never trust a webhook's claimed status, amount, or user. Confirm with our API key.
    const providerStatus = await checkAbacatePix(id);
    if (providerStatus !== 'PAID') {
        if (providerStatus === 'EXPIRED' || providerStatus === 'CANCELLED') {
            await Transaction.updateOne({ ...filter, status: 'PENDING' }, {
                $set: { status: 'CANCELLED', 'metadata.providerStatus': providerStatus },
            });
        }
        return { transaction: await Transaction.findOne(filter) || existing, credited: false };
    }

    const result = await mongoose.connection.transaction(async (session) => {
        const transaction = await Transaction.findOneAndUpdate(
            { ...filter, type: 'PIX', source: 'recharge', status: { $in: ['PENDING', 'CANCELLED'] } },
            { $set: {
                status: 'PAID', 'metadata.provider': 'abacatepay',
                'metadata.providerStatus': providerStatus, 'metadata.creditedAt': new Date(),
            } },
            { new: true, session },
        );
        if (!transaction) return null;
        const amountCents = Math.round(transaction.amount * 100);
        if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Invalid Pix amount');
        const user = await User.findOneAndUpdate(
            { clerkId: transaction.userId },
            [{ $set: {
                balance: { $add: [{ $ifNull: ['$balance', 0] }, amountCents] },
                customerCashAvailableCents: { $cond: [
                    { $ne: [{ $ifNull: ['$marketplaceWalletMigratedAt', null] }, null] },
                    { $add: [{ $ifNull: ['$customerCashAvailableCents', 0] }, amountCents] },
                    '$customerCashAvailableCents',
                ] },
            } }],
            { new: true, session, updatePipeline: true },
        );
        // Throwing rolls back PAID as well; the next webhook/poll can safely retry.
        if (!user) throw new Error('Pix transaction user not found');
        return { transaction, user, amountCents };
    });
    if (!result) return { transaction: await Transaction.findOne(filter) || existing, credited: false };

    // Analytics failures must not undo or misreport an already committed credit.
    try {
        await recordAcquisitionEvent({
            eventType: 'first_recharge', dedupeKey: `first_recharge:${result.transaction.userId}`,
            actorId: result.transaction.userId, clientId: result.transaction.userId,
            professionalId: result.user.acquiredByProfessionalId,
            origin: result.user.acquisitionSource || 'unknown', amountCents: result.amountCents,
            occurredAt: result.transaction.timestamp || new Date(),
            metadata: { provider: 'abacatepay', transactionId: result.transaction._id.toString() },
        });
        await CampaignVisit.findOneAndUpdate(
            { userId: result.transaction.userId, firstRechargeAt: null },
            { $set: { firstRechargeAt: result.transaction.timestamp || new Date(), firstRechargeAmountCents: result.amountCents } },
            { sort: { signupCompletedAt: -1, createdAt: -1 } },
        );
    } catch { console.error('[PIX] Post-credit analytics failed', { paymentId: id }); }

    // Tenta liquidar automaticamente assinaturas pendentes (PAST_DUE) por falta de saldo
    try {
        const { settlePendingSubscriptionsForUser } = await import('@/lib/subscriptionBilling');
        await settlePendingSubscriptionsForUser(result.transaction.userId);
    } catch (settleErr) {
        console.error('[PIX] Failed to settle pending subscriptions after recharge:', settleErr);
    }

    console.info('[PIX] Credit committed', { paymentId: id, amountCents: result.amountCents });
    return { transaction: result.transaction, credited: true };
}
