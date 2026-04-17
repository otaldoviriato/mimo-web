'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { useChatRooms, useMyProfile, QueryKeys } from '@/hooks/useQueries';
import { useSocket } from '@/hooks/useSocket';

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
    const router = useRouter();
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { socket, connected, socketService, socketVersion } = useSocket(user?.id);

    // Estado de "digitando" por sala: { [roomId]: boolean }
    const [typingRooms, setTypingRooms] = useState<Record<string, boolean>>({});

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
            console.log('[ChatsPage] room_updated recebido:', data);
            queryClient.setQueryData(
                QueryKeys.rooms(user.id!),
                (old: Room[] | undefined) => {
                    if (!old) {
                        console.log('[ChatsPage] Cache de rooms vazio — não atualizado');
                        return old;
                    }
                    // Usa mongoRoomId (ObjectId) para encontrar a sala no cache
                    // pois room._id vem do MongoDB como string ObjectId
                    const updated = old.map((room) => {
                        const match = data.mongoRoomId
                            ? room._id === data.mongoRoomId
                            : room.participants.includes(data.senderId);
                        if (match) {
                            const currentUnread = room.unreadCount?.[user.id!] ?? 0;
                            const isMe = data.senderId === user.id;
                            console.log('[ChatsPage] Atualizando sala:', room._id, '→', data.lastMessage);
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
            console.log('[ChatsPage] room_read recebido:', data);
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

        console.log('[ChatsPage] Registrando listeners de socket. userId:', user.id, '| socket.id:', socket.id);

        socket.on('balance_update', handleBalanceUpdate);
        socket.on('room_updated', handleRoomUpdated);
        socket.on('global_typing', handleGlobalTyping);
        socket.on('room_read', handleRoomRead);

        return () => {
            console.log('[ChatsPage] Removendo listeners de socket');
            socket.off('balance_update', handleBalanceUpdate);
            socket.off('room_updated', handleRoomUpdated);
            socket.off('global_typing', handleGlobalTyping);
            socket.off('room_read', handleRoomRead);
        };
    }, [socket, socketVersion, user?.id, queryClient]);

    const onRefresh = useCallback(() => {
        refetchRooms();
        refetchProfile();
    }, [refetchRooms, refetchProfile]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Conversas</span>
                </div>
                <BalanceDisplay 
                    balance={myProfile?.balance ?? 0} 
                    size="sm" 
                    variant="glass" 
                />
            </div>

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
                                    <button
                                        onClick={() => router.push(`/chat/${otherUserId}`)}
                                        className="w-full flex items-center px-4 py-3.5 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <Avatar size={52} uri={room.otherUser?.photoUrl} />
                                        <div className="flex-1 ml-3 min-w-0">
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className={`text-base truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                                    {room.otherUser?.name || room.otherUser?.username || `Usuário ${otherUserId?.substring(0, 8)}`}
                                                </span>
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
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
