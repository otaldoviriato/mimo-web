'use client';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useProfessionalReferrals } from '@/hooks/useProfessionalReferrals';
import { ProfessionalReferrals } from '@/components/wallet/ProfessionalReferrals';

export default function ReferralsPage() {
    const router = useTransitionRouter();
    const { data, isLoading, isError, reconciliationFailed, reconcile } = useProfessionalReferrals();
    return <main className="h-full overflow-y-auto bg-slate-50 pb-28 md:pb-6"><div className="mx-auto max-w-3xl space-y-4 p-4">
        <header className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-white p-4">
            <button onClick={() => router.push('/wallet')} aria-label="Voltar para a carteira" className="rounded-xl border border-slate-200 p-2 text-slate-600"><ArrowLeft size={20} /></button>
            <h1 className="flex-1 text-base font-bold text-slate-800">Indicações</h1>
            <button onClick={reconcile} aria-label="Atualizar indicações" className="rounded-xl p-2 text-purple-600"><RefreshCw size={18} /></button>
        </header>
        {isLoading && <p role="status" className="p-8 text-center text-sm text-slate-500">Carregando suas indicações...</p>}
        {(isError || reconciliationFailed) && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Não foi possível atualizar todas as informações. <button onClick={reconcile} className="font-bold underline">Tentar novamente</button></p>}
        {data && <ProfessionalReferrals data={data} />}
    </div></main>;
}
