'use client';

import { useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket';
import type { Socket } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

export function useSocket(userId: string | undefined) {
    const { getToken } = useAuth();
    const getTokenRef = useRef(getToken);
    getTokenRef.current = getToken;

    const [socketVersion, setSocketVersion] = useState(0);
    const [connected, setConnected] = useState(() => socketService.isConnected());

    useEffect(() => {
        const unsubscribe = socketService.onConnectionChange((isConnected) => {
            setConnected(isConnected);
            if (isConnected) {
                setSocketVersion((v) => v + 1);
            }
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!userId) return;
        socketService.connect(userId, () => getTokenRef.current());
    }, [userId]);

    return {
        socket: socketService.socket as Socket | null,
        socketVersion,
        connected,
        socketService,
    };
}
