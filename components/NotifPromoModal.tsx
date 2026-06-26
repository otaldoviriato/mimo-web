'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePWA } from '@/context/PWAContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { SESSION_KEYS, NEW_SESSION_EVENT } from '@/services/socket';

const COOLDOWN_MS = 10 * 60 * 1000;
const SHOWN_KEY   = 'notif_promo_shown';

const benefits = [
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        ),
        title: 'Saiba na hora certa',
        description: 'Receba um aviso imediato sempre que alguém te enviar uma mensagem.',
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
        ),
        title: 'Nunca perca uma oportunidade',
        description: 'Responda mais rápido e mantenha seus fãs engajados.',
    },
    {
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        ),
        title: 'Você controla tudo',
        description: 'Pode desativar quando quiser nas configurações do celular.',
    },
];

export function NotifPromoModal() {
    const { isStandalone } = usePWA();
    const { permission, handleRequestPermission } = usePushNotifications();
    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const tryShow = (intentional: boolean) => {
            // Só exibe dentro do PWA instalado (standalone) E sem permissão concedida
            if (!isStandalone || permission === 'granted') return;
            const lastShown = Number(localStorage.getItem(SHOWN_KEY) ?? '0');
            if (!intentional && Date.now() - lastShown < COOLDOWN_MS) return;
            localStorage.setItem(SHOWN_KEY, String(Date.now()));
            setTimeout(() => {
                setVisible(true);
                setTimeout(() => setAnimating(true), 10);
            }, 2000);
        };

        const pending = localStorage.getItem(SESSION_KEYS.newSession);
        if (pending) {
            tryShow(pending === 'intentional');
        }

        const onNewSession = (e: Event) => {
            const intentional = (e as CustomEvent<{ intentional: boolean }>).detail?.intentional ?? false;
            tryShow(intentional);
        };

        window.addEventListener(NEW_SESSION_EVENT, onNewSession);
        return () => window.removeEventListener(NEW_SESSION_EVENT, onNewSession);
    }, [isStandalone, permission]);

    const dismiss = () => {
        setAnimating(false);
        setTimeout(() => setVisible(false), 300);
    };

    const handleEnable = async () => {
        dismiss();
        await handleRequestPermission();
    };

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-180 flex items-center justify-center p-5 transition-opacity duration-300 ${
                animating ? 'opacity-100' : 'opacity-0'
            }`}
        >
            <div
                className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm"
                onClick={dismiss}
            />

            <div
                className={`relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 transform ${
                    animating ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
                }`}
            >
                <button
                    onClick={dismiss}
                    className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-white/20 text-white/80 hover:bg-white/30 transition-colors"
                    aria-label="Fechar"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {/* Hero */}
                <div className="relative flex flex-col items-center justify-center pt-10 pb-8 px-6 bg-linear-to-br from-[#7A1FA2] via-[#6D28D9] to-[#4c1d95] overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                    <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-white/5" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 border border-white/20 shadow-xl mb-4 backdrop-blur-sm">
                        <div className="absolute inset-0 rounded-3xl bg-white/10 animate-ping" style={{ animationDuration: '2.5s' }} />
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight text-center leading-tight">
                        Não perca nenhuma<br />mensagem
                    </h2>
                    <p className="mt-1.5 text-sm text-white/70 text-center">
                        Ative as notificações e fique sempre por dentro
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
                    <button
                        onClick={handleEnable}
                        className="w-full h-12 rounded-2xl bg-linear-to-r from-[#7A1FA2] to-[#6D28D9] text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-700/30 transition-all active:scale-[0.98]"
                    >
                        Ativar notificações
                    </button>
                    <button
                        onClick={dismiss}
                        className="w-full mt-3 h-9 rounded-xl text-gray-400 hover:text-gray-600 font-medium text-xs transition-colors"
                    >
                        Agora não
                    </button>
                </div>
            </div>
        </div>
    );
}
