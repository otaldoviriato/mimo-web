'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { useSocket } from '@/hooks/useSocket';
import { useUserById, useMyProfile, QueryKeys } from '@/hooks/useQueries';

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    charCount: number;
    cost: number;
    receiverEarnings?: number;
    timestamp: string;
    isRead?: boolean;
}

export default function ChatPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId: otherUserId } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useUser();
    const { socket, connected, socketService } = useSocket(user?.id);

    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const { data: userData } = useMyProfile();
    const { data: receiver } = useUserById(otherUserId);
    const balance = userData?.balance ?? 0;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<any>(null);

    const roomId = [user?.id, otherUserId].sort().join('_');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!socket || !user?.id) return;

        socketService.joinRoom(user.id, otherUserId);

        socket.on('room_joined', (data: { messages: Message[] }) => {
            setMessages([...data.messages]);
            socket.emit('mark_as_read', { roomId });
        });

        socketService.onNewMessage((data: { message: Message }) => {
            setMessages((prev) => {
                const newMessages = [...prev, data.message];
                if (data.message.receiverId === user?.id) {
                    socket.emit('mark_as_read', { roomId });
                }
                return newMessages;
            });
        });

        socket.on('balance_update', (data: { balance: number }) => {
            queryClient.setQueryData(QueryKeys.me, (old: any) =>
                old ? { ...old, balance: data.balance } : old
            );
        });

        socket.on('message_error', (data: { error: string }) => {
            alert(data.error);
            setSending(false);
        });

        socket.on('user_typing', (data: { isTyping: boolean }) => {
            setIsTyping(data.isTyping);
        });

        socket.on('messages_read', (data: { roomId: string; readBy: string }) => {
            if (data.roomId === roomId) {
                setMessages((prev) => prev.map((msg) => {
                    if (msg.senderId === user?.id && data.readBy !== user?.id) {
                        return { ...msg, isRead: true };
                    }
                    return msg;
                }));
            }
        });

        return () => {
            socket.off('room_joined');
            socketService.offNewMessage();
            socket.off('balance_update');
            socket.off('message_error');
            socket.off('user_typing');
            socket.off('messages_read');
        };
    }, [socket, roomId, otherUserId]);

    const handleSend = () => {
        if (!messageText.trim() || sending || !socket) return;
        setSending(true);
        socketService.sendMessage(messageText.trim(), otherUserId, roomId);
        socket.emit('mark_as_read', { roomId });
        setMessageText('');
        setSending(false);
        inputRef.current?.focus();
    };

    const handleTyping = (text: string) => {
        setMessageText(text);
        if (socket) {
            socket.emit('typing', { roomId, isTyping: true, receiverId: otherUserId });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing', { roomId, isTyping: false, receiverId: otherUserId });
            }, 1000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const charCount = messageText.length;
    const chargePerChar = receiver?.chargeMode ? (receiver.chargePerChar ?? 0.002) : 0;
    let estimatedCostInReais = 0;
    if (charCount > 0 && receiver?.chargeMode) {
        const costPerCharInCents = chargePerChar * 100;
        const rawCostInCents = charCount * costPerCharInCents;
        const totalCostInCents = Math.max(1, Math.ceil(rawCostInCents));
        estimatedCostInReais = totalCostInCents / 100;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
                <button
                    onClick={() => router.push('/chats')}
                    className="text-white/80 hover:text-white transition-colors p-1 -ml-1"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                <Avatar uri={receiver?.photoUrl} size={36} />

                <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white truncate">
                        {receiver?.name || receiver?.username || 'Conversa'}
                    </p>
                    {!connected && (
                        <p className="text-xs text-white/60">Conectando...</p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!connected && (
                        <svg className="animate-spin h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    <BalanceDisplay balance={balance} size="sm" variant="transparent" clickable={false} />

                    <div className="relative">
                        <button
                            onClick={() => setMenuVisible(!menuVisible)}
                            className="text-white/80 hover:text-white p-1 transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="12" cy="19" r="1.5" />
                            </svg>
                        </button>

                        {menuVisible && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenuVisible(false)} />
                                <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 w-44 z-20 overflow-hidden">
                                    <button
                                        onClick={() => setMenuVisible(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                            <path d="M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="2" />
                                        </svg>
                                        Bloquear
                                    </button>
                                    <div className="border-t border-gray-100" />
                                    <button
                                        onClick={() => setMenuVisible(false)}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 3l18 18M11.05 4.05C5.5 4.56 1 9.4 1 15.22V17h2c0-4.43 3.06-8.14 7.18-9.14M17.77 6.23a10.1 10.1 0 0 1 4.23 8v1.74h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        Denunciar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
                {messages.map((item) => {
                    const isMine = item.senderId === user?.id;
                    return (
                        <div
                            key={item._id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] px-4 py-3 rounded-2xl ${isMine
                                    ? 'bg-purple-600 text-white rounded-br-sm'
                                    : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                <div className="flex items-center justify-between mt-1 gap-2">
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs ${isMine ? 'text-purple-200' : 'text-gray-400'}`}>
                                            {(() => {
                                                try {
                                                    return new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    });
                                                } catch { return ''; }
                                            })()}
                                        </span>
                                        {isMine && (
                                            <span className={`text-xs ${item.isRead ? 'text-blue-300' : 'text-purple-300'}`}>
                                                {item.isRead ? '✓✓' : '✓'}
                                            </span>
                                        )}
                                    </div>
                                    {item.cost > 0 && (
                                        <span className={`text-xs font-medium ${isMine ? 'text-purple-200' : 'text-green-500'}`}>
                                            {(() => {
                                                const isNewSystem = item.cost >= 1;
                                                const formattedCost = isNewSystem ? item.cost / 100 : item.cost;
                                                const formattedEarnings = isNewSystem
                                                    ? (item.receiverEarnings ?? item.cost * 0.9) / 100
                                                    : (item.receiverEarnings ?? item.cost * 0.9);
                                                return isMine ? `-R$ ${formattedCost.toFixed(2)}` : `+R$ ${formattedEarnings.toFixed(2)}`;
                                            })()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
                {estimatedCostInReais > 0 && (
                    <p className="text-xs text-gray-400 text-center mb-2">
                        Custo estimado: R$ {estimatedCostInReais.toFixed(2)} ({charCount} caracteres)
                    </p>
                )}
                <div className="flex items-end gap-3">
                    <div className="flex-1 flex items-end bg-gray-100 rounded-2xl px-4 py-2 min-h-[44px] max-h-[120px]">
                        <textarea
                            ref={inputRef}
                            value={messageText}
                            onChange={(e) => handleTyping(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite sua mensagem..."
                            rows={1}
                            maxLength={500}
                            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none leading-5 py-1"
                            style={{ maxHeight: '96px' }}
                            onInput={(e) => {
                                const el = e.currentTarget;
                                el.style.height = 'auto';
                                el.style.height = Math.min(el.scrollHeight, 96) + 'px';
                            }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!messageText.trim() || !connected}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${messageText.trim() && connected
                            ? 'bg-purple-600 hover:bg-purple-700 shadow-sm'
                            : 'bg-gray-200'
                            }`}
                    >
                        {sending ? (
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={messageText.trim() && connected ? 'text-white' : 'text-gray-400'}>
                                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
