'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePWA } from '@/context/PWAContext';

const INACTIVITY_THRESHOLD = 12 * 60 * 60 * 1000; // 12 horas
const COOLDOWN_THRESHOLD = 24 * 60 * 60 * 1000; // 24 horas (não incomodar se fechar)

export function NotificationPromptModal() {
    const { isStandalone } = usePWA();
    const { permission, handleRequestPermission } = usePushNotifications();
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Notificações só fazem sentido dentro do PWA instalado
        if (!isStandalone) return;

        // Se já foi concedida a permissão, não precisamos fazer nada
        if (permission === 'granted') return;

        const checkInactivityAndPrompt = () => {
            const now = Date.now();
            const lastAccess = localStorage.getItem('mimo_last_access_time');
            const lastPrompt = localStorage.getItem('mimo_last_notification_prompt_shown');

            let shouldShow = false;

            if (!lastAccess) {
                // Se não houver registro de acesso anterior, consideramos como elegível,
                // mas respeitando o cooldown se o modal já tiver sido mostrado.
                shouldShow = !lastPrompt || (now - Number(lastPrompt) > COOLDOWN_THRESHOLD);
            } else {
                const timeSinceLastAccess = now - Number(lastAccess);
                const timeSinceLastPrompt = lastPrompt ? now - Number(lastPrompt) : Infinity;

                // Se o tempo desde o último acesso for maior que o limite de inatividade
                // E o tempo desde a última exibição do modal for maior que o cooldown
                if (timeSinceLastAccess > INACTIVITY_THRESHOLD && timeSinceLastPrompt > COOLDOWN_THRESHOLD) {
                    shouldShow = true;
                }
            }

            // Atualiza o tempo de acesso
            localStorage.setItem('mimo_last_access_time', String(now));

            if (shouldShow) {
                // Aguarda um pequeno delay para que a interface inicial carregue suavemente
                const timer = setTimeout(() => {
                    setIsVisible(true);
                    setTimeout(() => setIsAnimating(true), 50);
                }, 1500);
                return timer;
            }
        };

        // Executa a verificação na inicialização (mount)
        const initTimer = checkInactivityAndPrompt();

        // Monitora quando a aba/aplicativo volta para o primeiro plano (foreground)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkInactivityAndPrompt();
            } else {
                // Quando o app vai para segundo plano, registramos como o último acesso ativo
                localStorage.setItem('mimo_last_access_time', String(Date.now()));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (initTimer) clearTimeout(initTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [permission, isStandalone]);

    const handleClose = () => {
        setIsAnimating(false);
        localStorage.setItem('mimo_last_notification_prompt_shown', String(Date.now()));
        setTimeout(() => {
            setIsVisible(false);
        }, 300);
    };

    const handleEnable = async () => {
        localStorage.setItem('mimo_last_notification_prompt_shown', String(Date.now()));
        setIsAnimating(false);
        setTimeout(() => {
            setIsVisible(false);
        }, 300);

        // Dispara o mesmo fluxo/dispositivo que o clique de configurações
        await handleRequestPermission();
    };

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop com desfoque de fundo moderno */}
            <div 
                className="absolute inset-0 bg-gray-950/60 backdrop-blur-xs"
                onClick={handleClose}
            />
            
            {/* Conteúdo do Modal (Design Premium / Glassmorphism) */}
            <div className={`relative w-full max-w-sm overflow-hidden rounded-3xl bg-white/95 p-6 text-center shadow-2xl border border-white/20 transition-all duration-300 transform ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Botão para fechar */}
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Fechar"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>

                {/* Ícone Animado com Efeito Pulsante */}
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 relative">
                    <div className="absolute inset-0 rounded-2xl bg-purple-500/10 animate-ping" />
                    <Bell size={28} className="animate-bounce" style={{ animationDuration: '2s' }} strokeWidth={2.2} />
                </div>

                {/* Título */}
                <h3 className="mb-2 text-lg font-bold text-gray-900 tracking-tight">
                    Fique por dentro de tudo!
                </h3>
                
                {/* Descrição persuasiva */}
                <p className="mb-6 text-xs text-gray-500 leading-relaxed px-1">
                    Ative as notificações para receber alertas instantâneos quando você receber novas mensagens e atualizações de chats.
                </p>

                {/* Ações */}
                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleEnable}
                        className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-all active:scale-[0.98] shadow-sm shadow-purple-600/20"
                    >
                        Ativar Notificações
                    </button>
                    <button
                        onClick={handleClose}
                        className="w-full h-9 rounded-xl bg-transparent hover:bg-gray-50 text-gray-400 hover:text-gray-600 font-medium text-[11px] transition-colors"
                    >
                        Agora não
                    </button>
                </div>
            </div>
        </div>
    );
}
