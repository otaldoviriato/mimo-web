'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useSocket } from '@/hooks/useSocket';

export interface FreeIntroState {
    limit: number;
    timeoutMinutes: number;
    enabled: boolean;
    pausedAt?: string;
    eligible?: boolean;
    hasConversation?: boolean;
    remaining?: number;
    textOnly?: boolean;
    grant?: { professionalId: string; limit: number; used: number; convertedAt?: string | null };
}

export function useFreeIntro(otherId?: string) {
    const { user } = useUser();
    const { socket, socketVersion } = useSocket(user?.id);
    const client = useQueryClient();
    const query = useQuery<FreeIntroState>({
        queryKey: ['freeIntro', user?.id, otherId ?? 'me'],
        enabled: !!user?.id,
        queryFn: async () => {
            const response = await fetch(`/api/free-intro${otherId ? `?otherId=${encodeURIComponent(otherId)}` : ''}`);
            if (!response.ok) throw new Error('Não foi possível consultar Conheça grátis.');
            return response.json();
        },
        staleTime: 0,
        refetchInterval: 15000,
    });
    useEffect(() => {
        if (!socket) return;
        const refresh = () => {
            for (const key of ['freeIntro', 'rooms', 'users']) void client.invalidateQueries({ queryKey: [key] });
        };
        socket.on('free_intro_updated', refresh);
        socket.on('free_intro_offer_updated', refresh);
        socket.on('connect', refresh);
        return () => {
            socket.off('free_intro_updated', refresh);
            socket.off('free_intro_offer_updated', refresh);
            socket.off('connect', refresh);
        };
    }, [socket, socketVersion, client]);
    return { ...query, socket };
}
