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

type WithdrawalStatus = 'pendente' | 'processando' | 'concluido' | 'rejeitado';

type WithdrawalHistoryResponse = {
    withdrawals: Array<{
        id: string;
        amount: number;
        status: WithdrawalStatus;
        createdAt: string;
    }>;
};

type PendingWithdrawalResponse = {
    status?: WithdrawalStatus;
} | null;

// ─── Chaves de cache ────────────────────────────────────────────────────────
export const QueryKeys = {
    me: ['user', 'me'] as const,
    rooms: (userId: string) => ['rooms', userId] as const,
    balance: (userId: string) => ['balance', userId] as const,
    userById: (userId: string) => ['user', userId] as const,
} as const;

export function useMyProfile() {
    const { user: clerkUser } = useUser();

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
                        const parsed = JSON.parse(cached);
                        // Ignora o cache se for de outro usuário logado no Clerk para evitar flashes visuais
                        if (clerkUser?.id && parsed.clerkId !== clerkUser.id) {
                            localStorage.removeItem('mimo_profile');
                            return undefined;
                        }
                        return parsed;
                    } catch {
                        return undefined;
                    }
                }
            }
            return undefined;
        },
        initialDataUpdatedAt: 0,
        refetchInterval: (query: any) => {
            const user = query.state.data;
            if (
                user &&
                user.isProfessional &&
                user.professionalStatus !== 'approved' &&
                user.professionalStatus !== 'rejected'
            ) {
                return 5000;
            }
            return false;
        },
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
            const persistedRooms = Array.isArray(data) ? data : (data.rooms ?? []);
            const pendingKey = `mimo_pending_rooms_${user.id}`;
            let pendingRooms: any[] = [];
            try {
                const cachedPending = localStorage.getItem(pendingKey);
                pendingRooms = cachedPending ? JSON.parse(cachedPending) : [];
            } catch {
                pendingRooms = [];
            }

            const persistedRoomIds = new Set(
                persistedRooms.map((room: any) =>
                    room.roomId ?? [...room.participants].sort().join('_')
                )
            );
            const unresolvedPendingRooms = pendingRooms.filter(
                (room: any) => !persistedRoomIds.has(room.roomId)
            );
            const rooms = [...persistedRooms, ...unresolvedPendingRooms];

            localStorage.setItem(pendingKey, JSON.stringify(unresolvedPendingRooms));
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
                    } catch {
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
            coverUrl?: string;
            gallery?: string[];
            isProfessional?: boolean;
            subscriptionPrice?: number;
            chargePerCharSubscribers?: number;
            chargePerCharNonSubscribers?: number;
            pixKey?: string;
            bio?: string;
            taxId?: string;
            phone?: string;
            emailNotificationsEnabled?: boolean;
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

export function useUploadCover() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (formData: FormData) => userApi.uploadCover(formData),
        onSuccess: (response) => {
            if (response?.coverUrl) {
                queryClient.setQueryData(QueryKeys.me, (old: Record<string, unknown> | null) =>
                    old ? { ...old, coverUrl: response.coverUrl } : old
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

export function useGenerateCardPayment() {
    return useMutation({
        mutationFn: (data: {
            amount: number;
            holderName?: string;
            holderDocument?: string;
            cardNumber?: string;
            expiryMonth?: string;
            expiryYear?: string;
            cvv?: string;
            phone?: string;
            saveCard?: boolean;
            savedCardId?: string;
        }) => userApi.generateCardPayment(data),
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
                    } catch {
                        // ignore
                    }
                }
            }
            // Tenta obter das salas salvas no cache do react-query
            if (currentUser?.id && userId) {
                const rooms = queryClient.getQueryData<Array<{ participants: string[]; otherUser?: unknown }>>(
                    QueryKeys.rooms(currentUser.id)
                );
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
                let errorMessage = 'Erro ao fazer upload';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    try {
                        const textError = await response.text();
                        if (response.status === 413 || textError.toLowerCase().includes('too large')) {
                            errorMessage = 'O arquivo é muito grande para o servidor. Escolha um arquivo de até 8MB.';
                        } else {
                            errorMessage = textError.substring(0, 100) || `Erro HTTP ${response.status}`;
                        }
                    } catch {
                        errorMessage = `Erro HTTP ${response.status}`;
                    }
                }
                throw new Error(errorMessage);
            }
            try {
                return await response.json();
            } catch {
                throw new Error('Resposta do servidor inválida');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
        },
    });
}

