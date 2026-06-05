'use client';

import React, { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { setupAxiosInterceptors } from '@/services/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NotificationPromptModal } from '@/components';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const { handleRequestPermission } = usePushNotifications();

    useEffect(() => {
        // Se a rota for o chat, deixamos a própria página de chat gerenciar a resolução
        // para aguardar o carregamento das mensagens do cache.
        // Para outras rotas, resolvemos a transição pendente imediatamente.
        if (pathname && !pathname.includes('/chat/')) {
            if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
                (window as any).__resolveTransition();
                (window as any).__resolveTransition = null;
            }
        }
    }, [pathname]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('startViewTransition' in document)) return;

        const handlePopState = () => {
            if ((window as any).__navigatingWithTransition) {
                return;
            }

            document.documentElement.classList.add('transition-backward');
            document.documentElement.classList.remove('transition-forward');

            const transition = (document as any).startViewTransition(() => {
                return new Promise<void>((resolve) => {
                    (window as any).__resolveTransition = () => {
                        setTimeout(resolve, 50);
                    };

                    setTimeout(() => {
                        if ((window as any).__resolveTransition) {
                            resolve();
                            (window as any).__resolveTransition = null;
                        }
                    }, 1000);
                });
            });

            if (transition.ready) {
                transition.ready.catch(() => {});
            }

            transition.finished
                .catch(() => {})
                .finally(() => {
                    document.documentElement.classList.remove('transition-backward');
                });
        };

        window.addEventListener('popstate', handlePopState, true);
        return () => {
            window.removeEventListener('popstate', handlePopState, true);
        };
    }, []);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.replace('/login');
        }
    }, [isLoaded, isSignedIn]);

    useEffect(() => {
        if (isSignedIn && user) {
            setupAxiosInterceptors(getToken);
            // Apenas renova/atualiza o token se a permissão já foi dada
            // Evita disparar prompt automático no carregamento (bloqueado no iOS)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                handleRequestPermission();
            }
        }
    }, [isSignedIn, user, getToken]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6] select-none">
                <div className="flex flex-col items-center animate-fade-in-up">
                    {/* Logo do MimoChat */}
                    <div className="relative w-28 h-28 md:w-32 md:h-32 mb-6 rounded-3xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 animate-pulse">
                        <img 
                            src="/icon-192x192.png" 
                            alt="MimoChat Logo" 
                            className="w-20 h-20 md:w-24 md:h-24 object-contain"
                        />
                    </div>
                    {/* Nome do Aplicativo */}
                    <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-wider drop-shadow-md">
                        MimoChat
                    </h1>
                    <p className="text-purple-200 text-xs md:text-sm tracking-widest mt-1 uppercase font-semibold opacity-80">
                        Conectando você de verdade
                    </p>
                </div>
                {/* Loader Sutil */}
                <div className="absolute bottom-12 flex flex-col items-center">
                    <div className="flex space-x-1.5 justify-center items-center">
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isSignedIn) return null;

    return (
        <>
            {children}
            <NotificationPromptModal />
        </>
    );
}
