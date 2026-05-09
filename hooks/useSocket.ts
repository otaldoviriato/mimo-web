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
            // Incrementa a versão AQUI — só após conexão real — para que o ChatPage
            // chame joinRoom com o socket já pronto. Se incrementássemos antes, o
            // joinRoom seria emitido enquanto o socket ainda estava conectando (ex:
            // servidor dormindo), o evento se perderia e o room_joined nunca chegaria.
            setSocketVersion((v) => v + 1);
        };

        const handleDisconnect = (reason: string) => {
            console.log('[Socket] Desconectado:', reason);
            setConnected(false);
        };

        s.on('connect', handleConnect);
        s.on('disconnect', handleDisconnect);

        // Socket já estava conectado quando o hook montou: dispara imediatamente
        if (s.connected) {
            setTimeout(() => {
                setConnected(true);
                setSocketVersion((v) => v + 1);
            }, 0);
        }

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
