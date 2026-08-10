'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, use } from 'react';
import axios from 'axios';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useUser } from '@clerk/nextjs';
import { Avatar } from '@/components/Avatar';
import { useUserById, useUserByUsername } from '@/hooks/useQueries';
import {
    ShieldCheck,
    ArrowLeft,
    MessageSquare,
    Calendar,
    Gift,
    Image as ImageIcon,
    ExternalLink,
    Clock,
    ChevronLeft,
    ChevronRight,
    X,
    Play,
    ChevronDown
} from 'lucide-react';

function isClerkUserId(value: string) {
    return value.startsWith('user_');
}

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    charCount: number;
    cost: number;
    timestamp: string;
    isLockedImage?: boolean;
    originalImageUrl?: string;
    isVideo?: boolean;
    videoUrl?: string;
    thumbnailUrl?: string;
    isGift?: boolean;
    isTemporary?: boolean;
    expiresAt?: string | Date;
    isExpired?: boolean;
}

interface MediaItem {
    id?: string;
    url: string;
    thumbnailUrl?: string;
    isVideo?: boolean;
    messageId?: string;
    isTemporary?: boolean;
    expiresAt?: string | Date;
}

interface ChatInfoPageProps {
    params?: Promise<{ userId: string }>;
    userId?: string;
}

const INITIAL_BATCH_SIZE = 12;
const BATCH_INCREMENT = 9;

