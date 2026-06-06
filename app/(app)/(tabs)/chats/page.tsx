'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, TouchableRipple } from '@/components';
import { useChatRooms, useMyProfile, QueryKeys } from '@/hooks/useQueries';
import { useSocket } from '@/hooks/useSocket';
import { CheckCircle2, X, WalletCards } from 'lucide-react';

interface Room {
    _id: string;
    participants: string[];
    lastMessage?: string;
    lastMessageTime?: string;
    updatedAt: string;
    isTyping?: boolean;
    unreadCount?: Record<string, number>;
    // roomId como string composta de clerkIds (ex: "user_abc_user_xyz")
    // usado para matching com eventos WebSocket
    roomId?: string;
    otherUser?: {
        clerkId: string;
        username: string;
        name?: string;
        photoUrl?: string;
        isProfessional?: boolean;
        balance?: number;
        isHighSpender?: boolean;
    };
}

function formatMessageTime(dateStr: string): string {
    const messageDate = new Date(dateStr);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = messageDate.toDateString() === yesterday.toDateString();

    if (isToday) return messageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return 'Ontem';
    return messageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function ChatListSkeleton() {
    return (
        <div className="flex-1 overflow-y-auto">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="w-full flex items-center px-4 py-4 border-b border-gray-50 animate-pulse">
                    <div className="w-[52px] h-[52px] rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 ml-4 min-w-0">
                        <div className="flex items-baseline justify-between mb-2.5">
                            <div className="h-4 bg-gray-100 rounded-lg w-32" />
                            <div className="h-2.5 bg-gray-50 rounded-lg w-10" />
                        </div>
                        <div className="h-3 bg-gray-50 rounded-lg w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ChatsPage() {
    const router = useTransitionRouter();
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { socket, connected, socketService, socketVersion } = useSocket(user?.id);

    // Estado de "digitando" por sala: { [roomId]: boolean }
    const [typingRooms, setTypingRooms] = useState<Record<string, boolean>>({});

    // Modal de crédito promocional (gift code)
    const [giftModal, setGiftModal] = useState(false);
    const [giftAmount, setGiftAmount] = useState<number | null>(null);
    const giftClaimedRef = useRef(false);

    // Resolve a transição pendente assim que a lista de chats é montada
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }
    }, []);

    const { data: rooms = [], isLoading, isRefetching, refetch: refetchRooms } = useChatRooms();
    const { data: myProfile, refetch: refetchProfile } = useMyProfile();

    // ─── Listeners de WebSocket em tempo real ───────────────────────────────
    useEffect(() => {
        if (!socket || !user?.id) return;

        // 1. Atualiza saldo em tempo real
        const handleBalanceUpdate = (data: { balance: number }) => {
            queryClient.setQueryData(QueryKeys.me, (old: any) =>
                old ? { ...old, balance: data.balance } : old
            );
            queryClient.invalidateQueries({ queryKey: ['earnings', 'recent'] });
        };

        // 2. Atualiza a última mensagem da sala em tempo real
        // Disparado pelo servidor quando alguém envia uma mensagem para este usuário
        const handleRoomUpdated = (data: {
            roomId: string;
            mongoRoomId?: string;
            lastMessage: string;
            lastMessageTime: string;
            senderId: string;
        }) => {
            queryClient.setQueryData(
                QueryKeys.rooms(user.id!),
                (old: Room[] | undefined) => {
                    if (!old) return old;
                    // Usa mongoRoomId (ObjectId) para encontrar a sala no cache
                    // pois room._id vem do MongoDB como string ObjectId
                    const updated = old.map((room) => {
                        const derivedRoomId = room.roomId ?? [...room.participants].sort().join('_');
                        const match = data.mongoRoomId
                            ? room._id === data.mongoRoomId
                            : derivedRoomId === data.roomId;
                        if (match) {
                            const currentUnread = room.unreadCount?.[user.id!] ?? 0;
                            const isMe = data.senderId === user.id;
                            return {
                                ...room,
                                lastMessage: data.lastMessage,
                                lastMessageTime: data.lastMessageTime,
                                updatedAt: data.lastMessageTime,
                                unreadCount: {
                                    ...room.unreadCount,
                                    [user.id!]: isMe ? currentUnread : currentUnread + 1,
                                },
                            };
                        }
                        return room;
                    });
                    // Reordena: sala com mensagem mais recente primeiro
                    return [...updated].sort(
                        (a, b) =>
                            new Date(b.lastMessageTime ?? b.updatedAt).getTime() -
                            new Date(a.lastMessageTime ?? a.updatedAt).getTime()
                    );
                }
            );
        };

        // 3. Exibe "digitando..." por sala na lista
        // O servidor emite global_typing para user:${receiverId} sempre que alguém digita
        const handleGlobalTyping = (data: { roomId: string; userId: string; isTyping: boolean }) => {
            setTypingRooms((prev) => ({ ...prev, [data.roomId]: data.isTyping }));

            // Auto-limpa após 3s como fallback (caso o evento isTyping=false não chegue)
            if (data.isTyping) {
                setTimeout(() => {
                    setTypingRooms((prev) => ({ ...prev, [data.roomId]: false }));
                }, 3000);
            }
        };

        // 4. Marca sala como lida
        const handleRoomRead = (data: { roomId: string; userId: string }) => {
            queryClient.setQueryData(
                QueryKeys.rooms(user.id!),
                (old: Room[] | undefined) => {
                    if (!old) return old;
                    return old.map((room) => {
                        const derivedRoomId = room.roomId ?? [...room.participants].sort().join('_');
                        if (derivedRoomId === data.roomId) {
                            return {
                                ...room,
                                unreadCount: {
                                    ...room.unreadCount,
                                    [user.id!]: 0,
                                },
                            };
                        }
                        return room;
                    });
                }
            );
        };

        socket.on('balance_update', handleBalanceUpdate);
        socket.on('room_updated', handleRoomUpdated);
        socket.on('global_typing', handleGlobalTyping);
        socket.on('room_read', handleRoomRead);

        return () => {
            socket.off('balance_update', handleBalanceUpdate);
            socket.off('room_updated', handleRoomUpdated);
            socket.off('global_typing', handleGlobalTyping);
            socket.off('room_read', handleRoomRead);
        };
    }, [socket, socketVersion, user?.id, queryClient]);

    // ─── Resgate de gift code ────────────────────────────────────────────────
    // Funciona em dois cenários:
    // 1. Usuário não logado acessa /login?gift=X → GiftCapture salva no sessionStorage → redireciona para /chats
    // 2. Usuário já logado acessa /chats?gift=X diretamente → lemos window.location.search aqui
    useEffect(() => {
        if (!user?.id || giftClaimedRef.current) return;

        const stored = sessionStorage.getItem('mimo_pending_gift');
        const fromUrl = new URLSearchParams(window.location.search).get('gift');
        const code = stored || fromUrl;
        if (!code) return;

        giftClaimedRef.current = true;
        sessionStorage.removeItem('mimo_pending_gift');

        fetch('/api/gift/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setGiftAmount(typeof data?.amount === 'number' ? data.amount : null);
                setGiftModal(true);
                queryClient.invalidateQueries({ queryKey: QueryKeys.me });
                queryClient.invalidateQueries({ queryKey: ['deposit', 'history'] });
                if (user?.id) {
                    queryClient.invalidateQueries({ queryKey: QueryKeys.balance(user.id) });
                }
            }
        }).catch(() => {});
    }, [user?.id, queryClient]);

    // Abre a tela de conversa física usando o roteador de transição
    const handleOpenChat = (userId: string) => {
        router.push(`/chat/${userId}`);
    };

    const onRefresh = useCallback(() => {
        refetchRooms();
        refetchProfile();
    }, [refetchRooms, refetchProfile]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="shared-header bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <img
                        src="/icon-192x192.png"
                        alt="MimoChat"
                        className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Conversas</span>
                </div>
            </div>

            {/* Modal de crédito promocional */}
            {giftModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
                    <div
                        className="absolute inset-0 bg-purple-950/35 backdrop-blur-[2px] animate-in fade-in duration-200"
                        onClick={() => setGiftModal(false)}
                    />
                    <div className="relative w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-6 zoom-in-95 duration-300">
                        <div className="relative overflow-hidden rounded-[28px] border border-purple-100 bg-white text-gray-900 shadow-2xl">
                            <button
                                type="button"
                                aria-label="Fechar"
                                onClick={() => setGiftModal(false)}
                                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
                            >
                                <X size={18} strokeWidth={2.2} />
                            </button>

                            <div className="h-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-500" />

                            <div className="px-6 pb-6 pt-7">
                                <div className="mb-5 flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
                                        <WalletCards size={24} strokeWidth={1.9} />
                                    </div>
                                    <div className="min-w-0 pr-7">
                                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-500">Saldo promocional</p>
                                        <h2 className="text-[22px] font-semibold leading-tight tracking-normal text-gray-900">Crédito liberado para você</h2>
                                    </div>
                                </div>

                                <div className="mb-5 rounded-2xl border border-purple-100 bg-purple-50/60 px-5 py-4">
                                    <div className="flex items-end justify-between gap-4">
                                        <div>
                                            <p className="mb-1 text-sm text-gray-500">Valor adicionado</p>
                                            <p className="text-[42px] font-semibold leading-none tracking-normal text-purple-700">
                                                {((giftAmount ?? 5000) / 100).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                    maximumFractionDigits: 0,
                                                })}
                                            </p>
                                        </div>
                                        <CheckCircle2 className="mb-1 shrink-0 text-emerald-500" size={26} strokeWidth={1.9} />
                                    </div>
                                    <div className="mt-4 h-px bg-purple-100" />
                                    <p className="mt-4 text-sm leading-relaxed text-gray-600">
                                        O valor já entrou no seu saldo e pode ser usado nas conversas e conteúdos do app.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setGiftModal(false)}
                                    className="w-full rounded-2xl bg-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition-colors hover:bg-purple-700 active:scale-[0.99]"
                                >
                                    Continuar no chat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* List */}
            <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                {isLoading ? (
                    <ChatListSkeleton />
                ) : rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-8 text-center animate-in fade-in duration-500">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <span className="text-5xl">💬</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Sem conversas ainda</h2>
                        <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed">
                            Quando você começar a conversar com alguém, elas aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <ul>
                        {rooms.map((room: Room) => {
                            const otherUserId = room.participants.find((p) => p !== user?.id);
                            // roomId como string de clerkIds — corresponde ao que o servidor envia no typing
                            const derivedRoomId = room.roomId ?? room.participants.slice().sort().join('_');
                            const myUnreadCount = user?.id && room.unreadCount ? (room.unreadCount[user.id] || 0) : 0;
                            const hasUnread = myUnreadCount > 0;
                            const isRoomTyping = typingRooms[derivedRoomId] ?? false;

                            return (
                                <li key={room._id}>
                                    <TouchableRipple
                                        onClick={() => otherUserId && handleOpenChat(otherUserId)}
                                        className="w-full flex items-center px-4 py-3.5 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar size={52} uri={room.otherUser?.photoUrl} />
                                            {myProfile?.isProfessional && (
                                                <div className="absolute -bottom-1 -right-1 bg-white text-purple-700 rounded-full px-1.5 py-0.5 border border-purple-200 flex items-center justify-center shadow-sm">
                                                    <span className="text-[9px] font-bold leading-none whitespace-nowrap">
                                                        R$ {((room.otherUser?.balance || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 ml-3 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center min-w-0 gap-2">
                                                    <span className={`text-base truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                                        {room.otherUser?.name || room.otherUser?.username || `Usuário ${otherUserId?.substring(0, 8)}`}
                                                    </span>
                                                    {myProfile?.isProfessional && room.otherUser?.isHighSpender && (
                                                        <span className="text-sm leading-none drop-shadow-sm" title="Cliente VIP">💎</span>
                                                    )}
                                                </div>
                                                <span className={`text-xs ml-2 shrink-0 ${hasUnread ? 'font-semibold text-purple-600' : 'text-gray-400'}`}>
                                                    {room.lastMessageTime ? formatMessageTime(room.lastMessageTime) : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                {/* Digitando... ou última mensagem */}
                                                {isRoomTyping ? (
                                                    <span className="text-sm text-purple-500 italic flex items-center gap-1.5">
                                                        digitando
                                                        <span className="flex gap-0.5">
                                                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className={`text-sm truncate flex-1 pr-3 ${hasUnread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                                        {room.lastMessage || 'Nenhuma mensagem ainda'}
                                                    </span>
                                                )}
                                                {hasUnread && (
                                                    <span className="shrink-0 bg-purple-600 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1">
                                                        {myUnreadCount > 99 ? '99+' : myUnreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TouchableRipple>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

        </div>
    );
}
