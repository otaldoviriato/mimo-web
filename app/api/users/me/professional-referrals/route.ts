import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { FinancialLedgerEntry } from '@/models/FinancialLedgerEntry';
import { settleProfessionalReferralReward } from '@/lib/professionalReferralReward';
import { completedWithdrawalNetCents, professionalReferralStatus, PROFESSIONAL_REFERRAL_BONUS_CENTS, PROFESSIONAL_REFERRAL_THRESHOLD_CENTS } from '@/lib/professionalReferralRules';

export const dynamic = 'force-dynamic';

async function professional() {
    const { userId } = await auth();
    if (!userId) return null;
    await connectToDatabase();
    return User.findOne({ clerkId: userId, isProfessional: true, isTeam: { $ne: true }, isSuspended: { $ne: true } }).select('clerkId username professionalStatus').lean();
}

export async function GET() {
    const owner = await professional();
    if (!owner) return NextResponse.json({ error: 'Acesso exclusivo para profissionais.' }, { status: 403 });
    const candidates = await User.find({ referredByProfessionalId: owner.clerkId, applicantCompletedAt: { $exists: true } })
        .select('clerkId name username photoUrl professionalStatus professionalReferralRewardedAt isSuspended').sort({ createdAt: -1 }).lean();
    const [withdrawals, rewards] = await Promise.all([
        WithdrawRequest.find({ userId: { $in: candidates.map(user => user.clerkId) }, status: 'concluido' }).select('userId amount fee netAmount status').lean(),
        FinancialLedgerEntry.find({ ownerId: owner.clerkId, eventType: 'professional_referral_reward' }).select('amountCents').lean(),
    ]);
    const totals = new Map<string, number>();
    for (const withdrawal of withdrawals) totals.set(withdrawal.userId, (totals.get(withdrawal.userId) || 0) + completedWithdrawalNetCents(withdrawal));
    return NextResponse.json({
        sharePath: owner.professionalStatus === 'approved' ? `/participar?indicacao=${encodeURIComponent(owner.username)}` : null,
        bonusCents: PROFESSIONAL_REFERRAL_BONUS_CENTS, thresholdCents: PROFESSIONAL_REFERRAL_THRESHOLD_CENTS,
        totalRewardedCents: rewards.reduce((sum, reward) => sum + reward.amountCents, 0),
        referrals: candidates.map(candidate => ({
            id: candidate.clerkId, name: candidate.name || candidate.username, username: candidate.username,
            photoUrl: candidate.photoUrl || null,
            status: professionalReferralStatus(candidate, totals.get(candidate.clerkId) || 0),
            progressCents: Math.min(PROFESSIONAL_REFERRAL_THRESHOLD_CENTS, totals.get(candidate.clerkId) || 0),
        })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
}

// Recovery for missed provider callbacks or temporary transaction failures; never a GET side effect.
// No candidate IDs, amounts, or referral identities are accepted from the browser.
export async function POST() {
    const owner = await professional();
    if (!owner) return NextResponse.json({ error: 'Acesso exclusivo para profissionais.' }, { status: 403 });
    const candidates = await User.find({ referredByProfessionalId: owner.clerkId, professionalStatus: 'approved', applicantCompletedAt: { $exists: true }, professionalReferralRewardedAt: { $exists: false } }).select('clerkId').lean();
    let credited = 0;
    for (const candidate of candidates) if (await settleProfessionalReferralReward(candidate.clerkId)) credited++;
    return NextResponse.json({ credited });
}
