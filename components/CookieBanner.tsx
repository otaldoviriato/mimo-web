'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Verifica se o consentimento já foi dado anteriormente
        const consent = localStorage.getItem('mimo_cookies_accepted');
        if (!consent) {
            // Pequeno delay para a animação de entrada ficar mais natural
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('mimo_cookies_accepted', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-gray-950/95 backdrop-blur-md border border-gray-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <div className="bg-purple-950/50 border border-purple-800 text-purple-400 p-2 rounded-xl shrink-0 text-xl">
                        🍪
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-bold text-gray-100 tracking-tight">Valorizamos sua privacidade</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Nós utilizamos cookies essenciais para garantir o funcionamento do chat e processamento de pagamentos. Ao continuar, você concorda com nossos termos. Veja nossa{' '}
                            <Link 
                                href="/politica-de-privacidade" 
                                className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-purple-500/50"
                            >
                                Política de Privacidade
                            </Link>.
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={handleAccept}
                        className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] transition-all text-white text-xs font-bold shadow-md shadow-purple-900/20"
                    >
                        Aceitar Cookies
                    </button>
                </div>
            </div>
        </div>
    );
}
