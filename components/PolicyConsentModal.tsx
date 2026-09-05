'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    ShieldCheck,
    Coins,
    SlidersHorizontal,
    Lock,
    Send,
    ChevronDown,
    Check,
    Loader2,
    FileText,
} from 'lucide-react';
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

    // Verifica se o conteúdo é rolável
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

    const renderIcon = (type?: string) => {
        switch (type) {
            case 'message':
                return <Send size={18} className="text-purple-600" />;
            case 'receipt':
                return <Coins size={18} className="text-purple-600" />;
            case 'sliders':
                return <SlidersHorizontal size={18} className="text-purple-600" />;
            case 'lock':
                return <Lock size={18} className="text-purple-600" />;
            case 'shield':
                return <ShieldCheck size={18} className="text-purple-600" />;
            default:
                return <FileText size={18} className="text-purple-600" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 sm:p-6 select-none">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="policy-modal-title"
                className="relative flex flex-col w-full max-w-lg max-h-[92dvh] sm:max-h-[85dvh] rounded-[28px] bg-white border border-purple-100 shadow-2xl overflow-hidden"
            >
                {/* Linha decorativa no topo */}
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-500 shrink-0" />

                {/* Cabeçalho fixo com logo e título */}
                <header className="p-5 pb-3 border-b border-purple-50 bg-white shrink-0">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-purple-50 text-purple-700 border border-purple-200/70">
                            {policy.badge}
                        </span>
                        <img
                            src="/Logo.svg"
                            alt="MimoChat"
                            className="h-6 w-auto object-contain"
                        />
                    </div>
                    <h1
                        id="policy-modal-title"
                        className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight"
                    >
                        {policy.title}
                    </h1>
                    {policy.subtitle && (
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                            {policy.subtitle}
                        </p>
                    )}
                </header>

                {/* Área de conteúdo rolável com scrollbar visível */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-5 py-4 space-y-3 overscroll-contain
                               [&::-webkit-scrollbar]:w-2.5
                               [&::-webkit-scrollbar-track]:bg-purple-50/50
                               [&::-webkit-scrollbar-track]:rounded-full
                               [&::-webkit-scrollbar-thumb]:bg-purple-300
                               [&::-webkit-scrollbar-thumb]:rounded-full
                               hover:[&::-webkit-scrollbar-thumb]:bg-purple-400"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#d8b4fe #faf5ff' }}
                >
                    {policy.sections.map((section, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/40 via-white to-slate-50/60 border border-purple-100/80 shadow-xs"
                        >
                            <div className="w-9 h-9 rounded-xl bg-white border border-purple-100 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                                {renderIcon(section.iconType)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h2 className="text-sm font-bold text-slate-900 truncate">
                                        {section.title}
                                    </h2>
                                    {section.tag && (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 tracking-wide shrink-0">
                                            {section.tag}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {section.description}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Disclaimer legal e links */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2 mt-4">
                        <p className="leading-relaxed">
                            {policy.disclaimer}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold text-purple-700 pt-1">
                            {policy.termsUrl && (
                                <Link
                                    href={policy.termsUrl}
                                    target="_blank"
                                    className="underline hover:text-purple-800 transition-colors"
                                >
                                    Termos de Uso
                                </Link>
                            )}
                            {policy.privacyUrl && (
                                <Link
                                    href={policy.privacyUrl}
                                    target="_blank"
                                    className="underline hover:text-purple-800 transition-colors"
                                >
                                    Política de Privacidade
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="h-1" />
                </div>

                {/* Rodapé FIXO com botão sempre visível */}
                <footer className="p-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 shrink-0 space-y-2">
                    {error && (
                        <p role="alert" className="text-xs font-semibold text-rose-600 text-center animate-in fade-in">
                            {error}
                        </p>
                    )}

                    {!hasScrolledToBottom && isScrollable ? (
                        <button
                            type="button"
                            onClick={scrollToBottom}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-sm transition-all active:scale-[0.99]"
                        >
                            <span>Role até o final para concordar</span>
                            <ChevronDown size={18} className="animate-bounce" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            autoFocus
                            disabled={busy}
                            onClick={handleAccept}
                            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
                        >
                            {busy ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Registrando aceite…</span>
                                </>
                            ) : (
                                <>
                                    <Check size={18} strokeWidth={2.5} />
                                    <span>{policy.buttonLabel || 'Li e concordo — continuar'}</span>
                                </>
                            )}
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
}

