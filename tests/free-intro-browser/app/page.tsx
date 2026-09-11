'use client';

import { useState } from 'react';
import { ExploreProfessionalCard } from '../../../components/ExploreProfessionalCard';
import { FreeIntroNotice } from '../../../components/FreeIntroNotice';
import { FreeIntroConversationsControl } from '../../../components/FreeIntroConversationsControl';
import type { FreeIntroState } from '../../../hooks/useFreeIntro';

export default function Page() {
    const [division, setDivision] = useState<'clients' | 'free'>('clients');
    const [enabled, setEnabled] = useState(false);
    const [remaining, setRemaining] = useState(3);
    const [converted, setConverted] = useState(false);
    const [balance, setBalance] = useState(0);
    const [draft, setDraft] = useState('');
    const [sent, setSent] = useState<string[]>([]);
    const state: FreeIntroState = { limit: 3, timeoutMinutes: 10, enabled, remaining, grant: { professionalId: 'pro', limit: 3, used: 3 - remaining, convertedAt: converted ? '2026-09-11' : null } };
    const photo = '/api/photo';
    return <main className="mx-auto max-w-3xl space-y-5 bg-slate-50 p-3 pb-10">
        <h1 className="text-xl font-black text-slate-900">Conheça grátis · validação visual</h1>
        <section className="grid grid-cols-2 gap-3" aria-label="Explorar">
            <ExploreProfessionalCard professionalId="pro" name="Isabella, 25" photoUrl={photo} online freeIntroEnabled onClick={() => setDivision('free')} />
            <ExploreProfessionalCard professionalId="other" name="Nome longo de profissional, 28" photoUrl={photo} online={false} freeIntroEnabled onClick={() => setDivision('free')} />
            <ExploreProfessionalCard professionalId="paid" name="Laura, 26" photoUrl={photo} online freeIntroEnabled={false} onClick={() => setDivision('clients')} />
            <ExploreProfessionalCard professionalId="offline" name="Juliana, 29" photoUrl={photo} online={false} freeIntroEnabled={false} onClick={() => setDivision('clients')} />
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Conversas da profissional">
            <h2 className="px-4 pt-4 text-lg font-bold">Conversas</h2>
            <FreeIntroConversationsControl division={division} onDivisionChange={setDivision} clientsUnread={converted ? 5 : 2} freeUnread={converted ? 0 : 3} state={state} saving={false} connected onToggle={() => setEnabled(!enabled)} />
            <p className="p-4 text-sm" data-testid="category">{converted ? 'Cliente convertido' : 'Conversa grátis'} · mesma conversa</p>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Chat aberto">
            <h2 className="p-4 font-bold">Isabella</h2>
            <FreeIntroNotice state={state} />
            <div className="space-y-2 p-4 text-sm" aria-live="polite">
                {Array.from({ length: 3 - remaining }, (_, i) => <p key={i} className="w-fit rounded-xl bg-purple-50 p-3">Resposta gratuita {i + 1}</p>)}
                {remaining === 0 && <p className="w-fit rounded-xl bg-purple-50 p-3">{converted ? 'Quarta resposta, liberada pelo servidor' : 'Mensagem bloqueada · recarregue para visualizar'}</p>}
                {sent.map((text, i) => <p key={i} className="ml-auto w-fit rounded-xl bg-purple-600 p-3 text-white">{text}</p>)}
            </div>
            <form className="flex gap-2 border-t p-3" onSubmit={event => { event.preventDefault(); if (draft.trim()) { setSent([...sent, draft]); setDraft(''); } }}>
                <input aria-label="Mensagem" className="min-w-0 flex-1 rounded-xl border border-slate-200 p-2" value={draft} onChange={event => setDraft(event.target.value)} />
                <button className="rounded-xl bg-purple-600 px-3 text-sm font-bold text-white">Enviar</button>
            </form>
        </section>
        <div className="flex flex-wrap gap-2 text-xs">
            <button className="rounded-lg border bg-white p-3" disabled={remaining === 0} onClick={() => setRemaining(Math.max(0, remaining - 1))}>Simular resposta gratuita</button>
            <button className="rounded-lg border bg-white p-3" onClick={() => setBalance(100)}>Simular recarga</button>
            <button className="rounded-lg border bg-white p-3" disabled={remaining > 0 || balance === 0 || converted} onClick={() => { setConverted(true); setBalance(80); }}>Confirmar leitura paga</button>
            <span className="p-3">Saldo: {balance}</span>
        </div>
    </main>;
}
