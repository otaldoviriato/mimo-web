'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
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

    // Modal de presente (gift code)
    const [giftModal, setGiftModal] = useState(false);
    const giftClaimedRef = useRef(false);

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
                        const match = data.mongoRoomId
                            ? room._id === data.mongoRoomId
                            : room.participants.includes(data.senderId);
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
                setGiftModal(true);
                queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            }
        }).catch(() => {});
    }, [user?.id, queryClient]);

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

            {/* Modal de presente */}
            {giftModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
                    <div
                        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setGiftModal(false)}
                    />
                    <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-10 zoom-in-95 duration-500">
                        <div className="relative bg-gradient-to-b from-purple-700 via-purple-600 to-purple-800 rounded-3xl overflow-hidden shadow-2xl border border-purple-400/30">

                            {/* Estrelas decorativas */}
                            <span className="absolute top-5 left-7 text-yellow-300 text-xl animate-spin pointer-events-none" style={{ animationDuration: '4s' }}>✦</span>
                            <span className="absolute top-8 left-16 text-white/30 text-sm animate-pulse pointer-events-none">★</span>
                            <span className="absolute top-4 right-8 text-yellow-200 text-lg animate-spin pointer-events-none" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>✦</span>
                            <span className="absolute top-10 right-20 text-white/40 text-xs animate-pulse pointer-events-none" style={{ animationDelay: '500ms' }}>✦</span>
                            <span className="absolute bottom-24 left-5 text-yellow-300/50 text-sm animate-ping pointer-events-none" style={{ animationDuration: '2s' }}>★</span>
                            <span className="absolute bottom-28 right-6 text-white/30 text-xs animate-ping pointer-events-none" style={{ animationDuration: '2.5s', animationDelay: '700ms' }}>✦</span>

                            <div className="px-8 pt-10 pb-8 text-center">
                                {/* Ícone de presente com bounce */}
                                <div className="mb-1">
                                    <span
                                        className="text-[72px] inline-block animate-bounce"
                                        style={{ animationDuration: '1.2s', filter: 'drop-shadow(0 0 20px rgba(250,204,21,0.6))' }}
                                    >
                                        🎁
                                    </span>
                                </div>

                                {/* Linha de estrelas animadas */}
                                <div className="flex justify-center items-center gap-3 mb-5 text-yellow-300">
                                    <span className="animate-ping text-xs" style={{ animationDuration: '1.5s' }}>✦</span>
                                    <span className="animate-bounce text-base" style={{ animationDuration: '1s', animationDelay: '200ms' }}>★</span>
                                    <span className="animate-ping text-xs" style={{ animationDuration: '1.5s', animationDelay: '400ms' }}>✦</span>
                                </div>

                                {/* Título */}
                                <h2 className="text-white text-[26px] font-black leading-tight mb-1">Você ganhou!</h2>
                                <p className="text-purple-200 text-sm mb-6 leading-relaxed">Um presente especial está esperando por você 🎉</p>

                                {/* Card de valor */}
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-5 mb-6 border border-white/20 shadow-inner">
                                    <p className="text-purple-300 text-[10px] font-bold uppercase tracking-widest mb-1.5">Crédito adicionado ao seu saldo</p>
                                    <p className="text-yellow-300 font-black tracking-tight leading-none" style={{ fontSize: '56px', textShadow: '0 0 30px rgba(250,204,21,0.5)' }}>
                                        R$50
                                    </p>
                                    <p className="text-white/60 text-xs mt-1.5">para gastar como quiser no MimoChat</p>
                                </div>

                                {/* Descrição */}
                                <p className="text-purple-200 text-sm mb-7 leading-relaxed px-2">
                                    Seu saldo já foi creditado e está disponível para você usar agora mesmo!
                                </p>

                                {/* Botão CTA */}
                                <button
                                    onClick={() => setGiftModal(false)}
                                    className="w-full bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-gray-900 font-black text-base py-4 rounded-2xl shadow-lg hover:shadow-yellow-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                >
                                    Aproveitar agora! 🎉
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
