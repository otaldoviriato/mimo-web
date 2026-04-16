'use client';

import React, { useEffect, useCallback } from 'react';
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

export default function ChatsPage() {
    const router = useRouter();
    const { user } = useUser();
    const queryClient = useQueryClient();
    const { socket } = useSocket(user?.id);

    const { data: rooms = [], isRefetching, refetch: refetchRooms } = useChatRooms();
    const { refetch: refetchProfile } = useMyProfile();

    // Atualiza saldo em tempo real via socket
    useEffect(() => {
        if (!socket) return;
        socket.on('balance_update', (data: { balance: number }) => {
            queryClient.setQueryData(QueryKeys.me, (old: any) =>
                old ? { ...old, balance: data.balance } : old
            );
        });
        return () => { socket.off('balance_update'); };
    }, [socket, queryClient]);

    const onRefresh = useCallback(() => {
        refetchRooms();
        refetchProfile();
    }, [refetchRooms, refetchProfile]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-4 flex items-center justify-between shrink-0">
                <h1 className="text-xl font-bold text-white">Conversas</h1>
                <div className="flex items-center gap-3">
                    {isRefetching && (
                        <svg className="animate-spin h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    <button onClick={onRefresh} className="text-white/80 hover:text-white transition-colors p-1">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
                {rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                        <span className="text-6xl mb-4">💬</span>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma conversa ainda</h2>
                        <p className="text-gray-500 text-sm">
                            Use a busca para encontrar usuários e começar a conversar
                        </p>
                    </div>
                ) : (
                    <ul>
                        {rooms.map((room: Room) => {
                            const otherUserId = room.participants.find((p) => p !== user?.id);
                            const myUnreadCount = user?.id && room.unreadCount ? (room.unreadCount[user.id] || 0) : 0;
                            const hasUnread = myUnreadCount > 0;

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
                                                <span className={`text-sm truncate flex-1 pr-3 ${hasUnread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                                    {room.lastMessage || 'Nenhuma mensagem ainda'}
                                                </span>
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
