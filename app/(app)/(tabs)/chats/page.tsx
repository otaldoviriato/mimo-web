'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, TouchableRipple, PullToRefresh } from '@/components';
import { useChatRooms, useMyProfile, QueryKeys } from '@/hooks/useQueries';
import { useSocket } from '@/hooks/useSocket';
import { CheckCircle2, X, WalletCards, Crown, ShieldAlert, Clock, AlertCircle, ChevronRight, MessageCircle, Trash2 } from 'lucide-react';
import { Drawer } from 'vaul';

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
        isOnline?: boolean;
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
    
    // Controle do banner de progresso de completude do perfil
    const [hideProfileProgress, setHideProfileProgress] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isDismissed = sessionStorage.getItem('mimo_hide_profile_progress_banner') === 'true';
            setHideProfileProgress(isDismissed);
        }
    }, []);

    // Estado de "digitando" por sala: { [roomId]: boolean }
    const [typingRooms, setTypingRooms] = useState<Record<string, boolean>>({});
    // Rastreia os timeouts ativos de digitação por sala para evitar conflitos concorrentes
    const typingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

    // Modal de crédito promocional (gift code)
    const [giftModal, setGiftModal] = useState(false);
    const [giftAmount, setGiftAmount] = useState<number | null>(null);
    const giftClaimedRef = useRef(false);

    // Modal de confirmação de exclusão
    const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Estado para o menu de opções da conversa (Drawer / Bottom Sheet)
    const [selectedRoomIdForMenu, setSelectedRoomIdForMenu] = useState<string | null>(null);

    // Refs para controle de Long Press e Scroll
    const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
    const isLongPressActive = useRef(false);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    const hasMoved = useRef(false);

    // Estado e controle para verificação de identidade
    const prevStatusRef = useRef<string | null | undefined>(undefined);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Resolve a transição pendente assim que a lista de chats é montada
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }
    }, []);

    const { data: rooms = [], isLoading, isRefetching, refetch: refetchRooms } = useChatRooms();
    const { data: myProfile, refetch: refetchProfile } = useMyProfile();

    useEffect(() => {
        if (myProfile && myProfile.isProfessional) {
            const currentStatus = myProfile.professionalStatus;
            // Se o status anterior era 'pending' e mudou para 'approved'
            if (prevStatusRef.current === 'pending' && currentStatus === 'approved') {
                setShowSuccessToast(true);
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                    try {
                        navigator.vibrate([100, 50, 100]);
                    } catch (e) {}
                }
            }
            prevStatusRef.current = currentStatus;
        }
    }, [myProfile]);

    const renderVerificationBanner = () => {
        if (!myProfile || !myProfile.isProfessional) return null;
        
        const status = myProfile.professionalStatus;
        
        if (status === 'approved') return null;

        if (status === 'pending') {
            return (
                <div className="mx-4 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3 md:p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                            <Clock className="w-4.5 h-4.5 animate-pulse" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-amber-900 text-xs md:text-sm">Verificação em análise ⏳</h3>
                            <p className="text-[11px] md:text-xs text-amber-700 mt-1 leading-snug max-w-xl">
                                Suas fotos e documentos foram enviados para análise. A liberação ocorrerá em até 48 horas.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        if (status === 'rejected') {
            return (
                <div className="mx-4 mt-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-3 md:p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                                <AlertCircle className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-red-950 text-xs md:text-sm">Verificação recusada ❌</h3>
                                <p className="text-[11px] md:text-xs text-red-700 mt-1 leading-snug max-w-xl">
                                    {myProfile.notes || 'Infelizmente sua verificação de identidade não foi aprovada. Entre em contato com o suporte para mais informações.'}
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 flex justify-end">
                            <a
                                href="mailto:suporte@mimochat.com.br"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all text-white text-[11px] font-extrabold px-3 py-2 rounded-xl shadow-md shadow-red-600/10 cursor-pointer"
                            >
                                Contatar Suporte
                                <ChevronRight className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    const renderProfileProgressBanner = () => {
        if (!myProfile || !myProfile.isProfessional || myProfile.professionalStatus !== 'approved' || hideProfileProgress) return null;

        const hasPhoto = !!myProfile.photoUrl && myProfile.photoUrl.trim() !== '';
        const hasCover = !!myProfile.coverUrl && myProfile.coverUrl.trim() !== '';
        const hasBio = !!myProfile.bio && myProfile.bio.trim().length >= 10;
        const hasPhotos = (myProfile.publicPhotosCount ?? 0) >= 3;

        let completedSteps = 0;
        if (hasPhoto) completedSteps++;
        if (hasCover) completedSteps++;
        if (hasBio) completedSteps++;
        if (hasPhotos) completedSteps++;

        const completenessPercentage = completedSteps * 25;

        if (completenessPercentage === 100) return null;

        return (
            <div className="mx-4 mt-4 mb-4 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-purple-50/30 border border-purple-100 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 relative">
                <button 
                    onClick={() => {
                        setHideProfileProgress(true);
                        sessionStorage.setItem('mimo_hide_profile_progress_banner', 'true');
                    }}
                    className="absolute top-2.5 right-2.5 p-1 rounded-full text-purple-400 hover:text-purple-600 transition-colors"
                    title="Dispensar"
                >
                    <X size={14} />
                </button>
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 pr-4">
                        <h3 className="font-bold text-purple-900 text-xs md:text-sm">Melhore o seu perfil! 🚀</h3>
                        <p className="text-[10px] md:text-xs text-purple-700 mt-0.5 leading-snug">
                            Seu perfil está <span className="font-extrabold">{completenessPercentage}% completo</span>. Perfis completos ganham destaque e atraem muito mais clientes!
                        </p>
                        
                        {/* Barra de Progresso */}
                        <div className="w-full bg-purple-200/50 h-2 rounded-full mt-3 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${completenessPercentage}%` }}
                            />
                        </div>
                        
                        {/* Requisitos Pendentes */}
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold uppercase tracking-wider text-purple-500/80">
                            {!hasPhoto && <span>• Falta Foto Perfil</span>}
                            {!hasCover && <span>• Falta Capa</span>}
                            {!hasBio && <span>• Falta Bio (min 10)</span>}
                            {!hasPhotos && <span>• Falta Galeria (min 3)</span>}
                        </div>

                        <div className="mt-3.5 flex justify-end">
                            <button
                                onClick={() => router.replace('/profile')}
                                className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl shadow-md shadow-purple-600/10 cursor-pointer"
                            >
                                Completar Agora
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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

        // 2. Exibe "digitando..." por sala na lista
        // O servidor emite global_typing para user:${receiverId} sempre que alguém digita
        const handleGlobalTyping = (data: { roomId: string; userId: string; isTyping: boolean }) => {
            // Limpa qualquer timeout ativo anterior para esta sala (de exibição ou ocultação)
            if (typingTimeouts.current[data.roomId]) {
                clearTimeout(typingTimeouts.current[data.roomId]);
                delete typingTimeouts.current[data.roomId];
            }

            if (data.isTyping) {
                // Mostra "digitando" imediatamente
                setTypingRooms((prev) => ({ ...prev, [data.roomId]: true }));

                // Auto-limpa após 5s como fallback (caso o evento isTyping=false não chegue)
                typingTimeouts.current[data.roomId] = setTimeout(() => {
                    setTypingRooms((prev) => ({ ...prev, [data.roomId]: false }));
                    delete typingTimeouts.current[data.roomId];
                }, 5000);
            } else {
                // Ao parar de digitar, adicionamos um atraso de 2s para ocultar
                // Isso previne que a tela pisque se o usuário parar e recomeçar logo em seguida
                typingTimeouts.current[data.roomId] = setTimeout(() => {
                    setTypingRooms((prev) => ({ ...prev, [data.roomId]: false }));
                    delete typingTimeouts.current[data.roomId];
                }, 2000);
            }
        };

        // 3. Atualiza a bolinha de online/offline nas conversas em tempo real
        const handleUserPresence = (data: { userId: string; isOnline: boolean }) => {
            queryClient.setQueryData(QueryKeys.rooms(user.id), (old: Room[] | undefined) =>
                old?.map((room) =>
                    room.otherUser?.clerkId === data.userId
                        ? { ...room, otherUser: { ...room.otherUser, isOnline: data.isOnline } }
                        : room
                )
            );
        };

        socket.on('balance_update', handleBalanceUpdate);
        socket.on('global_typing', handleGlobalTyping);
        socket.on('user_presence', handleUserPresence);

        return () => {
            socket.off('balance_update', handleBalanceUpdate);
            socket.off('global_typing', handleGlobalTyping);
            socket.off('user_presence', handleUserPresence);

            // Limpa todos os timeouts de typing ativos
            Object.values(typingTimeouts.current).forEach(clearTimeout);
            typingTimeouts.current = {};
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
        const openChat = new URLSearchParams(window.location.search).get('openChat');

        // Se formos abrir um chat virtual por cima, não resgatamos o cupom aqui na lista de conversas.
        // O chat virtual cuidará do resgate.
        if (openChat) return;

        const code = stored || fromUrl;
        if (!code) return;

        // Trava global de sessão do front-end para evitar requisições concorrentes duplicadas
        if (typeof window !== 'undefined') {
            const claims = (window as any).__claimingGiftCodes = (window as any).__claimingGiftCodes || {};
            if (claims[code]) return;
            claims[code] = true;
        }

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
            } else if (typeof window !== 'undefined' && (window as any).__claimingGiftCodes) {
                // Se falhou, libera a trava global para permitir tentativas futuras
                delete (window as any).__claimingGiftCodes[code];
            }
        }).catch(() => {
            if (typeof window !== 'undefined' && (window as any).__claimingGiftCodes) {
                delete (window as any).__claimingGiftCodes[code];
            }
        });
    }, [user?.id, queryClient]);

    // Abre a tela de conversa física usando o roteador de transição
    const handleOpenChat = (userId: string) => {
        router.push(`/chat/${userId}`);
    };

    const handleDeleteRoom = async (roomId: string) => {
        if (!user?.id) return;
        setIsDeleting(true);

        const roomsKey = `mimo_rooms_${user.id}`;
        const pendingKey = `mimo_pending_rooms_${user.id}`;
        
        const filterFn = (r: any) => 
            r._id !== roomId && 
            r.roomId !== roomId && 
            (r.roomId ?? [...r.participants].sort().join('_')) !== roomId;

        // Limpar do localStorage imediatamente para atualizar de forma otimista
        try {
            const cachedRooms = localStorage.getItem(roomsKey);
            if (cachedRooms) {
                localStorage.setItem(roomsKey, JSON.stringify(JSON.parse(cachedRooms).filter(filterFn)));
            }
        } catch (err) {}

        try {
            const cachedPending = localStorage.getItem(pendingKey);
            if (cachedPending) {
                localStorage.setItem(pendingKey, JSON.stringify(JSON.parse(cachedPending).filter(filterFn)));
            }
        } catch (err) {}

        // Atualizar cache local do queryClient de forma imediata e otimista
        queryClient.setQueryData(QueryKeys.rooms(user.id), (old: any[] | undefined) => {
            if (!old) return [];
            return old.filter(filterFn);
        });

        try {
            const response = await fetch(`/api/rooms/${user.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ roomId }),
            });

            // Se for 404 (sala não encontrada no banco, ex: sala virtual pendente), ignoramos e prosseguimos
            if (!response.ok && response.status !== 404) {
                throw new Error('Falha ao excluir conversa');
            }

            socketService.deleteRoom(roomId);
            await queryClient.invalidateQueries({ queryKey: QueryKeys.rooms(user.id) });
            setDeleteConfirmRoomId(null);
        } catch (error) {
            console.error('Erro ao excluir sala:', error);
            alert('Não foi possível excluir a conversa. Tente novamente.');
        } finally {
            setIsDeleting(false);
        }
    };

    const startPress = (roomId: string, clientX: number, clientY: number) => {
        isLongPressActive.current = false;
        hasMoved.current = false;
        touchStartPos.current = { x: clientX, y: clientY };

        longPressTimeout.current = setTimeout(() => {
            if (!hasMoved.current) {
                isLongPressActive.current = true;
                setSelectedRoomIdForMenu(roomId);
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                    try {
                        navigator.vibrate(40);
                    } catch (e) {}
                }
            }
        }, 500);
    };

    const movePress = (clientX: number, clientY: number) => {
        if (!touchStartPos.current) return;
        const dx = Math.abs(clientX - touchStartPos.current.x);
        const dy = Math.abs(clientY - touchStartPos.current.y);

        if (dx > 10 || dy > 10) {
            hasMoved.current = true;
            if (longPressTimeout.current) {
                clearTimeout(longPressTimeout.current);
                longPressTimeout.current = null;
            }
        }
    };

    const endPress = (e: React.MouseEvent | React.TouchEvent) => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
        }

        if (isLongPressActive.current || hasMoved.current) {
            e.preventDefault();
            e.stopPropagation();
        }

        touchStartPos.current = null;
    };

    const handleContextMenu = (e: React.MouseEvent, roomId: string) => {
        e.preventDefault();
        setSelectedRoomIdForMenu(roomId);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try {
                navigator.vibrate(40);
            } catch (err) {}
        }
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
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-8 h-8 object-contain shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Conversas</span>
                </div>
                {myProfile?.isAdmin && (
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center"
                        title="Painel Admin"
                    >
                        <ShieldAlert className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Banner de Verificação de Identidade */}
            {renderVerificationBanner()}

            {/* Banner de Completude do Perfil */}
            {renderProfileProgressBanner()}

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

            {/* Modal de Sucesso na Verificação */}
            {showSuccessToast && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
                    <div
                        className="absolute inset-0 bg-purple-950/45 backdrop-blur-[4px] animate-in fade-in duration-300"
                        onClick={() => setShowSuccessToast(false)}
                    />
                    <div className="relative w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-8 zoom-in-95 duration-500">
                        <div className="relative overflow-hidden rounded-[28px] border border-purple-100 bg-white text-gray-900 shadow-2xl p-6 text-center">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4 animate-bounce">
                                <CheckCircle2 className="w-8 h-8 text-white animate-pulse" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Conta Verificada!</h2>
                            <p className="text-sm text-gray-600 leading-relaxed mb-6">
                                Parabéns! Sua identidade foi validada pelo nosso time. Seu perfil já está público e pronto para receber mensagens e mimos. Hora de faturar! 💸🚀
                            </p>
                            <button
                                onClick={() => setShowSuccessToast(false)}
                                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 hover:from-purple-700 hover:to-fuchsia-700 transition-all active:scale-[0.99]"
                            >
                                Começar a faturar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Drawer de Opções da Conversa */}
            <Drawer.Root open={!!selectedRoomIdForMenu} onOpenChange={(open) => !open && setSelectedRoomIdForMenu(null)}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-[115] bg-slate-950/40 backdrop-blur-[1px]" />
                    <Drawer.Content className="fixed inset-x-0 bottom-0 z-[120] mx-auto flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.15)] outline-none">
                        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 mt-4 shrink-0" />
                        <div className="px-6 pb-8 pt-2">
                            <Drawer.Title className="text-base font-bold text-gray-900 mb-5 text-center">Opções da conversa</Drawer.Title>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        if (selectedRoomIdForMenu) {
                                            setDeleteConfirmRoomId(selectedRoomIdForMenu);
                                            setSelectedRoomIdForMenu(null);
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold rounded-2xl transition-colors text-sm cursor-pointer"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Excluir conversa
                                </button>
                                <button
                                    onClick={() => setSelectedRoomIdForMenu(null)}
                                    className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl transition-colors text-sm cursor-pointer"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Modal de Confirmação de Exclusão */}
            {deleteConfirmRoomId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200"
                        onClick={() => !isDeleting && setDeleteConfirmRoomId(null)}
                    />
                    <div className="relative w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-6 zoom-in-95 duration-300">
                        <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-2xl">
                            <div className="px-6 pt-6 pb-5">
                                <div className="flex items-center gap-3.5 mb-3 text-red-600">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 ring-1 ring-red-100">
                                        <Trash2 size={20} strokeWidth={2.2} />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900 leading-tight">Excluir conversa?</h3>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                                    Essa conversa será ocultada da sua lista de conversas. O histórico de mensagens continuará salvo de forma segura.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={() => setDeleteConfirmRoomId(null)}
                                        className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-semibold py-3 transition-colors active:scale-[0.99] cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={() => deleteConfirmRoomId && handleDeleteRoom(deleteConfirmRoomId)}
                                        className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold py-3 transition-colors shadow-md shadow-red-600/10 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                        {isDeleting ? 'Excluindo...' : 'Excluir'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            <PullToRefresh onRefresh={onRefresh} className="pb-24 md:pb-0">
                {isLoading ? (
                    <ChatListSkeleton />
                ) : rooms.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center animate-in fade-in duration-500">
                        <div className="w-14 h-14 bg-purple-50/60 rounded-2xl flex items-center justify-center mb-4 text-purple-500 shadow-inner">
                            <MessageCircle className="w-6 h-6 text-purple-400" />
                        </div>
                        <h2 className="text-base font-bold text-slate-800 mb-1">Sem conversas ainda</h2>
                        <p className="text-slate-500 text-xs max-w-[240px] leading-relaxed">
                            Suas novas mensagens aparecerão aqui.
                        </p>
                    </div>
                ) : (
                    <ul>
                        {[...rooms]
                            .sort((a, b) => {
                                const timeA = new Date(a.lastMessageTime ?? a.updatedAt).getTime();
                                const timeB = new Date(b.lastMessageTime ?? b.updatedAt).getTime();
                                return timeB - timeA;
                            })
                            .map((room: Room) => {
                            const otherUserId = room.participants.find((p) => p !== user?.id);
                            // roomId como string de clerkIds — corresponde ao que o servidor envia no typing
                            const derivedRoomId = room.roomId ?? room.participants.slice().sort().join('_');
                            const myUnreadCount = user?.id && room.unreadCount ? (room.unreadCount[user.id] || 0) : 0;
                            const hasUnread = myUnreadCount > 0;
                            const isRoomTyping = typingRooms[derivedRoomId] ?? false;

                            const handleItemClick = () => {
                                if (otherUserId) {
                                    handleOpenChat(otherUserId);
                                }
                            };

                            return (
                                <li key={room._id}>
                                    <TouchableRipple
                                        onClick={handleItemClick}
                                        onMouseDown={(e) => startPress(room._id, e.clientX, e.clientY)}
                                        onMouseMove={(e) => movePress(e.clientX, e.clientY)}
                                        onMouseUp={endPress}
                                        onMouseLeave={() => {
                                            if (longPressTimeout.current) {
                                                clearTimeout(longPressTimeout.current);
                                                longPressTimeout.current = null;
                                            }
                                            touchStartPos.current = null;
                                        }}
                                        onTouchStart={(e) => {
                                            const touch = e.touches[0];
                                            if (touch) {
                                                startPress(room._id, touch.clientX, touch.clientY);
                                            }
                                        }}
                                        onTouchMove={(e) => {
                                            const touch = e.touches[0];
                                            if (touch) {
                                                movePress(touch.clientX, touch.clientY);
                                            }
                                        }}
                                        onTouchEnd={endPress}
                                        onContextMenu={(e) => handleContextMenu(e, room._id)}
                                        className="w-full flex items-center px-4 py-3.5 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors text-left select-none"
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar size={52} uri={room.otherUser?.photoUrl} isOnline={room.otherUser?.isOnline} />
                                        </div>
                                        <div className="flex-1 ml-3 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center min-w-0 gap-2">
                                                    <span className={`text-base truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                                        {room.otherUser?.name || room.otherUser?.username || `Usuário ${otherUserId?.substring(0, 8)}`}
                                                    </span>
                                                    {myProfile?.isProfessional && room.otherUser?.isHighSpender && (
                                                        <span title="VIP" className="shrink-0 flex items-center justify-center">
                                                            <Crown className="w-4 h-4 text-amber-500" />
                                                        </span>
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
                                                    <span className={`text-sm truncate flex-1 pr-3 ${
                                                        hasUnread 
                                                            ? 'font-semibold text-gray-950' 
                                                            : room.lastMessage 
                                                                ? 'text-gray-500' 
                                                                : 'text-purple-500 italic font-medium'
                                                    }`}>
                                                        {room.lastMessage || 'Toque para iniciar a conversa! ✨'}
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
            </PullToRefresh>

        </div>
    );
}
