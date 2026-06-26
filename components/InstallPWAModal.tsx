'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type InstallModalType = 'ios' | 'unavailable';

interface InstallPWAModalProps {
    type: InstallModalType;
    onClose: () => void;
}

export function InstallPWAModal({ type, onClose }: InstallPWAModalProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setIsAnimating(true), 10);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(onClose, 300);
    };

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 pb-6 transition-opacity duration-300 ${
                isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
        >
            <div
                className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            <div
                className={`relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 transition-all duration-300 transform ${
                    isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-6'
                }`}
            >
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    aria-label="Fechar"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {type === 'ios' ? (
                    <IOSContent onClose={handleClose} />
                ) : (
                    <UnavailableContent onClose={handleClose} />
                )}
            </div>
        </div>
    );
}

/* ─── iOS ─────────────────────────────────────────────────────────────── */

function IOSContent({ onClose }: { onClose: () => void }) {
    const steps = [
        {
            icon: (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
            ),
            label: 'Toque em Compartilhar',
            detail: 'Na barra inferior do Safari, toque no ícone de compartilhar.',
        },
        {
            icon: (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2.5" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
            ),
            label: 'Adicionar à Tela de Início',
            detail: 'Role a lista de opções e toque em "Adicionar à Tela de Início".',
        },
        {
            icon: (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ),
            label: 'Confirme a instalação',
            detail: 'Toque em "Adicionar" no canto superior direito.',
        },
    ];

    return (
        <>
            {/* Ícone */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 relative">
                <div
                    className="absolute inset-0 rounded-2xl bg-purple-400/15 animate-ping"
                    style={{ animationDuration: '2.5s' }}
                />
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7A1FA2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2.8" />
                </svg>
            </div>

            <h3 className="mb-1 text-base font-bold text-gray-900 text-center tracking-tight">
                Instale o Mimo no iPhone
            </h3>
            <p className="mb-5 text-[11px] text-gray-400 text-center leading-relaxed">
                Abra esta página no{' '}
                <span className="font-semibold text-gray-500">Safari</span> e siga os passos abaixo.
            </p>

            {/* Passos */}
            <div className="flex flex-col gap-2 mb-6">
                {steps.map((step, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-gray-50 border border-gray-100"
                    >
                        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                            {step.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-800 leading-tight">{step.label}</p>
                            <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">{step.detail}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-purple-300 self-start mt-1">
                            {i + 1}
                        </span>
                    </div>
                ))}
            </div>

            <button
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-[#7A1FA2] hover:bg-purple-900 text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-sm shadow-purple-700/20"
            >
                Entendido!
            </button>
        </>
    );
}

/* ─── Unavailable ─────────────────────────────────────────────────────── */

function UnavailableContent({ onClose }: { onClose: () => void }) {
    return (
        <>
            {/* Ícone relógio */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 relative">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7A1FA2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            </div>

            <h3 className="mb-2 text-base font-bold text-gray-900 text-center tracking-tight">
                Instalação ainda não disponível
            </h3>

            <p className="mb-6 text-[11px] text-gray-500 text-center leading-relaxed px-1">
                Continue usando o Mimo por alguns instantes e tente novamente. Assim que o navegador
                liberar a instalação, o botão{' '}
                <span className="font-semibold text-gray-700">"Instalar aplicativo"</span> vai abrir a
                instalação do app.
            </p>

            <button
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-[#7A1FA2] hover:bg-purple-900 text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-sm shadow-purple-700/20"
            >
                OK, entendi
            </button>
        </>
    );
}
