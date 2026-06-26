'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePWA } from '@/context/PWAContext';

const SESSION_KEY = 'pwa_promo_seen';

const benefits = [
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        ),
        title: 'Notificações em tempo real',
        description: 'Seja avisado na hora exata que alguém te mandar uma mensagem.',
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
        ),
        title: 'Mais rápido e sempre disponível',
        description: 'Experiência fluida e nativa, sem depender do navegador.',
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
            </svg>
        ),
        title: 'Atalho na tela inicial',
        description: 'Acesse o Mimo com um toque, direto da sua tela inicial.',
    },
];

export function PWAPromoModal() {
    const { hasDeferredPrompt, isStandalone, promptInstall } = usePWA();
    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (!hasDeferredPrompt || isStandalone) return;
        if (typeof window === 'undefined') return;
        if (sessionStorage.getItem(SESSION_KEY)) return;

        const t = setTimeout(() => {
            setVisible(true);
            setTimeout(() => setAnimating(true), 10);
        }, 2000);

        return () => clearTimeout(t);
    }, [hasDeferredPrompt, isStandalone]);

    const dismiss = () => {
        setAnimating(false);
        sessionStorage.setItem(SESSION_KEY, '1');
        setTimeout(() => setVisible(false), 300);
    };

    const handleInstall = async () => {
        dismiss();
        await promptInstall();
    };

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-[180] flex items-center justify-center p-5 transition-opacity duration-300 ${
                animating ? 'opacity-100' : 'opacity-0'
            }`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm"
                onClick={dismiss}
            />

            {/* Card */}
            <div
                className={`relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 transform ${
                    animating ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
                }`}
            >
                {/* Fechar */}
                <button
                    onClick={dismiss}
                    className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-white/20 text-white/80 hover:bg-white/30 transition-colors"
                    aria-label="Fechar"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {/* Hero com gradiente */}
                <div className="relative flex flex-col items-center justify-center pt-10 pb-8 px-6 bg-gradient-to-br from-[#7A1FA2] via-[#6D28D9] to-[#4c1d95] overflow-hidden">
                    {/* Círculos decorativos */}
                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                    <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-white/5" />

                    {/* Logo */}
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 border border-white/20 shadow-xl mb-4 backdrop-blur-sm">
                        <img src="/Logo.svg" alt="Mimo" className="w-11 h-11 object-contain" />
                    </div>

                    <h2 className="text-2xl font-extrabold text-white tracking-tight text-center leading-tight">
                        Mimo fica melhor<br />no aplicativo
                    </h2>
                    <p className="mt-1.5 text-sm text-white/70 text-center">
                        Instale grátis e aproveite tudo
                    </p>
                </div>

                {/* Corpo */}
                <div className="px-6 pt-6 pb-7">
                    <div className="flex flex-col gap-4 mb-7">
                        {benefits.map((b, i) => (
                            <div key={i} className="flex items-start gap-3.5">
                                <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 mt-0.5">
                                    {b.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 leading-tight">{b.title}</p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">{b.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Ações */}
                    <button
                        onClick={handleInstall}
                        className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#7A1FA2] to-[#6D28D9] text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-700/30 transition-all active:scale-[0.98] hover:shadow-purple-700/40"
                    >
                        Instalar aplicativo
                    </button>

                    <button
                        onClick={dismiss}
                        className="w-full mt-3 h-9 rounded-xl text-gray-400 hover:text-gray-600 font-medium text-xs transition-colors"
                    >
                        Continuar no navegador
                    </button>
                </div>
            </div>
        </div>
    );
}