function LazyMediaThumbnail({
    item,
    onClick
}: {
    item: MediaItem;
    onClick: () => void;
}) {
    const [loaded, setLoaded] = useState(false);

    return (
        <div
            onClick={onClick}
            className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-100 shadow-xs active:scale-[0.97] transition-all transform duration-150"
        >
            {!loaded && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-300" />
                </div>
            )}

            {item.isVideo ? (
                <video
                    src={item.url}
                    onLoadedData={() => setLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    muted
                    playsInline
                />
            ) : (
                <img
                    src={item.thumbnailUrl || item.url}
                    alt="Mídia da conversa"
                    loading="lazy"
                    onLoad={() => setLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                />
            )}

            {item.isVideo && (
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-white transition-opacity group-hover:bg-black/35">
                    <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ChatInfoPage({ params, userId: propUserId }: ChatInfoPageProps) {
    const resolvedParams = params ? use(params) : null;
    const otherUserId = propUserId || resolvedParams?.userId || '';
    const isRouteClerkId = isClerkUserId(otherUserId);
    const router = useTransitionRouter();
    const { user } = useUser();
    const { data: receiverById, isLoading: loadingReceiverById } = useUserById(isRouteClerkId ? otherUserId : undefined);
    const { data: receiverByUsername, isLoading: loadingReceiverByUsername } = useUserByUsername(isRouteClerkId ? undefined : otherUserId);
    const receiver = receiverById || receiverByUsername;

    const [messages, setMessages] = useState<Message[]>([]);
    const [historicalMedia, setHistoricalMedia] = useState<MediaItem[]>([]);

    const targetClerkId = receiver?.clerkId || (isClerkUserId(otherUserId) ? otherUserId : null);
    const isResolvingReceiver = isRouteClerkId ? loadingReceiverById : loadingReceiverByUsername;

    // Carrega mensagens e mídias da conversa
    useEffect(() => {
        if (typeof window !== 'undefined' && user?.id && targetClerkId) {
            const currentRoomId = [user.id, targetClerkId].sort().join('_');
            const keysToTry = [
                `mimo_messages_${currentRoomId}`,
                `mimo_messages_${[user.id, otherUserId].sort().join('_')}`
            ];

            for (const key of keysToTry) {
                const cached = localStorage.getItem(key);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setMessages(parsed);
                            break;
                        }
                    } catch (e) {
                        console.error('Erro ao ler mensagens do cache:', e);
                    }
                }
            }

            axios.get(`/api/rooms/${user.id}/media`, { params: { roomId: currentRoomId } })
                .then(res => {
                    if (Array.isArray(res.data)) {
                        setHistoricalMedia(res.data);
                    }
                })
                .catch(() => {
                    // Ignora silenciosamente, exibirá mídias do cache local se houver
                });
        }
    }, [user?.id, otherUserId, targetClerkId]);

    // Mídias trocadas válidas e não expiradas
    const mediaItems = useMemo(() => {
        const now = new Date();
        
        // 1. Mídias históricas válidas
        const validHistorical = historicalMedia.filter(item => {
            if (item.isTemporary && item.expiresAt) {
                const expiresTime = new Date(item.expiresAt).getTime();
                if (expiresTime > 0 && expiresTime < now.getTime()) {
                    return false;
                }
            }
            return true;
        });

        // 2. Mídias locais das mensagens do chat
        const localMedias = messages
            .filter(m => {
                if (m.isLockedImage) return false;
                if (m.isExpired) return false;
                if (m.isTemporary && m.expiresAt) {
                    const expiresTime = new Date(m.expiresAt).getTime();
                    if (expiresTime > 0 && expiresTime < now.getTime()) {
                        return false;
                    }
                }
                return m.originalImageUrl || (m.isVideo && m.videoUrl);
            })
            .map(m => ({
                id: m._id,
                url: m.isVideo ? m.videoUrl! : m.originalImageUrl!,
                thumbnailUrl: m.isVideo ? m.thumbnailUrl : m.originalImageUrl,
                isVideo: !!m.isVideo,
                isTemporary: m.isTemporary,
                expiresAt: m.expiresAt,
            }));

        const loadedUrls = new Set(validHistorical.map(item => item.url));
        const newLocalMedias = localMedias.filter(item => !loadedUrls.has(item.url));

        return [...validHistorical, ...newLocalMedias];
    }, [historicalMedia, messages]);

    // Paginação e carregamento progressivo de mídias
    const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
    const [hasExpanded, setHasExpanded] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    const handleLoadMore = () => {
        setHasExpanded(true);
        setVisibleCount(prev => Math.min(prev + BATCH_INCREMENT, mediaItems.length));
    };

    // Scroll Infinito após expandir / clicar em "Ver mais"
    useEffect(() => {
        if (!hasExpanded || visibleCount >= mediaItems.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount(prev => Math.min(prev + BATCH_INCREMENT, mediaItems.length));
                }
            },
            { threshold: 0.2 }
        );

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) observer.unobserve(currentSentinel);
        };
    }, [hasExpanded, visibleCount, mediaItems.length]);

    // Estado do Modal de Mídia em Tela Cheia
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [showControls, setShowControls] = useState(true);

    const activeMedia = selectedIndex !== null ? mediaItems[selectedIndex] : null;

    const handlePrev = useCallback(() => {
        if (selectedIndex === null) return;
        setSelectedIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, [selectedIndex]);

    const handleNext = useCallback(() => {
        if (selectedIndex === null) return;
        setSelectedIndex(prev => (prev !== null && prev < mediaItems.length - 1 ? prev + 1 : prev));
    }, [selectedIndex, mediaItems.length]);

    // Suporte a teclado no modal (setas esquerda/direita e Escape)
    useEffect(() => {
        if (selectedIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === 'Escape') {
                setSelectedIndex(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, handlePrev, handleNext]);

    // Manipulação de Gestos Swipe no Modal em Tela Cheia
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return;

        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;

        // Se for um gesto horizontal claro
        if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
            if (deltaX > 0) {
                handlePrev();
            } else {
                handleNext();
            }
        } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            // Toque rápido no meio da mídia -> alterna visibilidade das setas e barras
            setShowControls(prev => !prev);
        }

        touchStartX.current = null;
        touchStartY.current = null;
    };

    // Estatísticas da conversa
    const totalMessages = messages.length;
    const firstMessage = messages.length > 0 ? messages[0] : null;
    const firstMessageDate = firstMessage ? new Date(firstMessage.timestamp) : null;
    
    const formattedStartDate = firstMessageDate
        ? firstMessageDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Início recente';

    const daysTogether = firstMessageDate
        ? Math.max(1, Math.floor((Date.now() - firstMessageDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

    const giftsExchanged = messages.filter(m => m.isGift);
    const totalGiftsCount = giftsExchanged.length;

    if (!receiver && isResolvingReceiver) {
        return (
            <div className="h-screen w-full overflow-y-auto bg-slate-50 text-slate-900">
                <div className="sticky top-0 z-30 bg-purple-600 text-white px-4 py-3.5 flex items-center gap-3 shadow-md">
                    <button
                        onClick={() => router.back()}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight">Informações da Conversa</h1>
                </div>
                <div className="max-w-xl mx-auto px-4 pt-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-slate-100 animate-pulse mb-4" />
                        <div className="h-5 w-40 rounded-lg bg-slate-100 animate-pulse mb-2" />
                        <div className="h-4 w-24 rounded-lg bg-slate-100 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!receiver && !isResolvingReceiver) {
        return (
            <div className="h-screen w-full overflow-y-auto bg-slate-50 text-slate-900">
                <div className="sticky top-0 z-30 bg-purple-600 text-white px-4 py-3.5 flex items-center gap-3 shadow-md">
                    <button
                        onClick={() => router.back()}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight">Informações da Conversa</h1>
                </div>
                <div className="max-w-xl mx-auto px-4 pt-6">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
                        <p className="text-sm font-bold text-slate-700 mb-1">Perfil não encontrado</p>
                        <p className="text-xs text-slate-400">Não foi possível carregar as informações dessa conversa.</p>
                    </div>
                </div>
            </div>
        );
    }

    const visibleItems = mediaItems.slice(0, visibleCount);

    return (
        <div className="h-screen w-full overflow-y-auto bg-slate-50 text-slate-900 pb-16 scroll-smooth">
            {/* Cabeçalho */}
            <div className="sticky top-0 z-30 bg-purple-600 text-white px-4 py-3.5 flex items-center gap-3 shadow-md">
                <button
                    onClick={() => router.back()}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors active:scale-95"
                    aria-label="Voltar"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Informações da Conversa</h1>
            </div>

            {/* Cartão de Perfil Simplificado */}
            <div className="max-w-xl mx-auto px-4 pt-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="relative mb-3">
                        <Avatar uri={receiver?.photoUrl} size={96} />
                        {receiver?.isOnline && (
                            <span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full bg-emerald-400 ring-4 ring-white shadow-sm" />
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 justify-center mb-1">
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                            {receiver?.name || receiver?.username || 'Usuário Mimo'}
                        </h2>
                        {receiver?.isTeam && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Equipe Mimo ✓
                            </span>
                        )}
                        {receiver?.isProfessional && receiver?.identityStatus === 'approved' && (
                            <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                        )}
                    </div>

                    {receiver?.username && (
                        <p className="text-sm font-medium text-slate-400 mb-2">@{receiver.username}</p>
                    )}

                    {receiver?.isTeam && (
                        <div className="w-full mt-2 mb-4 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl text-left flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Membro Oficial da Equipe Mimo</h4>
                                <p className="text-xs text-emerald-800 leading-snug mt-0.5">
                                    Esta conta é um perfil oficial de ativação e suporte da Equipe Mimo. As conversas com a equipe são 100% gratuitas e seguras.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Botão Ver Perfil Completo */}
                    {receiver?.username && (
                        <button
                            onClick={() => router.push(`/${receiver.username}`)}
                            className="w-full bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold py-3 px-6 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            Ver Perfil Completo
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Resumo da Conversa */}
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mt-6 mb-3 px-1">
                    Resumo da Conversa
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    {/* Mensagens Trocadas */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                            <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 leading-none mb-1">{totalMessages}</p>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Mensagens Trocadas</p>
                        </div>
                    </div>

                    {/* Tempo de Conversa */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 leading-none mb-1">{daysTogether > 0 ? `${daysTogether}d` : 'Hoje'}</p>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Tempo Conversando</p>
                        </div>
                    </div>

                    {/* Início da Conversa */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between col-span-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conversando Desde</p>
                                <p className="text-sm font-bold text-slate-800">{formattedStartDate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Mimos Trocados */}
                    {totalGiftsCount > 0 && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between col-span-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                                    <Gift className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mimos Enviados</p>
                                    <p className="text-sm font-bold text-slate-800">{totalGiftsCount} presente(s) trocado(s)</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Seção Mídias Trocadas */}
                <div className="flex items-center justify-between mt-6 mb-3 px-1">
                    <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                        Mídias Trocadas ({mediaItems.length})
                    </h3>
                </div>

                {mediaItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center flex flex-col items-center justify-center shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-1">Nenhuma mídia trocada</p>
                        <p className="text-xs text-slate-400">Fotos e vídeos não expirados enviados na conversa aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {visibleItems.map((item, idx) => (
                                <LazyMediaThumbnail
                                    key={item.id || item.url || idx}
                                    item={item}
                                    onClick={() => {
                                        setShowControls(true);
                                        setSelectedIndex(idx);
                                    }}
                                />
                            ))}
                        </div>

                        {/* Botão Ver Mais Mídias */}
                        {visibleCount < mediaItems.length && !hasExpanded && (
                            <div className="pt-2 text-center">
                                <button
                                    onClick={handleLoadMore}
                                    className="w-full bg-white hover:bg-slate-100 active:scale-[0.98] border border-slate-200 text-purple-700 font-bold py-3 px-4 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <span>Ver mais mídias ({mediaItems.length - visibleCount} restantes)</span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Sentinela para Scroll Infinito após acionar "Ver mais" */}
                        {hasExpanded && visibleCount < mediaItems.length && (
                            <div ref={sentinelRef} className="py-4 flex justify-center items-center">
                                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Mídia em Tela Cheia (Galeria Lightbox) */}
            {selectedIndex !== null && activeMedia && (
                <div
                    className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center select-none backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Barra Superior de Controles */}
                    <div
                        className={`absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white transition-opacity duration-300 ${
                            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full text-white/90">
                                {activeMedia.isVideo ? 'Vídeo' : 'Foto'}
                            </span>
                            <span className="text-xs font-semibold text-white/80">
                                {selectedIndex + 1} de {mediaItems.length}
                            </span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndex(null);
                            }}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-95"
                            aria-label="Fechar"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Seta Esquerda */}
                    {selectedIndex > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrev();
                            }}
                            className={`absolute left-3 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white shadow-lg transition-all active:scale-90 ${
                                showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                            }`}
                            aria-label="Mídia Anterior"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}

                    {/* Seta Direita */}
                    {selectedIndex < mediaItems.length - 1 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white shadow-lg transition-all active:scale-90 ${
                                showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                            }`}
                            aria-label="Próxima Mídia"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}

                    {/* Exibição Central da Mídia */}
                    <div
                        className="w-full h-full flex items-center justify-center p-2 md:p-8"
                        onClick={() => setShowControls(prev => !prev)}
                    >
                        {activeMedia.isVideo ? (
                            <video
                                key={activeMedia.url}
                                src={activeMedia.url}
                                controls
                                autoPlay
                                playsInline
                                onClick={(e) => e.stopPropagation()}
                                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
                            />
                        ) : (
                            <img
                                key={activeMedia.url}
                                src={activeMedia.url}
                                alt="Mídia em tela cheia"
                                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl transition-transform duration-200"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

