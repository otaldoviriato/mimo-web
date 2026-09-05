'use client';

import { useState } from 'react';
import { RECEIPT_TERMS_VERSION } from '@/lib/receiptBilling';

export function ReceiptConsentModal({ onAccepted }: { onAccepted: () => Promise<unknown> }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function accept() {
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/users/me/receipt-consent', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accepted: true, version: RECEIPT_TERMS_VERSION }),
            });
            if (!response.ok) throw new Error('Não foi possível registrar o aceite. Tente novamente.');
            await onAccepted();
        } catch (err) { setError(err instanceof Error ? err.message : 'Tente novamente.'); }
        finally { setBusy(false); }
    }
    return <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 p-5">
        <section role="dialog" aria-modal="true" aria-labelledby="receipt-consent-title" className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl space-y-4 text-slate-800">
            <h1 id="receipt-consent-title" className="text-2xl font-bold">O jeito de conversar no Mimo mudou</h1>
            <p>Agora, enviar mensagens de texto e áudio é grátis para você.</p>
            <p>Textos e áudios enviados pela profissional são cobrados automaticamente do seu saldo no momento do recebimento, mesmo que você esteja fora do app ou não abra a conversa.</p>
            <p>O texto tem um limite de caracteres cobrados por mensagem; o excedente é grátis. O áudio usa a conversão de segundos para caracteres e o mesmo limite. Os preços e limites vigentes ficam disponíveis na informação de preços do chat.</p>
            <p>Sem saldo suficiente, o conteúdo fica bloqueado e pendente. Ao recarregar, mensagens pendentes são liberadas automaticamente conforme o saldo, da mais antiga para a mais recente, com uma única cobrança por mensagem.</p>
            <p>Enviar fotos e vídeos continua grátis para você. Conteúdos pagos oferecidos pela profissional mantêm os preços e o desbloqueio atuais. Seu histórico anterior não será cobrado novamente.</p>
            <p className="text-sm">Para continuar, é necessário aceitar este modelo de cobrança e os <a className="text-purple-700 underline" href="/termos-de-uso" target="_blank" rel="noreferrer">Termos de Uso</a> e a <a className="text-purple-700 underline" href="/politica-de-privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a> atualizados.</p>
            {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
            <button autoFocus disabled={busy} onClick={accept} className="w-full rounded-xl bg-purple-700 text-white p-3 font-semibold disabled:opacity-50">{busy ? 'Registrando aceite…' : 'Li e concordo — continuar'}</button>
        </section>
    </div>;
}
