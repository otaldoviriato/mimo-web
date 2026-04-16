'use client';

import { useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket';
import type { Socket } from 'socket.io-client';

/**
 * Hook que garante que o socket está conectado e autenticado.
 *
 * Problema original: socketService.socket é criado assincronamente mas o hook
 * retorna null antes da conexão, causando useEffects que nunca escutam eventos.
 *
 * Solução: usar contador de versão (socketVersion) para forçar re-renders
 * quando o socket é (re)criado, garantindo que consumidores recebam a ref correta.
 */
export function useSocket(userId: string | undefined) {
    // Contador que muda sempre que o socket é (re)criado — força re-render nos consumidores
    const [socketVersion, setSocketVersion] = useState(0);
    const [connected, setConnected] = useState(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!userId) return;

        // Limpa listeners do ciclo anterior
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }

        // Conecta (idempotente — não reconecta se já tiver o mesmo userId)
        socketService.connect(userId);

        const s = socketService.socket;
        if (!s) return;

        const handleConnect = () => {
            console.log('[Socket] Conectado, id:', s.id);
            setConnected(true);
            // Re-autentica sempre que conecta/reconecta
            socketService.authenticate(userId);
        };

        const handleDisconnect = (reason: string) => {
            console.log('[Socket] Desconectado:', reason);
            setConnected(false);
        };

        s.on('connect', handleConnect);
        s.on('disconnect', handleDisconnect);

        // Socket já estava conectado quando o hook montou
        if (s.connected) {
            setConnected(true);
        }

        // Incrementa versão para forçar re-render nos consumidores
        // (garante que useEffects com [socket] como dep rodem com o socket correto)
        setSocketVersion((v) => v + 1);

        cleanupRef.current = () => {
            s.off('connect', handleConnect);
            s.off('disconnect', handleDisconnect);
        };

        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }
        };
    }, [userId]);

    return {
        // Retorna o socket diretamente do singleton — é sempre a ref mais atual
        // O socketVersion força os consumidores a re-renderizar e pegar essa ref
        socket: socketService.socket as Socket | null,
        socketVersion, // Exponha para useEffects usarem como dep
        connected,
        socketService,
    };
}
