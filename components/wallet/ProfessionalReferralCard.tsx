'use client';
import { Gift, ChevronRight } from 'lucide-react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useProfessionalReferrals } from '@/hooks/useProfessionalReferrals';

export function ProfessionalReferralCard() {
    const router = useTransitionRouter();
    // Reconcile on entering the wallet, even if the referral details aren't opened.
    useProfessionalReferrals();
    return <button type="button" onClick={() => router.push('/wallet/referrals')} className="flex w-full items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-left text-purple-950 transition-colors hover:bg-purple-100 focus-visible:ring-2 focus-visible:ring-purple-500">
        <Gift className="h-8 w-8 shrink-0 text-purple-600" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Indique profissionais e ganhe R$ 50</span><span className="mt-1 block text-xs leading-relaxed text-purple-700">Compartilhe seu link e acompanhe suas indicações.</span></span>
        <ChevronRight className="h-5 w-5 shrink-0" />
    </button>;
}
