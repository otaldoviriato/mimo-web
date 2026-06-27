'use client';

import { useEffect, useRef } from 'react';

export function usePageTitleNotifications(totalUnreads: number) {
    const originalTitleRef = useRef<string>('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isShowingAlertRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Se o título original não foi guardado ainda, ou se a página está visível,
        // guardamos/atualizamos o título original para capturar o estado mais recente.
        if (!originalTitleRef.current || document.visibilityState === 'visible') {
            // Ignora o título se ele já for o de alerta para não sobrescrever o original
            if (!document.title.includes('Novas mensagens no Mimo')) {
                originalTitleRef.current = document.title;
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Ao ficar visível, limpa o timer imediatamente e restaura o título
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                if (originalTitleRef.current) {
                    document.title = originalTitleRef.current;
                }
                isShowingAlertRef.current = false;
            } else {
                // Ao ficar invisível, salva o título antes de qualquer mudança
                if (!document.title.includes('Novas mensagens no Mimo')) {
                    originalTitleRef.current = document.title;
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Se a aba estiver invisível e houver mensagens não lidas, inicia a alternância
        if (document.visibilityState === 'hidden' && totalUnreads > 0) {
            // Se já houver um timer ativo, limpa ele para reiniciar com o novo totalUnreads
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            const toggleTitle = () => {
                if (isShowingAlertRef.current) {
                    document.title = originalTitleRef.current || 'Mimo Chat';
                } else {
                    document.title = `(${totalUnreads}) Novas mensagens no Mimo`;
                }
                isShowingAlertRef.current = !isShowingAlertRef.current;
            };

            // Define o primeiro estado do alerta
            toggleTitle();

            // Inicia o intervalo de alternância
            intervalRef.current = setInterval(toggleTitle, 2000);
        } else if (totalUnreads === 0 || document.visibilityState === 'visible') {
            // Se não houver mais unreads ou a página estiver visível, limpa o timer e restaura o título original
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (originalTitleRef.current && document.title !== originalTitleRef.current) {
                document.title = originalTitleRef.current;
            }
            isShowingAlertRef.current = false;
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [totalUnreads]);
}
