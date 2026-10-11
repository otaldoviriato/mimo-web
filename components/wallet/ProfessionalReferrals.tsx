'use client';
import { useState } from 'react';
import { Copy, Share2, Gift, CheckCircle2 } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import type { ProfessionalReferralsData } from '@/hooks/useProfessionalReferrals';

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const labels = { review: 'Perfil em análise', qualifying: 'Aguardando qualificação', processing: 'Bônus em processamento', rewarded: 'Bônus liberado', unavailable: 'Perfil indisponível' };

export function ProfessionalReferrals({ data }: { data: ProfessionalReferralsData }) {
    const [feedback, setFeedback] = useState('');
    async function share(copy: boolean) {
        if (!data.sharePath) return;
        const url = new URL(data.sharePath, window.location.origin).href;
        try {
            if (!copy && navigator.share) await navigator.share({ title: 'Faça parte do Mimo', text: 'Venha fazer parte do Mimo pelo meu link de indicação!', url });
            else { await navigator.clipboard.writeText(url); setFeedback('Link copiado!'); }
        } catch (error) { if ((error as Error).name !== 'AbortError') setFeedback('Não foi possível compartilhar. Copie o link no campo abaixo.'); }
    }
    return <div className="space-y-4">
        <section className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5">
            <Gift className="mb-3 h-8 w-8 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-900">Indique profissionais.<br />Ganhe {money(data.bonusCents)} por indicação.</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Você ganha quando a profissional indicada acumula {money(data.thresholdCents)} líquidos em saques concluídos. Pode ser em vários saques: R$ 10 + R$ 20 + R$ 20 também vale.</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Um bônus por profissional indicada, creditado automaticamente no seu saldo disponível. Saques pendentes, cancelados ou recusados não contam.</p>
            {data.sharePath ? <>
                <label className="mt-5 block text-xs font-semibold text-slate-600" htmlFor="professional-referral-link">Seu link de indicação</label>
                <input id="professional-referral-link" readOnly value={typeof window === 'undefined' ? data.sharePath : new URL(data.sharePath, window.location.origin).href} onFocus={event => event.target.select()} className="mt-2 w-full min-w-0 rounded-xl border border-purple-200 bg-white p-3 text-xs text-slate-700" />
                <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => void share(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700"><Copy size={16} />Copiar link</button>
                    <button onClick={() => void share(false)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50"><Share2 size={16} />Compartilhar</button>
                </div>
                <p role="status" className="mt-2 text-xs text-purple-700">{feedback}</p>
            </> : <p className="mt-4 rounded-xl bg-white p-3 text-sm text-purple-800">Seu link ficará disponível após a aprovação do seu perfil.</p>}
        </section>
        <section className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <span className="text-sm font-semibold text-emerald-900">Bônus recebidos</span><strong className="text-lg text-emerald-800">{money(data.totalRewardedCents)}</strong>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-4 text-sm font-bold text-slate-800">Suas indicações ({data.referrals.length})</h2>
            {!data.referrals.length && <p className="py-6 text-center text-sm leading-relaxed text-slate-500">Suas indicações aparecerão aqui quando concluírem o cadastro inicial pelo seu link.</p>}
            <ul className="space-y-3">{data.referrals.map(referral => <li key={referral.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center gap-3"><Avatar uri={referral.photoUrl || undefined} size={40} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{referral.name}</p><p className="truncate text-xs text-slate-500">@{referral.username}</p></div>{referral.status === 'rewarded' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}</div>
                <p className={`mt-3 text-xs font-semibold ${referral.status === 'rewarded' ? 'text-emerald-700' : 'text-purple-700'}`}>{labels[referral.status]}</p>
                {referral.status === 'qualifying' && <div className="mt-2"><progress aria-label={`Qualificação de ${referral.name}`} value={referral.progressCents} max={data.thresholdCents} className="h-2 w-full accent-purple-600" /><p className="mt-1 text-xs text-slate-500">{money(referral.progressCents)} de {money(data.thresholdCents)} em saques líquidos concluídos</p></div>}
                {referral.status === 'rewarded' && <p className="mt-1 text-xs text-emerald-700">{money(data.bonusCents)} creditados na sua carteira</p>}
            </li>)}</ul>
        </section>
    </div>;
}
