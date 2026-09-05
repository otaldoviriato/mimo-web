'use client';
import { useState } from 'react';

export function ClientNameModal({ onSaved, onCancel }: { onSaved: () => Promise<void>; onCancel: () => void }) {
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    return <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-5">
        <form role="dialog" aria-modal="true" aria-labelledby="client-name-title" className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-4 text-slate-900" onSubmit={async e => {
            e.preventDefault(); if (!name.trim() || busy) return;
            setBusy(true); setError('');
            try {
                const res = await fetch('/api/users/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
                if (!res.ok) throw new Error('Não foi possível salvar seu nome. Tente novamente.');
                await onSaved();
            } catch (err) { setError(err instanceof Error ? err.message : 'Tente novamente.'); }
            finally { setBusy(false); }
        }}>
            <h2 id="client-name-title" className="text-xl font-bold">Como gostaria de ser chamado?</h2>
            <label className="block text-sm">Seu nome<input autoFocus required maxLength={80} value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" className="mt-2 w-full border border-slate-300 rounded-xl p-3" /></label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={busy || !name.trim()} className="w-full rounded-xl bg-purple-700 p-3 text-white font-semibold disabled:opacity-50">{busy ? 'Salvando…' : 'Continuar e enviar'}</button>
            <button type="button" disabled={busy} onClick={onCancel} className="w-full text-sm text-slate-500">Agora não</button>
        </form>
    </div>;
}
