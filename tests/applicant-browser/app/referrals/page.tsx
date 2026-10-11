'use client';
import { ProfessionalReferrals } from '@/components/wallet/ProfessionalReferrals';
export default function Page() {
    return <main className="mx-auto h-screen max-w-3xl overflow-y-auto p-4"><ProfessionalReferrals data={{
        sharePath: '/participar?indicacao=ana', bonusCents: 5000, thresholdCents: 5000, totalRewardedCents: 5000,
        referrals: [
            { id: '1', name: 'Maria Oliveira', username: 'maria', photoUrl: null, status: 'review', progressCents: 0 },
            { id: '2', name: 'Juliana Silva', username: 'juliana', photoUrl: null, status: 'qualifying', progressCents: 3000 },
            { id: '3', name: 'Carolina Souza', username: 'carolina', photoUrl: null, status: 'rewarded', progressCents: 5000 },
        ],
    }} /></main>;
}
