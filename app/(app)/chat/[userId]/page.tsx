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
    timestamp: string;
    isRead?: boolean;
    isLockedImage?: boolean;
    lockedImagePrice?: number;
    originalImageUrl?: string;
    blurredImageUrl?: string;
    isGift?: boolean;
    receiverEarnings?: number;
    status?: 'sending' | 'sent' | 'error';
    tempId?: string;
}

export default function ChatPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId: otherUserId } = use(params);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useUser();
    const { socket, connected, socketService, socketVersion } = useSocket(user?.id);

    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePriceStr, setImagePriceStr] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [giftModalVisible, setGiftModalVisible] = useState(false);
    const [giftAmountStr, setGiftAmountStr] = useState('');
    const [sendingGift, setSendingGift] = useState(false);
    const [attachMenuVisible, setAttachMenuVisible] = useState(false);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const pressTimer = useRef<any>(null);

    const { data: userData } = useMyProfile();
    const { data: receiver } = useUserById(otherUserId);
    const balance = userData?.balance ?? 0;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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

            // Atualiza cache local de rooms
            queryClient.setQueryData(QueryKeys.rooms(user.id!), (old: any) => {
                if (!old) return old;
                return old.map((r: any) => {
                    const rId = r.roomId ?? [...r.participants].sort().join('_');
                    if (rId === roomId) {
                        return { ...r, unreadCount: { ...r.unreadCount, [user.id!]: 0 } };
                    }
                    return r;
                });
            });
        });

        socketService.onNewMessage((data: { message: Message; tempId?: string }) => {
            setMessages((prev) => {
                // Se for uma mensagem que nós enviamos (tem tempId), atualiza a mensagem otimista
                if (data.tempId) {
                    const index = prev.findIndex(m => m.tempId === data.tempId || m._id === data.tempId);
                    if (index !== -1) {
                        const newMessages = [...prev];
                        newMessages[index] = { ...data.message, status: 'sent' as const };
                        return newMessages;
                    }
                }

                // Se a mensagem já existe (evitar duplicatas), não faz nada
                if (prev.find(m => m._id === data.message._id)) return prev;

                const newMessages = [...prev, { ...data.message, status: 'sent' as const }];
                if (data.message.receiverId === user?.id) {
                    socket.emit('mark_as_read', { roomId });

                    // Atualiza cache local de rooms
                    queryClient.setQueryData(QueryKeys.rooms(user.id!), (old: any) => {
                        if (!old) return old;
                        return old.map((r: any) => {
                            const rId = r.roomId ?? [...r.participants].sort().join('_');
                            if (rId === roomId) {
                                return { ...r, unreadCount: { ...r.unreadCount, [user.id!]: 0 } };
                            }
                            return r;
                        });
                    });
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

        socket.on('message_updated', (data: { message: Message }) => {
            setMessages((prev) => prev.map(m => m._id === data.message._id ? data.message : m));
        });

        // Listener para room_read (caso seja marcado como lido de outro lugar)
        socket.on('room_read', (data: { roomId: string; userId: string }) => {
            if (data.roomId === roomId && data.userId === user?.id) {
                queryClient.setQueryData(QueryKeys.rooms(user.id!), (old: any) => {
                    if (!old) return old;
                    return old.map((r: any) => {
                        const rId = r.roomId ?? [...r.participants].sort().join('_');
                        if (rId === roomId) {
                            return { ...r, unreadCount: { ...r.unreadCount, [user.id!]: 0 } };
                        }
                        return r;
                    });
                });
            }
        });

        return () => {
            socketService.leaveRoom(roomId);
            socket.off('room_joined');
            socketService.offNewMessage();
            socket.off('balance_update');
            socket.off('message_error');
            socket.off('user_typing');
            socket.off('messages_read');
            socket.off('message_updated');
            socket.off('room_read');
        };
    }, [socket, socketVersion, roomId, otherUserId]);

    const handleStartPress = (msgId: string) => {
        pressTimer.current = setTimeout(() => {
            setSelectedMessageId(msgId);
        }, 500);
    };

    const handleEndPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    };

    const handleMessageClick = (msgId: string) => {
        if (selectedMessageId) {
            setSelectedMessageId(selectedMessageId === msgId ? null : msgId);
        }
    };

    const handleMessageDoubleClick = (msgId: string) => {
        setSelectedMessageId(msgId);
    };

    const handleSend = () => {
        if (!messageText.trim() || sending || !socket) return;
        
        const tempId = `temp-${Date.now()}`;
        const newMsg: Message = {
            _id: tempId,
            tempId: tempId,
            senderId: user?.id ?? '',
            receiverId: otherUserId,
            content: messageText.trim(),
            charCount: messageText.trim().length,
            cost: estimatedCostInReais * 100, // aproximado
            timestamp: new Date().toISOString(),
            status: 'sending'
        };

        setMessages(prev => [...prev, newMsg]);
        setMessageText('');
        inputRef.current?.focus();
        
        // setSending(true); // Removido para permitir múltiplas mensagens rápidas
        socketService.sendMessage(messageText.trim(), otherUserId, roomId, tempId);
        socket.emit('mark_as_read', { roomId });

        // Atualiza cache local de rooms
        queryClient.setQueryData(QueryKeys.rooms(user?.id ?? ''), (old: any) => {
            if (!old) return old;
            return old.map((r: any) => {
                const rId = r.roomId ?? [...r.participants].sort().join('_');
                if (rId === roomId) {
                    return { ...r, unreadCount: { ...r.unreadCount, [user?.id ?? '']: 0 } };
                }
                return r;
            });
        });
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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setSelectedImage(file);
            // Se for cliente (não cobra por msg), envia direto sem pedir preço
            if (!userData?.chargeMode) {
                // Pequeno delay para o estado do selectedImage atualizar (ou apenas passar o file direto)
                // Mas para manter a consistência com handleSendImage, vamos apenas disparar o envio com preço zero
                setTimeout(() => {
                    handleAutoSendImage(file);
                }, 100);
            }
        }
    };

    const handleAutoSendImage = async (file: File) => {
        if (!file || !user?.id) return;
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('roomId', roomId);
            formData.append('receiverId', otherUserId);
            formData.append('lockedImagePrice', '0');
            
            const res = await fetch('/api/chats/image', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.error || 'Erro ao enviar imagem');
            }
            setSelectedImage(null);
        } catch (e) {
            alert('Erro ao enviar imagem');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSendImage = async () => {
        if (!selectedImage || !router || !user?.id) return;
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('photo', selectedImage);
            formData.append('roomId', roomId);
            formData.append('receiverId', otherUserId);
            formData.append('lockedImagePrice', imagePriceStr || '0');
            
            const res = await fetch('/api/chats/image', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.error || 'Erro ao enviar imagem');
            } else {
                setSelectedImage(null);
                setImagePriceStr('');
            }
        } catch (e) {
            alert('Erro ao enviar imagem');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUnlockImage = async (messageId: string, priceInCents: number) => {
        if (confirm(`Deseja desbloquear esta imagem por R$ ${(priceInCents / 100).toFixed(2)}?`)) {
            if (balance < priceInCents) {
                alert(`Você não tem saldo suficiente. Recarregue sua carteira.`);
                return;
            }
            try {
                const res = await fetch(`/api/chats/message/${messageId}/unlock`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await res.json();
                if (!data.success) {
                    alert(data.error || 'Erro ao desbloquear imagem');
                }
            } catch (e) {
                alert('Erro na requisição');
            }
        }
    };

    const handleSendGift = async () => {
        if (!giftAmountStr || parseFloat(giftAmountStr) <= 0) return;
        setSendingGift(true);
        try {
            const res = await fetch('/api/chats/gift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    receiverId: otherUserId,
                    amount: giftAmountStr
                })
            });
            const data = await res.json();
            if (data.success) {
                setGiftModalVisible(false);
                setGiftAmountStr('');
            } else {
                alert(data.error || 'Erro ao enviar presente');
            }
        } catch (e) {
            alert('Erro de conexão');
        } finally {
            setSendingGift(false);
        }
    };

    const charCount = messageText.length;
    const isSubscriber = receiver?.subscribers?.includes(user?.id ?? '');
    const currentRate = receiver?.isProfessional 
        ? (isSubscriber ? receiver.chargePerCharSubscribers : receiver.chargePerCharNonSubscribers) ?? 0.005
        : 0;

    let estimatedCostInReais = 0;
    if (charCount > 0 && receiver?.isProfessional) {
        const costPerCharInCents = currentRate * 100;
        const rawCostInCents = charCount * costPerCharInCents;
        const totalCostInCents = Math.max(1, Math.ceil(rawCostInCents));
        estimatedCostInReais = totalCostInCents / 100;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 z-20 sticky top-0 shadow-md flex items-center gap-2">
                {selectedMessageId ? (
                    <>
                        <button
                            onClick={() => setSelectedMessageId(null)}
                            className="text-white hover:bg-white/10 transition-colors p-2 -ml-2 rounded-full"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <p className="text-white font-bold">1 selecionada</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setDetailsModalVisible(true)}
                                className="text-white/90 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                                title="Detalhes"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                </svg>
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => router.push('/chats')}
                            className="text-white hover:bg-white/10 transition-colors p-2 -ml-2 rounded-full"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button 
                            onClick={() => otherUserId && router.push(`/user/${otherUserId}`)}
                            className="flex-1 flex items-center gap-2 min-w-0 text-left py-0.5"
                        >
                            <div className="relative shrink-0">
                                <Avatar uri={receiver?.photoUrl} size={34} />
                                {connected && <div className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-purple-600 rounded-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-black text-white truncate tracking-tight">
                                    {receiver?.name || receiver?.username || (otherUserId ? `Usuário ${otherUserId.substring(0, 8)}` : 'Conversa')}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {!connected ? (
                                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Conectando...</span>
                                    ) : isTyping ? (
                                        <span className="text-[10px] text-white font-black animate-pulse uppercase tracking-widest">Digitando...</span>
                                    ) : (
                                        <span className="text-[10px] text-white/60 font-medium truncate uppercase tracking-tighter">
                                            {receiver?.username ? `@${receiver.username}` : 'Ver perfil'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>

                        <div className="flex items-center gap-2">
                            {!connected && (
                                <svg className="animate-spin h-4 w-4 text-white/60" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            )}
                            <BalanceDisplay balance={balance} size="sm" variant="transparent" clickable={true} />

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
                    </>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col-reverse gap-1">
                <div ref={messagesEndRef} />
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
                {[...messages].reverse().map((item) => {
                    const isMine = item.senderId === user?.id;
                    const isLocked = item.isLockedImage;
                    return (
                        <div
                            key={item._id}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 transition-colors duration-300 ${selectedMessageId === item._id ? 'bg-purple-100/50 -mx-4 px-4 py-0.5' : ''}`}
                            onMouseDown={() => handleStartPress(item._id)}
                            onMouseUp={handleEndPress}
                            onMouseLeave={handleEndPress}
                            onTouchStart={() => handleStartPress(item._id)}
                            onTouchEnd={handleEndPress}
                            onDoubleClick={() => handleMessageDoubleClick(item._id)}
                            onClick={() => handleMessageClick(item._id)}
                        >
                            {item.isGift ? (
                                <div
                                    className={`max-w-[85%] rounded-[2rem] overflow-hidden shadow-md border-2 ${
                                        isMine 
                                            ? 'bg-purple-600 border-purple-500 rounded-br-none' 
                                            : 'bg-white border-purple-50 border-2 rounded-bl-none'
                                    }`}
                                >
                                    <div className="px-6 py-6 flex flex-col items-center gap-4">
                                        <div className="relative group">
                                            <div className={`absolute inset-0 blur-2xl opacity-20 ${isMine ? 'bg-white' : 'bg-purple-600'}`} />
                                            <img 
                                                src="/assets/gift.png" 
                                                alt="Gift" 
                                                className="w-24 h-24 object-contain relative drop-shadow-xl animate-bounce" 
                                                style={{ animationDuration: '4s' }} 
                                            />
                                        </div>
                                        
                                        <div className="text-center">
                                            <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${isMine ? 'text-purple-200' : 'text-purple-500'}`}>
                                                {isMine ? 'Mimo Enviado' : 'Você recebeu um presente'}
                                            </p>
                                            <p className={`text-4xl font-black tracking-tight ${isMine ? 'text-white' : 'text-gray-900'}`}>
                                                R$ {(item.cost / 100).toFixed(2)}
                                            </p>
                                        </div>

                                        {!isMine && (
                                            <div className="mt-2 px-4 py-1.5 bg-green-500/10 rounded-full border border-green-500/20 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                                                    Saldo Adicionado
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`px-5 py-3 flex items-end justify-between gap-4 ${isMine ? 'bg-purple-700/40' : 'bg-gray-50/50'}`}>
                                        <div className="flex-1" />
                                        <div className="flex items-center gap-2 mb-[-1px]">
                                            <span className={`text-[10px] font-medium ${isMine ? 'text-purple-200/70' : 'text-gray-400'}`}>
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
                                                <span className={`text-[11px] ${item.isRead ? 'text-blue-300' : (item.status === 'sending' ? 'text-purple-300 animate-pulse' : 'text-purple-300')}`}>
                                                    {item.status === 'sending' ? (
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                                        </svg>
                                                    ) : (
                                                        item.isRead ? (
                                                            <div className="inline-flex items-center">
                                                                <span className="relative">✓</span>
                                                                <span className="relative -ml-1.5">✓</span>
                                                            </div>
                                                        ) : '✓'
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`max-w-[75%] ${isLocked || item.originalImageUrl ? 'p-1 bg-transparent' : 'px-3 py-1.5'} rounded-2xl ${
                                        (!isLocked && !item.originalImageUrl) 
                                            ? (isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white text-gray-900 shadow-sm rounded-bl-sm')
                                            : (isMine ? 'rounded-br-sm' : 'rounded-bl-sm')
                                        }`}
                                >
                                    {isLocked || item.originalImageUrl ? (
                                        <>
                                            {isLocked ? (
                                                <div className="relative rounded-2xl overflow-hidden cursor-pointer bg-gray-200 shadow-sm" onClick={() => !isMine && handleUnlockImage(item._id, item.lockedImagePrice || 0)}>
                                                    <img src={isMine ? item.originalImageUrl : item.blurredImageUrl} className="w-full h-auto object-cover max-h-[300px]" alt="Locked Image" />
                                                    {!isMine ? (
                                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center flex-col">
                                                            <div className="bg-white/20 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/30 shadow-xl text-center font-semibold text-white transition-transform hover:scale-105 active:scale-95">
                                                                🔓 Desbloquear<br/><span className="text-xl">R$ {((item.lockedImagePrice || 0) / 100).toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="absolute top-3 right-3">
                                                            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-lg">
                                                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Aguardando compra</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
                                                    <img src={item.originalImageUrl} className="w-full h-auto object-cover max-h-[300px]" alt="Image" />
                                                    {isMine && item.lockedImagePrice! > 0 && (
                                                        <div className="absolute top-3 right-3">
                                                            <div className="bg-green-500/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-1.5 shadow-lg animate-in fade-in zoom-in duration-300">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
                                                                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Foto aberta</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex items-end justify-between mt-1.5 gap-3 px-2 pb-2">
                                                <div className="flex-1 min-w-0" />
                                                <div className="flex items-center gap-1.5 mb-[-1px]">
                                                    <span className={`text-[10px] font-medium ${isMine ? 'text-gray-500' : 'text-gray-400'}`}>
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
                                                        <span className={`text-[11px] ${item.isRead ? 'text-blue-300' : (item.status === 'sending' ? 'text-purple-300 animate-pulse' : 'text-purple-300/80')}`}>
                                                            {item.status === 'sending' ? (
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                                                </svg>
                                                            ) : (
                                                                item.isRead ? (
                                                                    <div className="inline-flex items-center">
                                                                        <span className="relative">✓</span>
                                                                        <span className="relative -ml-1.5">✓</span>
                                                                    </div>
                                                                ) : '✓'
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="relative">
                                            <span className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                {item.content}
                                            </span>
                                            <div className="inline-flex items-center gap-1.5 float-right mt-2 ml-2 mb-[-2px]">
                                                <span className={`text-[10px] font-medium ${isMine ? 'text-purple-200/70' : 'text-gray-400'}`}>
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
                                                    <span className={`text-[11px] ${item.isRead ? 'text-blue-300' : (item.status === 'sending' ? 'text-purple-300 animate-pulse' : 'text-purple-300/80')}`}>
                                                        {item.status === 'sending' ? (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                                            </svg>
                                                        ) : (
                                                            item.isRead ? (
                                                                <div className="inline-flex items-center">
                                                                    <span className="relative">✓</span>
                                                                    <span className="relative -ml-1.5">✓</span>
                                                                </div>
                                                            ) : '✓'
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="clear-both" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Input area */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
                {estimatedCostInReais > 0 && (
                    <p className="text-[10px] text-gray-400 text-center mb-2">
                        {isSubscriber ? '💎 Tarifa Assinante' : '🌍 Tarifa Público'}: R$ {estimatedCostInReais.toFixed(2)} ({charCount} chars)
                    </p>
                )}
                <div className="flex items-end gap-3">
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setAttachMenuVisible(!attachMenuVisible)}
                            disabled={!connected}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                                attachMenuVisible ? 'bg-purple-600 text-white rotate-45' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {attachMenuVisible && (
                            <>
                                <div 
                                    className="fixed inset-0 z-20" 
                                    onClick={() => setAttachMenuVisible(false)} 
                                />
                                <div className="absolute bottom-14 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 w-48 overflow-hidden z-30 animate-in slide-in-from-bottom-2 duration-200">
                                    <button
                                        onClick={() => {
                                            setAttachMenuVisible(false);
                                            fileInputRef.current?.click();
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                <path d="M4 16L8.586 11.414C8.96106 11.0391 9.46967 10.8284 10 10.8284C10.5303 10.8284 11.0389 11.0391 11.414 11.414L16 16M14 14L15.586 12.414C15.9611 12.0391 16.4697 11.8284 17 11.8284C17.5303 11.8284 18.0389 12.0391 18.414 12.414L20 14M14 8H14.01M6 20H18C18.5304 20 19.0391 19.7893 19.4142 19.4142C19.7893 19.0391 20 18.5304 20 18V6C20 5.46957 19.7893 4.96086 19.4142 4.58579C19.0391 4.21071 18.5304 4 18 4H6C5.46957 4 4.96086 4.21071 4.58579 4.58579C4.21071 4.96086 4 5.46957 4 6V18C4 18.5304 4.21071 19.0391 4.58579 19.4142C4.96086 19.7893 5.304 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Enviar Foto</p>
                                            <p className="text-[10px] text-gray-500">Galeria ou Câmera</p>
                                        </div>
                                    </button>
                                    {!userData?.isProfessional && (
                                        <button
                                            onClick={() => {
                                                setAttachMenuVisible(false);
                                                setGiftModalVisible(true);
                                            }}
                                            className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                                    <path d="M20 12V22H4V12M2 7H22V12H2V7ZM12 22V7M12 7C12 7 9.5 3 6.5 3C3.5 3 3.5 7 6.5 7H12ZM12 7H17.5C20.5 7 20.5 3 17.5 3C14.5 3 12 7 12 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">Enviar Mimo</p>
                                                <p className="text-[10px] text-gray-500">Presente em dinheiro</p>
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} />

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
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${messageText.trim() && connected
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

            {selectedImage && userData?.isProfessional && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm flex flex-col items-center shadow-2xl">
                        <h3 className="font-bold text-xl text-gray-900 mb-4 tracking-tight">Valor da foto</h3>
                        <div className="w-full relative rounded-2xl overflow-hidden mb-6 aspect-square bg-gray-100">
                            <img src={URL.createObjectURL(selectedImage)} className="w-full h-full object-cover" />
                        </div>
                        <div className="w-full relative mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                            <input type="number" step="0.01" className="bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-10 w-full text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" placeholder="0.00" value={imagePriceStr} onChange={e => setImagePriceStr(e.target.value)} />
                        </div>
                        <div className="flex gap-3 w-full">
                            <button className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-colors" onClick={() => setSelectedImage(null)}>Cancelar</button>
                            <button disabled={uploadingImage} className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold flex justify-center items-center transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50" onClick={handleSendImage}>
                                {uploadingImage ? (
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : "Enviar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {giftModalVisible && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm flex flex-col items-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500" />
                        <h3 className="font-bold text-xl text-gray-900 mb-4 tracking-tight">Enviar Presente 🎁</h3>
                        <div className="w-full relative rounded-2xl overflow-hidden mb-6 aspect-square bg-purple-50 flex items-center justify-center">
                            <img src="/assets/gift.png" className="w-40 h-40 object-contain animate-bounce" style={{ animationDuration: '3s' }} />
                        </div>
                        <div className="w-full relative mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                            <input type="number" step="0.01" className="bg-gray-50 border border-gray-100 rounded-2xl p-4 pl-10 w-full text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" placeholder="Valor" value={giftAmountStr} onChange={e => setGiftAmountStr(e.target.value)} />
                        </div>
                        <div className="flex gap-3 w-full">
                            <button className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-colors" onClick={() => setGiftModalVisible(false)}>Agora não</button>
                            <button disabled={sendingGift || !giftAmountStr} className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold flex justify-center items-center transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50" onClick={handleSendGift}>
                                {sendingGift ? (
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : "Mimar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detailsModalVisible && selectedMessageId && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm" onClick={() => setDetailsModalVisible(false)}>
                    <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-8 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                        
                        <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Detalhes da Mensagem</h3>
                        
                        {(() => {
                            const msg = messages.find(m => m._id === selectedMessageId);
                            if (!msg) return null;
                            const isMine = msg.senderId === user?.id;
                            const date = new Date(msg.timestamp);
                            
                            return (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data</p>
                                            <p className="font-bold text-gray-900">{date.toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Horário</p>
                                            <p className="font-bold text-gray-900">{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                                        </div>
                                    </div>

                                    <div className="bg-purple-50 p-5 rounded-[2rem] border border-purple-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">
                                                {isMine ? 'Seu Investimento' : 'Seu Ganho'}
                                            </p>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isMine ? 'bg-purple-200 text-purple-700' : 'bg-green-200 text-green-700'}`}>
                                                {isMine ? 'Débito' : 'Crédito'}
                                            </div>
                                        </div>
                                        <p className="text-4xl font-black text-gray-900 tracking-tight">
                                            R$ {((isMine ? msg.cost : (msg.receiverEarnings ?? msg.cost * 0.9)) / 100).toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-2 font-medium">
                                            {msg.charCount} caracteres enviados
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                                            <span className="text-gray-500">Status</span>
                                            <span className="font-bold text-gray-900">{msg.isRead ? 'Visualizada' : 'Entregue'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                                            <span className="text-gray-500">ID da Mensagem</span>
                                            <span className="text-[10px] font-mono text-gray-400">{msg._id}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setDetailsModalVisible(false)}
                                        className="w-full h-14 bg-gray-900 text-white rounded-2xl font-bold mt-4 hover:bg-gray-800 transition-colors"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
