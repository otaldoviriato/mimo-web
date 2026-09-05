'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Loader2 } from 'lucide-react';
import { CURRENT_POLICY, type PolicyDefinition } from '@/lib/policies';

interface PolicyConsentModalProps {
    policy?: PolicyDefinition;
    onAccepted: () => Promise<unknown>;
    apiEndpoint?: string;
}

export function PolicyConsentModal({
    policy = CURRENT_POLICY,
    onAccepted,
    apiEndpoint = '/api/users/me/receipt-consent',
}: PolicyConsentModalProps) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [isScrollable, setIsScrollable] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const checkScrollState = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const needsScroll = el.scrollHeight > el.clientHeight + 16;
        setIsScrollable(needsScroll);
        if (!needsScroll) {
            setHasScrolledToBottom(true);
        } else if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
            setHasScrolledToBottom(true);
        }
    };

    useEffect(() => {
        checkScrollState();
        window.addEventListener('resize', checkScrollState);
        return () => window.removeEventListener('resize', checkScrollState);
    }, [policy]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollTop + clientHeight >= scrollHeight - 24) {
            setHasScrolledToBottom(true);
        }
    };

    const scrollToBottom = () => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    };

    async function handleAccept() {
        if (!hasScrolledToBottom || busy) return;
        setBusy(true);
        setError('');
        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accepted: true, version: policy.version }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.error || 'Não foi possível registrar o aceite. Tente novamente.');
            }
            await onAccepted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Tente novamente.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 select-none">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="policy-modal-title"
                className="relative flex flex-col w-full max-w-lg max-h-[92dvh] sm:max-h-[85dvh] rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800"
            >
                {/* Cabeçalho formal sem degradês nem cápsulas */}
                <header className="p-5 pb-4 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <img
                            src="/Logo.svg"
                            alt="MimoChat"
                            className="h-6 w-auto object-contain"
                        />
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                            {policy.effectiveDate}
                        </span>
                    </div>
                    <h1
                        id="policy-modal-title"
                        className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
                    >
                        {policy.title}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                        {policy.documentType}
                    </p>
                </header>

                {/* Área de documento formal com scrollbar evidente */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain text-sm leading-relaxed text-slate-700
                               [&::-webkit-scrollbar]:w-2
                               [&::-webkit-scrollbar-track]:bg-slate-100
                               [&::-webkit-scrollbar-thumb]:bg-slate-300
                               [&::-webkit-scrollbar-thumb]:rounded-full
                               hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}
                >
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                        <strong>Aviso aos Usuários:</strong> Para dar continuidade ao uso dos serviços da plataforma, é obrigatória a leitura integral e aceitação das cláusulas contratuais abaixo dispostas.
                    </div>

                    {policy.clauses.map((clause, idx) => (
                        <div key={idx} className="space-y-1.5 pt-1">
                            <h2 className="text-sm font-bold text-slate-900 flex items-baseline gap-1.5">
                                {clause.number && (
                                    <span className="text-slate-500 font-mono text-xs">
                                        {clause.number}.
                                    </span>
                                )}
                                <span>{clause.title}</span>
                            </h2>
                            {clause.paragraphs.map((p, pIdx) => (
                                <p key={pIdx} className="text-xs sm:text-sm text-slate-700 text-justify leading-relaxed">
                                    {p}
                                </p>
                            ))}
                        </div>
                    ))}

                    {/* Links institucionais */}
                    <div className="pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1.5">
                        <p>
                            Consulte a íntegra dos documentos nos canais oficiais:
                        </p>
                        <div className="flex flex-wrap gap-4 font-medium text-purple-700">
                            <Link
                                href={policy.termsUrl}
                                target="_blank"
                                className="underline hover:text-purple-900 transition-colors"
                            >
                                Termos de Uso completos
                            </Link>
                            <Link
                                href={policy.privacyUrl}
                                target="_blank"
                                className="underline hover:text-purple-900 transition-colors"
                            >
                                Política de Privacidade
                            </Link>
                        </div>
                    </div>

                    <div className="h-1" />
                </div>

                {/* Rodapé FIXO com botão sempre visível */}
                <footer className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-2">
                    {error && (
                        <p role="alert" className="text-xs font-semibold text-rose-600 text-center">
                            {error}
                        </p>
                    )}

                    {!hasScrolledToBottom && isScrollable ? (
                        <button
                            type="button"
                            onClick={scrollToBottom}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold border border-slate-300 transition-colors"
                        >
                            <span>Role até o final para habilitar o aceite</span>
                            <ChevronDown size={16} className="animate-bounce" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            autoFocus
                            disabled={busy}
                            onClick={handleAccept}
                            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {busy ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Registrando confirmação…</span>
                                </>
                            ) : (
                                <span>{policy.buttonLabel || 'Concordo com os termos atualizados'}</span>
                            )}
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
}

