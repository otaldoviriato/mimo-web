import mongoose from 'mongoose';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { FinancialLedgerEntry } from '@/models/FinancialLedgerEntry';
import { completedWithdrawalNetCents, PROFESSIONAL_REFERRAL_BONUS_CENTS, PROFESSIONAL_REFERRAL_THRESHOLD_CENTS } from '@/lib/professionalReferralRules';

// Call only after a trusted completion event, or an authenticated reconciliation.
// The attribution comes exclusively from the server-recorded enrollment, never from this caller.
export async function settleProfessionalReferralReward(candidateId: string): Promise<boolean> {
    const session = await mongoose.startSession();
    try {
        return await session.withTransaction(async () => {
            const candidate = await User.findOne({ clerkId: candidateId }).session(session);
            if (!candidate?.isProfessional || !candidate.applicantCompletedAt || candidate.professionalStatus !== 'approved' || candidate.isSuspended || candidate.professionalReferralRewardedAt || !candidate.referredByProfessionalId || candidate.referredByProfessionalId === candidateId) return false;
            const referrer = await User.findOne({ clerkId: candidate.referredByProfessionalId, isProfessional: true, isTeam: { $ne: true }, isSuspended: { $ne: true } }).session(session);
            if (!referrer) return false;
            const withdrawals = await WithdrawRequest.find({ userId: candidateId, status: 'concluido' }).select('amount fee netAmount status').session(session).lean();
            const total = withdrawals.reduce((sum, item) => sum + completedWithdrawalNetCents(item), 0);
            if (total < PROFESSIONAL_REFERRAL_THRESHOLD_CENTS) return false;
            const now = new Date();
            const claimed = await User.updateOne({ _id: candidate._id, professionalReferralRewardedAt: { $exists: false } }, { $set: { professionalReferralRewardedAt: now } }, { session });
            if (!claimed.modifiedCount) return false;

            // Initialize legacy wallets without losing their existing available balance.
            // Pipeline arithmetic preserves concurrent earnings; transaction retries resolve conflicts.
            const available = { $cond: [{ $ifNull: ['$marketplaceWalletMigratedAt', false] }, { $ifNull: ['$professionalAvailableCents', 0] }, { $ifNull: ['$balance', 0] }] };
            await User.updateOne({ _id: referrer._id }, [{ $set: {
                professionalAvailableCents: { $add: [available, PROFESSIONAL_REFERRAL_BONUS_CENTS] },
                balance: { $add: [available, PROFESSIONAL_REFERRAL_BONUS_CENTS] },
                marketplaceWalletMigratedAt: { $ifNull: ['$marketplaceWalletMigratedAt', now] },
            } }], { session, updatePipeline: true });
            await FinancialLedgerEntry.create([{
                idempotencyKey: `professional_referral:${candidateId}`,
                account: 'professional_available', ownerId: referrer.clerkId, direction: 'credit',
                amountCents: PROFESSIONAL_REFERRAL_BONUS_CENTS, product: 'professional_referral',
                eventType: 'professional_referral_reward', relatedUserId: candidateId,
                effectiveAt: now, billingEngineVersion: 'marketplace_v4',
                metadata: { qualifiedNetWithdrawnCents: total, thresholdCents: PROFESSIONAL_REFERRAL_THRESHOLD_CENTS, username: candidate.username },
            }], { session });
            return true;
        }) ?? false;
    } finally { await session.endSession(); }
}
