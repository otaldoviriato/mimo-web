'use client';

import { useEffect, useState } from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

function LoadingCard() {
    const [progress, setProgress] = useState(0);
    const [messageIndex, setMessageIndex] = useState(0);

    const messages = [
        'Conectando com o Google...',
        'Autenticando suas credenciais...',
        'Preparando seu perfil no MimoChat...',
        'Sincronizando banco de dados...',
        'Quase pronto! Entrando na sua conta...'
    ];

    // Simula o progresso da barra (não linear para parecer mais natural e fluido)
    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) {
                    clearInterval(timer);
                    return 95;
                }
                const diff = (95 - prev) * 0.08;
                return prev + Math.max(diff, 0.4);
            });
        }, 80);
        return () => clearInterval(timer);
    }, []);

    // Rotaciona as mensagens de status
    useEffect(() => {
        const messageTimer = setInterval(() => {
            setMessageIndex((prev) => (prev < messages.length - 1 ? prev + 1 : prev));
        }, 1200); // Troca a cada 1.2 segundos
        return () => clearInterval(messageTimer);
    }, [messages.length]);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col items-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Entrando no MimoChat</h2>
            
            {/* Status Message Animado */}
            <div className="h-6 flex items-center justify-center mb-6">
                <p className="text-sm text-purple-600 font-semibold animate-pulse">
                    {messages[messageIndex]}
                </p>
            </div>

            {/* Barra de Progresso Progressiva */}
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-4 relative">
                <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-150 ease-out shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex justify-between w-full text-[11px] text-gray-400 font-medium px-1">
                <span>Carregando...</span>
                <span>{Math.round(progress)}%</span>
            </div>

            <p className="text-[11px] text-gray-400 mt-6 text-center leading-normal">
                Isso leva apenas alguns segundos na primeira conexão enquanto configuramos seu ambiente seguro.
            </p>
        </div>
    );
}

export default function SSOCallbackPage() {
    const [redirectUrl, setRedirectUrl] = useState('/chats');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // O redirectUrlComplete do Google OAuth já deve trazer a URL correta.
            // Este localStorage serve como fallback de segurança.
            const pendingRedirect = localStorage.getItem('mimo_redirect_after_login');
            if (pendingRedirect) {
                setRedirectUrl(pendingRedirect);
            }
            setIsReady(true);
        }
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm text-center">
                {/* Logo / App Icon com brilho sutil */}
                <div className="relative mb-8 flex justify-center">
                    <div className="absolute inset-0 bg-purple-500 rounded-3xl blur-xl opacity-30 animate-pulse" />
                    <img
                        src="/icon-192x192.png"
                        alt="MimoChat"
                        className="relative w-20 h-20 rounded-3xl shadow-lg object-cover border border-white"
                    />
                </div>

                {/* Card de Carregamento Isolado - Seus re-renders rápidos não afetam o componente do Clerk */}
                <LoadingCard />

                <div className="mt-8 text-center text-[10px] text-gray-400">
                    <p>© {new Date().getFullYear()} MimoChat. Todos os direitos reservados.</p>
                </div>
            </div>

            {/* Componente que processa a autenticação do Clerk por baixo dos panos */}
            {isReady && (
                <AuthenticateWithRedirectCallback signUpForceRedirectUrl={redirectUrl} signInForceRedirectUrl={redirectUrl} />
            )}
        </div>
    );
}
