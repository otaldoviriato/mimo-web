'use client';

import React, { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { setupAxiosInterceptors } from '@/services/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent" />
            </div>
        );
    }

    if (!isSignedIn) return null;

    return <>{children}</>;
}