export function useDeleteFromGallery() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (itemId: string) => {
            const response = await fetch(`/api/users/me/gallery?itemId=${itemId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao deletar imagem');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gallery', 'me'] });
        },
    });
}

export function useUpdateGalleryItemVisibility() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ itemId, visibility }: { itemId: string; visibility: 'public' | 'subscribers' }) => {
            const response = await fetch('/api/users/me/gallery', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ itemId, visibility }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao atualizar visibilidade');
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
            return (data.pendingWithdrawal ?? null) as PendingWithdrawalResponse;
        },
        refetchInterval: (query: { state: { data?: PendingWithdrawalResponse } }) => {
            const withdrawal = query.state.data;
            return withdrawal?.status === 'pendente' || withdrawal?.status === 'processando'
                ? 5000
                : false;
        },
    });
}

export function useRequestWithdraw() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => userApi.requestWithdraw(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['withdraw', 'pending'] });
            queryClient.invalidateQueries({ queryKey: ['withdraw', 'history'] });
            queryClient.invalidateQueries({ queryKey: QueryKeys.me }); // Atualiza saldo para 0
        },
    });
}

// ─── Histórico de Saques ────────────────────────────────────────────────────
export function useWithdrawalHistory() {
    return useQuery({
        queryKey: ['withdraw', 'history'],
        queryFn: async () => {
            const response = await fetch('/api/withdraw?history=true');
            if (!response.ok) return { withdrawals: [] };
            return response.json() as Promise<WithdrawalHistoryResponse>;
        },
        refetchInterval: (query: { state: { data?: WithdrawalHistoryResponse } }) => {
            const withdrawals = query.state.data?.withdrawals ?? [];
            return withdrawals.some((withdrawal: { status: string }) =>
                withdrawal.status === 'pendente' || withdrawal.status === 'processando'
            )
                ? 5000
                : false;
        },
        staleTime: 5 * 1000,
    });
}

// ─── Histórico de Depósitos ─────────────────────────────────────────────────
export function useDepositHistory() {
    return useQuery({
        queryKey: ['deposit', 'history'],
        queryFn: async () => {
            const response = await fetch('/api/users/me/balance/pix');
            if (!response.ok) return { transactions: [] };
            return response.json() as Promise<{
                transactions: Array<{
                    id: string;
                    amount: number;
                    status: string;
                    source: 'recharge' | 'gift';
                    type: string;
                    metadata?: Record<string, unknown>;
                    createdAt: string;
                }>;
            }>;
        },
        staleTime: 60 * 1000,
    });
}

// ─── Assinaturas do cliente ───────────────────────────────────────────────────
export type MySubscription = {
    _id: string;
    professionalId: string;
    priceInCents: number;
    expiresAt: string;
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELED';
    professional: {
        name?: string;
        username: string;
        photoUrl?: string;
    } | null;
};

export function useMySubscriptions() {
    const { user } = useUser();

    return useQuery({
        queryKey: ['subscriptions', 'me', user?.id ?? ''],
        queryFn: async () => {
            const response = await fetch('/api/users/me/subscriptions');
            if (!response.ok) return { subscriptions: [] as MySubscription[] };
            return response.json() as Promise<{ subscriptions: MySubscription[] }>;
        },
        enabled: !!user?.id,
        staleTime: 30 * 1000,
    });
}

export function useCancelSubscription() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (subscriptionId: string) => {
            const response = await fetch(
                `/api/users/me/subscriptions?subscriptionId=${subscriptionId}`,
                { method: 'DELETE' }
            );
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao cancelar assinatura');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions', 'me'] });
            queryClient.invalidateQueries({ queryKey: QueryKeys.me });
        },
    });
}
