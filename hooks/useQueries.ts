'use client';

/**
 * hooks/useQueries.ts
 *
 * Hooks centralizados de dados usando TanStack Query (React Query v5).
 * Estratégia stale-while-revalidate: exibe dados do cache imediatamente
 * e valida/atualiza em background — sem skeleton na troca de abas.
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { userApi } from '@/services/api';

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';

// ─── Chaves de cache ────────────────────────────────────────────────────────
export const QueryKeys = {
    me: ['user', 'me'] as const,
    rooms: (userId: string) => ['rooms', userId] as const,
    balance: (userId: string) => ['balance', userId] as const,
    userById: (userId: string) => ['user', userId] as const,
} as const;

// ─── Hook: dados do perfil do usuário logado ────────────────────────────────
export function useMyProfile() {
    const query = useQuery({
        queryKey: QueryKeys.me,
        queryFn: async () => {
            const response = await userApi.getMe();
            const user = response?.user ?? null;
            if (typeof window !== 'undefined' && user) {
                localStorage.setItem('mimo_profile', JSON.stringify(user));
            }
            return user;
        },
        initialData: () => {
            if (typeof window !== 'undefined') {
                const cached = localStorage.getItem('mimo_profile');
                if (cached) {
                    try {
                        return JSON.parse(cached);
                    } catch (e) {
                        return undefined;
                    }
                }
            }
            return undefined;
        },
        initialDataUpdatedAt: 0,
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && query.data) {
            localStorage.setItem('mimo_profile', JSON.stringify(query.data));
        }
    }, [query.data]);

    return query;
}

// ─── Hook: salas de chat ────────────────────────────────────────────────────
export function useChatRooms() {
    const { user } = useUser();

    const query = useQuery({
        queryKey: QueryKeys.rooms(user?.id ?? ''),
        queryFn: async () => {
            if (!user?.id) return [];
            // Usa a API Next.js (server-side) que conecta direto ao MongoDB Atlas
            const response = await fetch(`/api/rooms/${user.id}`);
            if (!response.ok) throw new Error('Falha ao buscar salas');
            const data = await response.json();
            // A rota Next.js retorna array diretamente (enriquecido com otherParticipant)
            const rooms = Array.isArray(data) ? data : (data.rooms ?? []);
            if (typeof window !== 'undefined') {
                localStorage.setItem(`mimo_rooms_${user.id}`, JSON.stringify(rooms));
            }
            return rooms;
        },
        enabled: !!user?.id,
        initialData: () => {
            if (typeof window !== 'undefined' && user?.id) {
                const cached = localStorage.getItem(`mimo_rooms_${user.id}`);
                if (cached) {
                    try {
                        return JSON.parse(cached);
                    } catch (e) {
                        return undefined;
                    }
                }
            }
            return undefined;
        },
        initialDataUpdatedAt: 0,
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && user?.id && query.data) {
            localStorage.setItem(`mimo_rooms_${user.id}`, JSON.stringify(query.data));
        }
    }, [query.data, user?.id]);

    return query;
}

// ─── Hook: saldo (chat server) ──────────────────────────────────────────────
export function useChatBalance() {
    const { user } = useUser();

    return useQuery({
        queryKey: QueryKeys.balance(user?.id ?? ''),
        queryFn: async () => {
            if (!user?.id) return 0;
            const response = await fetch(`${CHAT_SERVER_URL}/api/balance/${user.id}`);
            if (!response.ok) throw new Error('Falha ao buscar saldo');
            const data = await response.json();
            return data.balance ?? 0;
        },
        enabled: !!user?.id,
    });
}

// ─── Mutation: atualizar perfil ─────────────────────────────────────────────
export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: {
            username?: string;
            name?: string;
            photoUrl?: string;
            gallery?: string[];
            isProfessional?: boolean;
            subscriptionPrice?: number;
            chargePerCharSubscribers?: number;
            chargePerCharNonSubscribers?: number;
            pixKey?: string;
        }) => userApi.updateMe(data),
        onSuccess: (response) => {
            if (response?.user) {
                queryClient.setQueryData(QueryKeys.me, response.user);
            } else {
                queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            }
        },
    });
}

// ─── Mutation: upload de foto ───────────────────────────────────────────────
export function useUploadPhoto() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (formData: FormData) => userApi.uploadPhoto(formData),
        onSuccess: (response) => {
            if (response?.photoUrl) {
                queryClient.setQueryData(QueryKeys.me, (old: Record<string, unknown> | null) =>
                    old ? { ...old, photoUrl: response.photoUrl } : old
                );
            }
        },
    });
}

// ─── Mutation: adicionar saldo ──────────────────────────────────────────────
export function useAddBalance() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (amount: number) => userApi.addBalance(amount),
        onSuccess: (response) => {
            if (response?.balance !== undefined) {
                queryClient.setQueryData(QueryKeys.me, (old: Record<string, unknown> | null) =>
                    old ? { ...old, balance: response.balance } : old
                );
            }
        },
    });
}

// ─── Mutation: gerar Pix ────────────────────────────────────────────────────
export function useGeneratePix() {
    return useMutation({
        mutationFn: (amount: number) => userApi.generatePix(amount),
    });
}

// ─── Hook: buscar usuário por ID ────────────────────────────────────────────
export function useUserById(userId: string | undefined) {
    const queryClient = useQueryClient();
    const { user: currentUser } = useUser();

    const query = useQuery({
        queryKey: QueryKeys.userById(userId ?? ''),
        queryFn: async () => {
            if (!userId) return null;
            try {
                const data = await userApi.getUserById(userId);
                const fetchedUser = data.user ?? null;
                if (typeof window !== 'undefined' && fetchedUser) {
                    localStorage.setItem(`mimo_user_${userId}`, JSON.stringify(fetchedUser));
                }
                return fetchedUser;
            } catch {
                return {
                    username: `Usuário ${userId.substring(0, 8)}`,
                    isProfessional: false,
                    subscriptionPrice: 0,
                };
            }
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000,
        initialData: () => {
            if (typeof window !== 'undefined' && userId) {
                const cached = localStorage.getItem(`mimo_user_${userId}`);
                if (cached) {
                    try {
                        return JSON.parse(cached);
                    } catch (e) {
                        // ignore
                    }
                }
            }
            // Tenta obter das salas salvas no cache do react-query
            if (currentUser?.id && userId) {
                const rooms = queryClient.getQueryData<any[]>(QueryKeys.rooms(currentUser.id));
                if (rooms) {
                    const room = rooms.find((r) => r.participants.includes(userId));
                    if (room?.otherUser) {
                        return room.otherUser;
                    }
                }
            }
            return undefined;
        },
        initialDataUpdatedAt: 0,
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && userId && query.data) {
            localStorage.setItem(`mimo_user_${userId}`, JSON.stringify(query.data));
        }
    }, [query.data, userId]);

    return query;
}

export function useUserByUsername(username: string | undefined) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['user', 'username', username ?? ''],
        queryFn: async () => {
            if (!username) return null;
            try {
                const data = await userApi.getUserByUsername(username);
                const fetchedUser = data.user ?? null;
                if (typeof window !== 'undefined' && fetchedUser) {
                    localStorage.setItem(`mimo_user_${fetchedUser.clerkId}`, JSON.stringify(fetchedUser));
                    queryClient.setQueryData(QueryKeys.userById(fetchedUser.clerkId), fetchedUser);
                }
                return fetchedUser;
            } catch {
                return null;
            }
        },
        enabled: !!username,
        staleTime: 2 * 60 * 1000,
    });

    return query;
}

// ─── Galeria ─────────────────────────────────────────────────────────────
export function useMyGallery() {
    return useQuery({
        queryKey: ['gallery', 'me'],
        queryFn: async () => {
            const response = await fetch('/api/users/me/gallery');
            if (!response.ok) return { items: [] };
            return response.json();
        },
    });
}

export function usePublicGallery(userId: string | undefined) {
    return useQuery({
        queryKey: ['gallery', userId],
        queryFn: async () => {
            if (!userId) return { items: [] };
            const response = await fetch(`/api/users/${userId}/gallery`);
            if (!response.ok) return { items: [] };
            return response.json();
        },
        enabled: !!userId,
    });
}

export function useUploadToGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await fetch('/api/users/me/gallery', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao fazer upload');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
        },
    });
}

export function useSubscribe() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            const response = await fetch(`/api/users/${userId}/subscribe`, {
                method: 'POST',
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao realizar assinatura');
            }
            return response.json();
        },
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: QueryKeys.userById(userId) });
            queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            queryClient.invalidateQueries({ queryKey: ['gallery', userId] });
        },
    });
}

export function useRecentEarnings(otherUserId?: string) {
    return useQuery({
        queryKey: ['earnings', 'recent', otherUserId || 'all'],
        queryFn: async () => {
            const url = otherUserId 
                ? `/api/users/me/earnings?otherUserId=${otherUserId}`
                : '/api/users/me/earnings';
            const response = await fetch(url);
            if (!response.ok) return { lastSessionEarnings: 0 };
            return response.json() as Promise<{ lastSessionEarnings: number }>;
        },
        refetchInterval: 30 * 1000, 
    });
}

// ─── Saques (Withdrawals) ───────────────────────────────────────────────────
export function usePendingWithdrawal() {
    return useQuery({
        queryKey: ['withdraw', 'pending'],
        queryFn: async () => {
            const data = await userApi.getPendingWithdrawal();
            return data.pendingWithdrawal ?? null;
        },
    });
}

export function useRequestWithdraw() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => userApi.requestWithdraw(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['withdraw', 'pending'] });
            queryClient.invalidateQueries({ queryKey: QueryKeys.me }); // Atualiza saldo para 0
        },
    });
}
