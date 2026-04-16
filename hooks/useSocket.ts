'use client';

import { useEffect, useState } from 'react';
import { socketService } from '@/services/socket';
import type { Socket } from 'socket.io-client';

export function useSocket(userId: string | undefined) {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!userId) return;

        socketService.connect(userId);

        const handleConnect = () => setConnected(true);
        const handleDisconnect = () => setConnected(false);

        if (socketService.socket) {
            socketService.socket.on('connect', handleConnect);
            socketService.socket.on('disconnect', handleDisconnect);

            if (socketService.socket.connected) {
                setConnected(true);
            }
        }

        return () => {
            if (socketService.socket) {
                socketService.socket.off('connect', handleConnect);
                socketService.socket.off('disconnect', handleDisconnect);
            }
        };
    }, [userId]);

    return {
        socket: socketService.socket,
        connected,
        socketService,
    };
}
