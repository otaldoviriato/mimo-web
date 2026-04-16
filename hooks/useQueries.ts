'use client';

/**
 * hooks/useQueries.ts
 *
 * Hooks centralizados de dados usando TanStack Query (React Query v5).
 * Estratégia stale-while-revalidate: exibe dados do cache imediatamente
 * e valida/atualiza em background — sem skeleton na troca de abas.
 */

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
    return useQuery({
        queryKey: QueryKeys.me,
        queryFn: async () => {
            const response = await userApi.getMe();
            return response?.user ?? null;
        },
    });
}

// ─── Hook: salas de chat ────────────────────────────────────────────────────
export function useChatRooms() {
    const { user } = useUser();

    return useQuery({
        queryKey: QueryKeys.rooms(user?.id ?? ''),
        queryFn: async () => {
            if (!user?.id) return [];
            // Usa a API Next.js (server-side) que conecta direto ao MongoDB Atlas
            const response = await fetch(`/api/rooms/${user.id}`);
            if (!response.ok) throw new Error('Falha ao buscar salas');
            const data = await response.json();
            // A rota Next.js retorna array diretamente (enriquecido com otherParticipant)
            return Array.isArray(data) ? data : (data.rooms ?? []);
        },
        enabled: !!user?.id,
    });
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
            chargeMode?: boolean;
            chargePerChar?: number;
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
                queryClient.setQueryData(QueryKeys.me, (old: any) =>
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
                queryClient.setQueryData(QueryKeys.me, (old: any) =>
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
    return useQuery({
        queryKey: QueryKeys.userById(userId ?? ''),
        queryFn: async () => {
            if (!userId) return null;
            try {
                const data = await userApi.getUserById(userId);
                return data.user ?? null;
            } catch (error: any) {
                return {
                    username: `Usuário ${userId.substring(0, 8)}`,
                    chargeMode: false,
                    chargePerChar: 0,
                };
            }
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000,
    });
}
