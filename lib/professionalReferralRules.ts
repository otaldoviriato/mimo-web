export const PROFESSIONAL_REFERRAL_THRESHOLD_CENTS = 5000;
export const PROFESSIONAL_REFERRAL_BONUS_CENTS = 5000;

export function completedWithdrawalNetCents(withdrawal: { status: string; amount: number; fee?: number; netAmount?: number | null }) {
    if (withdrawal.status !== 'concluido') return 0;
    const amount = withdrawal.netAmount ?? (withdrawal.amount - (withdrawal.fee ?? 0));
    return Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
}

export function professionalReferralStatus(user: { professionalStatus?: string | null; professionalReferralRewardedAt?: unknown; isSuspended?: boolean }, total: number) {
    if (user.professionalReferralRewardedAt) return 'rewarded';
    if (user.isSuspended || user.professionalStatus === 'rejected') return 'unavailable';
    if (user.professionalStatus !== 'approved') return 'review';
    return total >= PROFESSIONAL_REFERRAL_THRESHOLD_CENTS ? 'processing' : 'qualifying';
}
