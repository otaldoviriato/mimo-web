'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import axios from 'axios';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { useSocket } from '@/hooks/useSocket';
import { useUserById, useMyProfile, QueryKeys } from '@/hooks/useQueries';
import { usePayment } from '@/context/PaymentContext';
import { Drawer } from 'vaul';

interface Message {
    _id: string;
    senderId: string;
    receiverId: string;
    content: string;
    charCount: number;
    cost: number;
    timestamp: string;
    isRead?: boolean;
    isDelivered?: boolean;
    isLockedImage?: boolean;
    lockedImagePrice?: number;
    originalImageUrl?: string;
    blurredImageUrl?: string;
    isVideo?: boolean;
    videoUrl?: string;
    thumbnailUrl?: string;
    isGift?: boolean;
    receiverEarnings?: number;
    status?: 'sending' | 'sent' | 'error';
    tempId?: string;
}

interface UploadTask {
    tempId: string;
    progress: number;
    status: 'uploading' | 'success' | 'error';
    error?: string;
}

interface ChatPageProps {
    params?: Promise<{ userId: string }>;
    userId?: string;
    giftCode?: string;
    onBack?: () => void;
    isSubPage?: boolean;
    isClosing?: boolean;
}

interface CachedRoom {
    participants: string[];
    otherUser?: {
        balance?: number;
    };
}

function formatMediaDuration(durationInSeconds?: number) {
    if (!durationInSeconds || !Number.isFinite(durationInSeconds) || durationInSeconds <= 0) {
        return '';
    }

    const totalSeconds = Math.round(durationInSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function LockedMediaTypeBadge({ isVideo, duration }: { isVideo?: boolean; duration?: number }) {
    const formattedDuration = isVideo ? formatMediaDuration(duration) : '';

    return (
        <div className="absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/55 px-2 py-1 text-white shadow-sm backdrop-blur-md">
            {isVideo ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                </svg>
            ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                </svg>
            )}
            <span className="text-[9px] font-bold uppercase leading-none tracking-wider">
                {isVideo ? 'Vídeo' : 'Foto'}
            </span>
            {formattedDuration && (
                <span className="text-[9px] font-semibold leading-none text-white/80">
                    {formattedDuration}
                </span>
            )}
        </div>
    );
}

function formatLastSeen(isOnline?: boolean, lastSeenDateStr?: string | Date) {
    if (isOnline) return 'online';
    if (!lastSeenDateStr) return '';
    
    try {
        const date = new Date(lastSeenDateStr);
        const now = new Date();
        
        const isToday = date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
            
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getFullYear() === yesterday.getFullYear();
            
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        if (isToday) {
            return `visto por último hoje às ${timeStr}`;
        } else if (isYesterday) {
            return `visto por último ontem às ${timeStr}`;
        } else {
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `visto por último em ${dateStr} às ${timeStr}`;
        }
    } catch (e) {
        return '';
    }
}

function formatSeparatorDate(timestamp: string | Date) {
    try {
        const date = new Date(timestamp);
        const today = new Date();
        
        const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        // Ontem
        const dYesterday = new Date(dToday);
        dYesterday.setDate(dYesterday.getDate() - 1);
        
        if (dDate.getTime() === dToday.getTime()) {
            return 'Hoje';
        }
        
        if (dDate.getTime() === dYesterday.getTime()) {
            return 'Ontem';
        }
        
        // Se for do mesmo ano, exibe apenas dia e mês por extenso. Caso contrário, exibe o ano também.
        if (date.getFullYear() === today.getFullYear()) {
            return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
        }
        
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return '';
    }
}

interface EarningsIndicatorProps {
    messageId: string;
    receiverEarnings?: number;
    cost: number;
    isSelected: boolean;
    isNew: boolean;
}

function EarningsIndicator({ messageId, receiverEarnings, cost, isSelected, isNew }: EarningsIndicatorProps) {
    const [active, setActive] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isSelected) {
            setActive(true);
            setShouldRender(true);
        } else {
            setActive(false);
        }
    }, [isSelected]);

    useEffect(() => {
        if (isNew) {
            setActive(true);
            setShouldRender(true);
            
            const timer = setTimeout(() => {
                setActive(false);
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [isNew]);

    useEffect(() => {
        if (active) {
            setShouldRender(true);
        } else {
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [active]);

    if (!shouldRender) return null;

    const amount = (((receiverEarnings ?? cost * 0.9)) / 100).toFixed(2);

    return (
        <span className={`relative z-0 ${active ? 'animate-earnings-in' : 'animate-earnings-out'} text-[9px] font-semibold text-emerald-500/90 ml-1.5 select-none whitespace-nowrap`}>
            + R$ {amount}
        </span>
    );
}

interface MediaEarningsIndicatorProps {
    messageId: string;
    receiverEarnings?: number;
    cost: number;
    isSelected: boolean;
    isNew: boolean;
}

function MediaEarningsIndicator({ messageId, receiverEarnings, cost, isSelected, isNew }: MediaEarningsIndicatorProps) {
    const [active, setActive] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isSelected) {
            setActive(true);
            setShouldRender(true);
        } else {
            setActive(false);
        }
    }, [isSelected]);

    useEffect(() => {
        if (isNew) {
            setActive(true);
            setShouldRender(true);
            
            const timer = setTimeout(() => {
                setActive(false);
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [isNew]);

    useEffect(() => {
        if (active) {
            setShouldRender(true);
        } else {
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [active]);

    if (!shouldRender) return null;

    const amount = (((receiverEarnings || cost)) / 100).toFixed(2);

    return (
        <span className={`relative z-0 ${active ? 'animate-media-earnings-in' : 'animate-media-earnings-out'} text-[9px] font-semibold text-emerald-500/90 mr-1.5 select-none whitespace-nowrap align-bottom self-end mb-[32px]`}>
            + R$ {amount}
        </span>
    );
}


const VideoPlayer = ({ src, isActive, controlsVisible }: { src: string; isActive: boolean; controlsVisible: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            video.currentTime = 0;
            video.play().catch(err => {
                console.log("Autoplay blocked or failed:", err);
            });
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [isActive]);

    return (
        <video
            ref={videoRef}
            src={src}
            controls={controlsVisible}
            playsInline
            className="max-w-full max-h-full object-contain animate-in fade-in duration-200"
            onClick={e => e.stopPropagation()}
        />
    );
};

export default function ChatPage({ params, userId: propUserId, giftCode: propGiftCode, onBack, isSubPage = false, isClosing = false }: ChatPageProps) {
    const resolvedParams = params ? use(params) : null;
    const otherUserId = propUserId || resolvedParams?.userId || '';
    const { openRechargeModal } = usePayment();
    const router = useTransitionRouter();
    const queryClient = useQueryClient();
    const { user } = useUser();
    const { socket, connected, socketService, socketVersion } = useSocket(user?.id);

    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [newIncomingMessageIds, setNewIncomingMessageIds] = useState<Set<string>>(new Set());
    const [newUnlockedMediaIds, setNewUnlockedMediaIds] = useState<Set<string>>(new Set());
    const [isTyping, setIsTyping] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [giftModalVisible, setGiftModalVisible] = useState(false);
    const [giftAmountStr, setGiftAmountStr] = useState('');
    const [sendingGift, setSendingGift] = useState(false);
    const [attachMenuVisible, setAttachMenuVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isVideo, setIsVideo] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [mediaPriceStr, setMediaPriceStr] = useState('');
    const [mediaPriceType, setMediaPriceType] = useState<'free' | 'paid'>('free');
    const [mediaPriceFormatted, setMediaPriceFormatted] = useState('R$ 0,00');
    const [uploadTasks, setUploadTasks] = useState<Record<string, UploadTask>>({});
    const [showFreeMediaConfirm, setShowFreeMediaConfirm] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
    const [galleryVisible, setGalleryVisible] = useState(false);
    const [allMediaItemsLoaded, setAllMediaItemsLoaded] = useState<any[]>([]);
    const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
    const [fullscreenLockedMessage, setFullscreenLockedMessage] = useState<Message | null>(null);
    const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
    const swipeTouchStartX = useRef<number | null>(null);
    const swipeTouchStartY = useRef<number | null>(null);
    const [touchOffset, setTouchOffset] = useState(0);
    const touchOffsetRef = useRef(0);
    const [isDragging, setIsDragging] = useState(false);
    const swipeLockedRef = useRef<'horizontal' | 'vertical' | null>(null);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [unlockModalVisible, setUnlockModalVisible] = useState(false);
    const [unlockData, setUnlockData] = useState<{ id: string; price: number; isVideo: boolean } | null>(null);
    const [unlocking, setUnlocking] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [useNativeTransition, setUseNativeTransition] = useState(false);
    const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({});

    const isViewerOpen = fullscreenIndex !== null || fullscreenLockedMessage !== null;

    useEffect(() => {
        if (!isViewerOpen || typeof window === 'undefined') return;

        window.history.pushState({ mimoViewerOpen: true }, '');

        const handlePopState = () => {
            setFullscreenIndex(null);
            setFullscreenLockedMessage(null);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            
            // Se o fechamento foi disparado manualmente (ex: botão X) e o histórico 
            // ainda estiver no estado da galeria, voltamos no histórico para limpá-lo.
            if (window.history.state?.mimoViewerOpen) {
                window.history.back();
            }
        };
    }, [isViewerOpen]);

    const isSelectionActive = selectedMessageIds.size > 0;

    useEffect(() => {
        if (!isSelectionActive || typeof window === 'undefined') return;

        window.history.pushState({ mimoMessageSelectionOpen: true }, '');

        const handlePopState = () => {
            setSelectedMessageIds(new Set());
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            
            // Se a seleção foi limpa manualmente (ex: clicando em "X" ou limpando os IDs) 
            // e o histórico ainda estiver no estado de seleção, voltamos no histórico para limpá-lo.
            if (window.history.state?.mimoMessageSelectionOpen) {
                window.history.back();
            }
        };
    }, [isSelectionActive]);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.visualViewport) return;

        const handleResize = () => {
            requestAnimationFrame(() => {
                const vv = window.visualViewport;
                if (!vv) return;

                setViewportStyle({
                    height: `${vv.height}px`,
                    transform: `translateY(${vv.offsetTop}px)`,
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                });
            });
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
        
        // Execute immediately
        handleResize();

        // Extra fallback to ensure it runs a little bit after focus events to handle keyboard animations
        const handleFocus = () => {
            setTimeout(handleResize, 100);
            setTimeout(handleResize, 300);
        };
        
        document.addEventListener('focusin', handleFocus);
        document.addEventListener('focusout', handleFocus);

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
            document.removeEventListener('focusin', handleFocus);
            document.removeEventListener('focusout', handleFocus);
        };
    }, []);

    useEffect(() => {
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            setUseNativeTransition(true);
        }
    }, []);
    const pressTimer = useRef<any>(null);
    const longPressActivated = useRef(false);
    const touchStartCoords = useRef<{ x: number; y: number } | null>(null);
    // Stores a file selected before userData finished loading, so we can decide
    // professional vs non-professional routing once userData becomes available.
    const pendingMediaRef = useRef<{ file: File; isVideoFile: boolean } | null>(null);

    const { data: userData } = useMyProfile();
    const { data: receiver } = useUserById(otherUserId);
    const balance = userData?.balance ?? 0;
    const cachedRoom = user?.id
        ? queryClient.getQueryData<CachedRoom[]>(QueryKeys.rooms(user.id))?.find((room) => room.participants.includes(otherUserId))
        : undefined;
    const receiverBalance = receiver?.balance ?? cachedRoom?.otherUser?.balance ?? 0;

    // Lista derivada das mídias históricas carregadas combinadas com as mídias das mensagens locais
    const mediaItems = React.useMemo(() => {
        const loadedUrls = new Set(allMediaItemsLoaded.map(item => item.url));
        
        const localMedias = messages
            .filter(m => {
                if (m.isLockedImage) return false; // locked não entra
                return m.originalImageUrl || (m.isVideo && m.videoUrl);
            })
            .map(m => ({
                url: m.isVideo ? m.videoUrl! : m.originalImageUrl!,
                thumbnailUrl: m.isVideo ? m.thumbnailUrl : m.originalImageUrl,
                isVideo: !!m.isVideo,
            }));

        const newLocalMedias = localMedias.filter(item => !loadedUrls.has(item.url));

        return [...allMediaItemsLoaded, ...newLocalMedias];
    }, [allMediaItemsLoaded, messages]);

    useEffect(() => {
        const videosToMeasure = messages.filter((message) => (
            message.isVideo &&
            message.videoUrl &&
            !videoDurations[message._id]
        ));

        if (!videosToMeasure.length) return;

        const createdVideos: HTMLVideoElement[] = [];

        videosToMeasure.forEach((message) => {
            const video = document.createElement('video');
            createdVideos.push(video);
            video.preload = 'metadata';
            video.src = message.videoUrl!;

            video.onloadedmetadata = () => {
                if (Number.isFinite(video.duration) && video.duration > 0) {
                    setVideoDurations((prev) => (
                        prev[message._id] ? prev : { ...prev, [message._id]: video.duration }
                    ));
                }
            };

            video.onerror = () => {
                video.removeAttribute('src');
                video.load();
            };
        });

        return () => {
            createdVideos.forEach((video) => {
                video.onloadedmetadata = null;
                video.onerror = null;
                video.removeAttribute('src');
                video.load();
            });
        };
    }, [messages, videoDurations]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isFirstLoadRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<any>(null);
    const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [couponClaimModal, setCouponClaimModal] = useState(false);
    const [couponClaimAmount, setCouponClaimAmount] = useState<number | null>(null);
    const couponClaimedRef = useRef(false);

    // Efeito para resgatar cupom na tela de chat
    useEffect(() => {
        if (!user?.id || couponClaimedRef.current) return;

        // Ordem de prioridade para encontrar o código do cupom:
        // 1. Prop direta (passada pelo layout virtual via pushVirtual params) — mais confiável
        // 2. localStorage (sobrevive a redirects OAuth no PWA)
        // 3. sessionStorage (fallback legado)
        // 4. URL query param (usuário já logado acessando o link diretamente)
        const fromProp = propGiftCode;
        const fromLocalStorage = localStorage.getItem('mimo_pending_gift');
        const fromSessionStorage = sessionStorage.getItem('mimo_pending_gift');
        const fromUrl = new URLSearchParams(window.location.search).get('gift');
        const code = fromProp || fromLocalStorage || fromSessionStorage || fromUrl;
        if (!code) return;

        // Trava global de sessão do front-end para evitar requisições concorrentes duplicadas
        if (typeof window !== 'undefined') {
            const claims = (window as any).__claimingGiftCodes = (window as any).__claimingGiftCodes || {};
            if (claims[code]) return;
            claims[code] = true;
        }

        couponClaimedRef.current = true;
        localStorage.removeItem('mimo_pending_gift');
        sessionStorage.removeItem('mimo_pending_gift');

        // Limpa a URL para remover o query param 'gift'
        if (fromUrl && typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('gift');
            window.history.replaceState({}, '', url.pathname + url.search);
        }

        fetch('/api/gift/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setCouponClaimAmount(typeof data?.amount === 'number' ? data.amount : null);
                setCouponClaimModal(true);
                // Invalida os caches do perfil e do saldo
                queryClient.invalidateQueries({ queryKey: QueryKeys.me });
                queryClient.invalidateQueries({ queryKey: QueryKeys.balance(user.id) });
            } else if (typeof window !== 'undefined' && (window as any).__claimingGiftCodes) {
                // Se falhou, libera a trava global para permitir novas tentativas
                delete (window as any).__claimingGiftCodes[code];
            }
        }).catch((err) => {
            console.error('Error claiming coupon in chat screen:', err);
            if (typeof window !== 'undefined' && (window as any).__claimingGiftCodes) {
                delete (window as any).__claimingGiftCodes[code];
            }
        });
    }, [user?.id, propGiftCode, queryClient]);

    const roomId = [user?.id, otherUserId].sort().join('_');

    // Carrega mensagens do cache local no primeiro render
    useEffect(() => {
        if (typeof window !== 'undefined' && user?.id && otherUserId) {
            const currentRoomId = [user.id, otherUserId].sort().join('_');
            const cached = localStorage.getItem(`mimo_messages_${currentRoomId}`);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setMessages(parsed);
                        setLoadingMessages(false);
                    }
                } catch (e) {
                    console.error('Erro ao ler mensagens do cache:', e);
                }
            }
        }
    }, [user?.id, otherUserId]);

    // Salva apenas as últimas 50 mensagens no cache local para não sobrecarregar o armazenamento
    useEffect(() => {
        if (typeof window !== 'undefined' && user?.id && otherUserId && !loadingMessages) {
            const currentRoomId = [user.id, otherUserId].sort().join('_');
            const recentMessages = messages.slice(-50);
            localStorage.setItem(`mimo_messages_${currentRoomId}`, JSON.stringify(recentMessages));
        }
    }, [messages, user?.id, otherUserId, loadingMessages]);

    // Busca mídias históricas do backend quando a galeria for aberta
    useEffect(() => {
        if (galleryVisible && roomId && user?.id) {
            const fetchMedia = async () => {
                try {
                    const response = await axios.get(`/api/rooms/${user.id}/media`, {
                        params: { roomId }
                    });
                    setAllMediaItemsLoaded(response.data);
                } catch (error) {
                    console.error('Erro ao carregar mídias da galeria:', error);
                }
            };
            fetchMedia();
        }
    }, [galleryVisible, roomId, user?.id]);

    // Notifica que o DOM está pronto imediatamente na montagem para iniciar a transição sem delay (estilo nativo)
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }
    }, []);

    // Prefetch da tela de perfil público para navegação instantânea (resposta tátil imediata)
    useEffect(() => {
        if (receiver?.username) {
            router.prefetch(`/${receiver.username}`);
        }
    }, [receiver?.username, router]);

    const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
        setTimeout(() => {
            const container = messagesContainerRef.current;
            if (container) {
                if (behavior === 'auto') {
                    container.scrollTop = 0; // No flex-col-reverse, 0 é o final das mensagens (bottom)
                } else {
                    container.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        }, 0);
    };

    useEffect(() => {
        if (!loadingMessages && messages.length > 0) {
            if (isFirstLoadRef.current) {
                scrollToBottom('auto');
                isFirstLoadRef.current = false;
            } else {
                scrollToBottom('smooth');
            }
        }
    }, [messages, loadingMessages]);

    useEffect(() => {
        if (!socket || !user?.id) return;

        socketService.joinRoom(user.id, otherUserId);

        socket.on('room_joined', (data: { messages: Message[] }) => {
            setMessages([...data.messages]);
            setLoadingMessages(false);
            if (data.messages.length < 50) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
            socket.emit('mark_as_read', { roomId });

            // Atualiza cache local de rooms
            queryClient.setQueryData(QueryKeys.rooms(user.id!), (old: any) => {
                const currentRooms = Array.isArray(old) ? old : [];
                const roomExists = currentRooms.some((r: any) => {
                    const rId = r.roomId ?? [...r.participants].sort().join('_');
                    return rId === roomId;
                });

                let updatedRooms = currentRooms.map((r: any) => {
                    const rId = r.roomId ?? [...r.participants].sort().join('_');
                    if (rId === roomId) {
                        return { ...r, unreadCount: { ...r.unreadCount, [user.id!]: 0 } };
                    }
                    return r;
                });

                if (!roomExists && receiver?.isProfessional) {
                    const pendingRoom = {
                        _id: `pending-${roomId}`,
                        roomId,
                        participants: [user.id!, otherUserId].sort(),
                        otherUser: receiver,
                        unreadCount: { [user.id!]: 0 },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    updatedRooms = [...updatedRooms, pendingRoom];

                    const pendingKey = `mimo_pending_rooms_${user.id!}`;
                    let pendingRooms: any[] = [];
                    try {
                        pendingRooms = JSON.parse(localStorage.getItem(pendingKey) || '[]');
                    } catch {
                        pendingRooms = [];
                    }
                    localStorage.setItem(pendingKey, JSON.stringify([
                        ...pendingRooms.filter((r: any) => r.roomId !== roomId),
                        pendingRoom,
                    ]));
                }

                return updatedRooms;
            });
        });

        socket.on('user_presence', (data: { userId: string; isOnline: boolean; lastSeen: string }) => {
            if (data.userId === otherUserId) {
                queryClient.setQueryData(QueryKeys.userById(otherUserId), (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        isOnline: data.isOnline,
                        lastSeen: data.lastSeen
                    };
                });
            }
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
                    setNewIncomingMessageIds((prevIds) => {
                        const nextIds = new Set(prevIds);
                        nextIds.add(data.message._id);
                        return nextIds;
                    });
                }
                return newMessages;
            });

            // Atualiza cache local de rooms para refletir a última mensagem recebida/enviada em tempo real
            queryClient.setQueryData(QueryKeys.rooms(user?.id ?? ''), (old: any) => {
                if (!old) return old;
                return old.map((r: any) => {
                    const rId = r.roomId ?? [...r.participants].sort().join('_');
                    if (rId === roomId) {
                        return {
                            ...r,
                            lastMessage: data.message.content.substring(0, 100),
                            lastMessageTime: data.message.timestamp,
                            updatedAt: data.message.timestamp,
                            unreadCount: {
                                ...r.unreadCount,
                                [user?.id ?? '']: data.message.receiverId === user?.id ? 0 : (r.unreadCount?.[user?.id ?? ''] ?? 0)
                            }
                        };
                    }
                    return r;
                });
            });
        });

        socket.on('balance_update', (data: { balance: number }) => {
            queryClient.setQueryData(QueryKeys.me, (old: any) =>
                old ? { ...old, balance: data.balance } : old
            );
            queryClient.invalidateQueries({ queryKey: ['earnings', 'recent'] });
        });

        socket.on('message_error', (data: { error: string }) => {
            alert(data.error);
            setSending(false);
        });

        socket.on('user_typing', (data: { isTyping: boolean }) => {
            if (partnerTypingTimeoutRef.current) {
                clearTimeout(partnerTypingTimeoutRef.current);
                partnerTypingTimeoutRef.current = null;
            }

            if (data.isTyping) {
                setIsTyping(true);
                // Fallback automático de 5s caso o evento isTyping: false nunca chegue
                partnerTypingTimeoutRef.current = setTimeout(() => {
                    setIsTyping(false);
                    partnerTypingTimeoutRef.current = null;
                }, 5000);
            } else {
                // Ao parar de digitar, adicionamos um atraso de 2s para ocultar
                // Isso previne que a tela pisque se o usuário parar e recomeçar logo em seguida
                partnerTypingTimeoutRef.current = setTimeout(() => {
                    setIsTyping(false);
                    partnerTypingTimeoutRef.current = null;
                }, 2000);
            }
        });

        socket.on('messages_read', (data: { roomId: string; readBy: string }) => {
            if (data.roomId === roomId) {
                setMessages((prev) => prev.map((msg) => {
                    if (msg.senderId === user?.id && data.readBy !== user?.id) {
                        return { ...msg, isRead: true, isDelivered: true };
                    }
                    return msg;
                }));
            }
        });

        socket.on('messages_delivered', (data: { roomId: string; receiverId: string }) => {
            if (data.roomId === roomId && data.receiverId !== user?.id) {
                setMessages((prev) => prev.map((msg) => {
                    if (msg.senderId === user?.id && !msg.isDelivered) {
                        return { ...msg, isDelivered: true };
                    }
                    return msg;
                }));
            }
        });

        socket.on('message_updated', (data: { message: Message }) => {
            setMessages((prev) => {
                const oldMsg = prev.find(m => m._id === data.message._id);
                if (oldMsg) {
                    const wasLocked = oldMsg.isLockedImage;
                    const isLockedNow = data.message.isLockedImage;
                    if (wasLocked && !isLockedNow && oldMsg.senderId === user?.id && (data.message.lockedImagePrice || 0) > 0) {
                        setNewUnlockedMediaIds((prevIds) => {
                            const nextIds = new Set(prevIds);
                            nextIds.add(data.message._id);
                            return nextIds;
                        });
                    }
                }
                return prev.map(m => m._id === data.message._id ? data.message : m);
            });
        });

        socket.on('message_deleted', (data: { messageId: string }) => {
            setMessages((prev) => prev.filter(m => m._id !== data.messageId));
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
                queryClient.invalidateQueries({ queryKey: ['earnings', 'recent'] });
            }
        });

        return () => {
            socketService.leaveRoom(roomId);
            socket.off('room_joined');
            socket.off('user_presence');
            socketService.offNewMessage();
            socket.off('balance_update');
            socket.off('message_error');
            socket.off('user_typing');
            socket.off('messages_read');
            socket.off('messages_delivered');
            socket.off('message_updated');
            socket.off('message_deleted');
            socket.off('room_read');

            if (partnerTypingTimeoutRef.current) {
                clearTimeout(partnerTypingTimeoutRef.current);
                partnerTypingTimeoutRef.current = null;
            }
        };
    }, [socket, socketVersion, roomId, otherUserId, user?.id, receiver, queryClient]);

    // Handles the edge case where the user selects a file before userData finishes
    // loading. Once userData is available we decide: auto-send (non-professional)
    // or let the price modal appear (professional — selectedFile is already set).
    useEffect(() => {
        const pending = pendingMediaRef.current;
        if (!pending || userData === undefined) return;
        pendingMediaRef.current = null;
        if (userData.isProfessional === false) {
            setSelectedFile(null);
            setPreviewUrl(null);
            
            const file = pending.file;
            const isVideoFile = pending.isVideoFile;
            
            (async () => {
                let localPreview = '';
                if (isVideoFile) {
                    localPreview = await generateVideoThumbnail(file);
                } else {
                    localPreview = URL.createObjectURL(file);
                }
                
                const tempId = `temp-media-${Date.now()}`;
                const newMsg: Message = {
                    _id: tempId,
                    tempId: tempId,
                    senderId: user?.id ?? '',
                    receiverId: otherUserId,
                    content: isVideoFile ? 'Vídeo' : 'Foto',
                    charCount: 0,
                    cost: 0,
                    timestamp: new Date().toISOString(),
                    status: 'sending',
                    isVideo: isVideoFile,
                    thumbnailUrl: isVideoFile ? localPreview : undefined,
                    originalImageUrl: !isVideoFile ? localPreview : undefined,
                    isLockedImage: false,
                    lockedImagePrice: 0
                };
                setMessages(prev => [...prev, newMsg]);

                startMediaUpload(file, isVideoFile, 0, tempId, localPreview);
            })();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData]);

    const waitForVideoEvent = (video: HTMLVideoElement, eventName: keyof HTMLVideoElementEventMap, timeoutMs: number) => {
        return new Promise<void>((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
                cleanup();
                reject(new Error(`Timeout waiting for ${eventName}`));
            }, timeoutMs);

            const onEvent = () => {
                cleanup();
                resolve();
            };

            const onError = () => {
                cleanup();
                reject(new Error('Video failed to load'));
            };

            const cleanup = () => {
                window.clearTimeout(timeoutId);
                video.removeEventListener(eventName, onEvent);
                video.removeEventListener('error', onError);
            };

            video.addEventListener(eventName, onEvent, { once: true });
            video.addEventListener('error', onError, { once: true });
        });
    };

    const waitForVideoFrame = () => {
        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
    };

    const isCanvasMostlyBlack = (canvas: HTMLCanvasElement) => {
        const sampleWidth = Math.min(80, canvas.width);
        const sampleHeight = Math.min(80, canvas.height);
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = sampleWidth;
        sampleCanvas.height = sampleHeight;

        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
        if (!sampleCtx) return true;

        sampleCtx.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);
        const imageData = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;
        let darkPixels = 0;
        let visiblePixels = 0;

        for (let i = 0; i < imageData.length; i += 4) {
            const alpha = imageData[i + 3];
            if (alpha < 16) continue;

            visiblePixels += 1;
            const brightness = (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
            if (brightness < 8) darkPixels += 1;
        }

        if (visiblePixels === 0) return true;
        return darkPixels / visiblePixels > 0.985;
    };

    const buildThumbnailSeekTimes = (duration: number) => {
        const fallbackTimes = [0.5, 1.5, 3, 5, 8];
        if (!Number.isFinite(duration) || duration <= 0) return fallbackTimes;

        return Array.from(new Set([
            Math.min(0.5, Math.max(duration - 0.1, 0)),
            Math.min(1.5, Math.max(duration - 0.1, 0)),
            duration * 0.05,
            duration * 0.12,
            duration * 0.25,
            duration * 0.5,
        ].map(time => Number(Math.max(0, Math.min(duration - 0.1, time)).toFixed(2)))));
    };

    const captureVideoThumbnailAt = async (video: HTMLVideoElement, time: number) => {
        if (Math.abs(video.currentTime - time) > 0.05) {
            const seeked = waitForVideoEvent(video, 'seeked', 5000);
            video.currentTime = time;
            await seeked;
        }

        await waitForVideoFrame();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return '';

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (isCanvasMostlyBlack(canvas)) return '';

        return canvas.toDataURL('image/jpeg', 0.86);
    };

    const generateVideoThumbnail = async (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.muted = true;
            video.playsInline = true;

            const timeoutId = setTimeout(() => {
                cleanup();
                resolve('');
            }, 12000);

            const cleanup = () => {
                clearTimeout(timeoutId);
                try {
                    URL.revokeObjectURL(video.src);
                } catch {}
            };

            const loadAndCapture = async () => {
                try {
                    await waitForVideoEvent(video, 'loadedmetadata', 5000);
                    await waitForVideoEvent(video, 'loadeddata', 5000).catch(() => undefined);

                    for (const seekTime of buildThumbnailSeekTimes(video.duration)) {
                        const thumbnail = await captureVideoThumbnailAt(video, Number(seekTime));
                        if (thumbnail) {
                            cleanup();
                            resolve(thumbnail);
                            return;
                        }
                    }

                    cleanup();
                    resolve('');
                } catch {
                    cleanup();
                    resolve('');
                }
            };

            try {
                video.src = URL.createObjectURL(file);
                video.load();
                loadAndCapture();
            } catch {
                cleanup();
                resolve('');
            }
        });
    };

    const startMediaUpload = async (
        file: File,
        isVideoFile: boolean,
        priceInCents: number,
        tempId: string,
        localPreviewUrl: string
    ) => {
        setUploadTasks(prev => ({
            ...prev,
            [tempId]: { tempId, progress: 0, status: 'uploading' }
        }));

        try {
            let finalVideoUrl = '';
            
            if (isVideoFile) {
                const signedRes = await fetch('/api/chats/media/signed-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomId,
                        contentType: file.type,
                        fileName: file.name,
                        isVideo: true
                    })
                });
                
                if (!signedRes.ok) {
                    const errJson = await signedRes.json().catch(() => ({}));
                    throw new Error(errJson.error || 'Falha ao obter URL assinada para o vídeo');
                }
                const signedData = await signedRes.json();
                
                if (signedData.signedUrl) {
                    await axios.put(signedData.signedUrl, file, {
                        headers: { 'Content-Type': file.type },
                        onUploadProgress: (progressEvent) => {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / (progressEvent.total || 1)
                            );
                            setUploadTasks(prev => {
                                if (!prev[tempId]) return prev;
                                return {
                                    ...prev,
                                    [tempId]: { ...prev[tempId], progress: Math.min(90, Math.round(percentCompleted * 0.9)) }
                                };
                            });
                        }
                    });
                    finalVideoUrl = signedData.publicUrl;
                } else {
                    throw new Error('Signed URL vazia');
                }
            }

            const formData = new FormData();
            if (isVideoFile) {
                formData.append('videoUrl', finalVideoUrl);
            } else {
                formData.append('file', file);
            }
            
            formData.append('roomId', roomId);
            formData.append('receiverId', otherUserId);
            formData.append('lockedPrice', (priceInCents / 100).toString());
            formData.append('isVideo', isVideoFile.toString());
            formData.append('tempId', tempId);

            
            if (isVideoFile) {
                let thumbUrl = localPreviewUrl;
                if (!thumbUrl || thumbUrl.startsWith('blob:')) {
                    thumbUrl = await generateVideoThumbnail(file);
                }
                if (thumbUrl && !thumbUrl.startsWith('blob:')) {
                    const thumbBlob = await (await fetch(thumbUrl)).blob();
                    formData.append('thumbnail', new File([thumbBlob], 'thumb.jpg', { type: 'image/jpeg' }));
                }
            }

            const res = await axios.post('/api/chats/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (!isVideoFile) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / (progressEvent.total || 1)
                        );
                        setUploadTasks(prev => {
                            if (!prev[tempId]) return prev;
                            return {
                                ...prev,
                                [tempId]: { ...prev[tempId], progress: percentCompleted }
                            };
                        });
                    } else {
                        setUploadTasks(prev => {
                            if (!prev[tempId]) return prev;
                            return {
                                ...prev,
                                [tempId]: { ...prev[tempId], progress: 95 }
                            };
                        });
                    }
                }
            });

            const data = res.data;
            if (!data.success) {
                throw new Error(data.error || 'Erro ao processar mídia');
            }

            setUploadTasks(prev => {
                const next = { ...prev };
                delete next[tempId];
                return next;
            });

        } catch (e: any) {
            console.error('Erro no upload em background:', e);
            let errMsg = e.message || 'Erro no upload';
            if (e.response?.data?.error) {
                errMsg = e.response.data.error;
            } else if (e.response?.data?.message) {
                errMsg = e.response.data.message;
            } else if (e.message?.includes('Network Error')) {
                errMsg = 'Erro de rede. Verifique sua conexão.';
            }
            
            // Exibir alerta explicativo do erro
            alert(`Falha no envio de mídia: ${errMsg}`);

            setUploadTasks(prev => {
                if (!prev[tempId]) return prev;
                return {
                    ...prev,
                    [tempId]: { ...prev[tempId], status: 'error', error: errMsg }
                };
            });
            setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, status: 'error' } : m));
        }
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanValue = value.replace(/\D/g, '');
        const numberValue = parseFloat(cleanValue) / 100;
        if (isNaN(numberValue)) {
            setMediaPriceFormatted('R$ 0,00');
            setMediaPriceStr('0');
            return;
        }
        const formatted = numberValue.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
        setMediaPriceFormatted(formatted);
        setMediaPriceStr(numberValue.toFixed(2));
    };

    const handleStartPress = (msgId: string, e: React.TouchEvent | React.MouseEvent) => {
        longPressActivated.current = false;

        let clientX = 0;
        let clientY = 0;
        if ('touches' in e) {
            if (e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        touchStartCoords.current = { x: clientX, y: clientY };

        if (pressTimer.current) clearTimeout(pressTimer.current);

        pressTimer.current = setTimeout(() => {
            longPressActivated.current = true;
            setSelectedMessageIds(prev => {
                const next = new Set(prev);
                next.add(msgId);
                return next;
            });
        }, 500);
    };

    const handleMovePress = (e: React.TouchEvent | React.MouseEvent) => {
        if (!touchStartCoords.current || !pressTimer.current) return;

        let clientX = 0;
        let clientY = 0;
        if ('touches' in e) {
            if (e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const deltaX = clientX - touchStartCoords.current.x;
        const deltaY = clientY - touchStartCoords.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Se mover mais de 10 pixels, cancelamos o temporizador do long press
        if (distance > 10) {
            if (pressTimer.current) {
                clearTimeout(pressTimer.current);
                pressTimer.current = null;
            }
        }
    };

    const handleEndPress = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
        touchStartCoords.current = null;
    };

    // Click em modo de seleção: toggle da mensagem no set
    const handleMessageClick = (msgId: string) => {
        // Se foi um long press, ignora o click disparado logo após soltar
        if (longPressActivated.current) {
            longPressActivated.current = false;
            return;
        }
        if (selectedMessageIds.size > 0) {
            setSelectedMessageIds(prev => {
                const next = new Set(prev);
                if (next.has(msgId)) {
                    next.delete(msgId);
                } else {
                    next.add(msgId);
                }
                return next;
            });
        }
    };

    const handleDeleteMessage = () => {
        if (!selectedMessageIds.size || !socket) return;
        // Remove imediatamente do estado local
        setMessages(prev => prev.filter(m => !selectedMessageIds.has(m._id)));
        // Emite para o servidor fazer o soft delete de cada mensagem
        selectedMessageIds.forEach(id => {
            socket.emit('delete_message', { messageId: id });
        });
        setSelectedMessageIds(new Set());
    };

    function MessageSkeleton() {
    return (
        <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col gap-6">
            {[...Array(8)].map((_, i) => {
                const isMine = i % 3 === 0;
                return (
                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-pulse`}>
                        <div className={`
                            h-14 rounded-2xl 
                            ${isMine ? 'bg-purple-100 w-[60%] rounded-br-sm' : 'bg-gray-100 w-[45%] rounded-bl-sm'}
                        `} />
                    </div>
                );
            })}
        </div>
    );
}
 
    const loadMoreMessages = async () => {
        if (loadingMoreRef.current || !hasMore || messages.length === 0) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);

        try {
            const oldestMessage = messages[0];
            const before = oldestMessage.timestamp;

            const response = await axios.get(`/api/rooms/${user?.id}/messages`, {
                params: {
                    roomId,
                    before,
                    limit: 50
                }
            });

            const newMessages = response.data;

            if (newMessages && Array.isArray(newMessages)) {
                if (newMessages.length < 50) {
                    setHasMore(false);
                }
                if (newMessages.length > 0) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m._id));
                        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m._id));
                        return [...uniqueNewMessages, ...prev];
                    });
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Erro ao carregar mais mensagens:', error);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    };

    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        const container = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = container;

        // Em flex-col-reverse, no topo visual (mensagens antigas) o valor absoluto do scrollTop
        // se aproxima de scrollHeight - clientHeight.
        const scrollOffset = Math.abs(scrollTop);
        const isNearTop = scrollHeight - clientHeight - scrollOffset < 100;

        if (isNearTop && hasMore && !loadingMoreRef.current && messages.length > 0) {
            await loadMoreMessages();
        }
    };

    const handleSend = () => {
        console.log('[handleSend] Tentando enviar mensagem. Texto:', messageText.trim().substring(0, 20), 'sending:', sending, 'socket:', !!socket);
        if (!messageText.trim() || sending || !socket) {
            console.warn('[handleSend] Retorno antecipado (condição inválida). Texto vazio, sending true ou socket nulo.');
            return;
        }
        
        const charCount = messageText.trim().length;
        let costInCents = 0;
        if (charCount > 0 && receiver?.isProfessional) {
            const costPerCharInCents = currentRate * 100;
            const rawCostInCents = charCount * costPerCharInCents;
            costInCents = Math.max(1, Math.ceil(rawCostInCents));
        }

        console.log('[handleSend] Dados de custo. charCount:', charCount, 'receiverIsProfessional:', receiver?.isProfessional, 'costInCents:', costInCents, 'balance:', balance);

        if (receiver?.isProfessional && balance < costInCents) {
            console.warn('[handleSend] Saldo insuficiente. Requerido:', costInCents, 'Disponível:', balance);
            openRechargeModal('Você não tem saldo suficiente para enviar esta mensagem. Por favor, recarregue sua carteira.');
            return;
        }

        const tempId = `temp-${Date.now()}`;
        const newMsg: Message = {
            _id: tempId,
            tempId: tempId,
            senderId: user?.id ?? '',
            receiverId: otherUserId,
            content: messageText.trim(),
            charCount: charCount,
            cost: costInCents,
            timestamp: new Date().toISOString(),
            status: 'sending'
        };

        console.log('[handleSend] Inserindo mensagem otimista e limpando input. tempId:', tempId);
        setMessages(prev => [...prev, newMsg]);
        setMessageText('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
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
                    return {
                        ...r,
                        lastMessage: messageText.trim().substring(0, 100),
                        lastMessageTime: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        unreadCount: { ...r.unreadCount, [user?.id ?? '']: 0 }
                    };
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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const isVideoFile = type === 'video';

        setSelectedFile(file);
        setIsVideo(isVideoFile);

        let localPreview = '';
        if (isVideoFile) {
            localPreview = await generateVideoThumbnail(file);
            setPreviewUrl(localPreview);
        } else {
            localPreview = URL.createObjectURL(file);
            setPreviewUrl(localPreview);
        }

        if (userData === undefined) {
            // userData hasn't loaded yet — defer the routing decision to the
            // useEffect above so we never auto-send for a professional by mistake.
            pendingMediaRef.current = { file, isVideoFile };
            return;
        }

        // userData is loaded: only auto-send when we are 100% sure the user
        // is NOT a professional. Using strict `=== false` prevents the case
        // where userData is undefined from being treated as "non-professional".
        if (userData.isProfessional === false) {
            setSelectedFile(null);
            setPreviewUrl(null);

            const tempId = `temp-media-${Date.now()}`;
            const newMsg: Message = {
                _id: tempId,
                tempId: tempId,
                senderId: user?.id ?? '',
                receiverId: otherUserId,
                content: isVideoFile ? 'Vídeo' : 'Foto',
                charCount: 0,
                cost: 0,
                timestamp: new Date().toISOString(),
                status: 'sending',
                isVideo: isVideoFile,
                thumbnailUrl: isVideoFile ? localPreview : undefined,
                originalImageUrl: !isVideoFile ? localPreview : undefined,
                isLockedImage: false,
                lockedImagePrice: 0
            };
            setMessages(prev => [...prev, newMsg]);

            startMediaUpload(file, isVideoFile, 0, tempId, localPreview);
        }
        // isProfessional === true: the price modal renders because selectedFile is set.
    };

    const handleUnlockImage = async (messageId: string, priceInCents: number, isVideoMessage: boolean = false) => {
        if (balance < priceInCents) {
            openRechargeModal('Você não tem saldo suficiente para desbloquear este conteúdo. Por favor, recarregue sua carteira.');
            return;
        }
        setUnlockData({ id: messageId, price: priceInCents, isVideo: isVideoMessage });
        setUnlockModalVisible(true);
    };

    const confirmUnlock = async () => {
        if (!unlockData) return;
        
        if (balance < unlockData.price) {
            setUnlockModalVisible(false);
            openRechargeModal('Você não tem saldo suficiente para desbloquear este conteúdo. Por favor, recarregue sua carteira.');
            return;
        }

        setUnlocking(true);
        try {
            const res = await fetch(`/api/chats/message/${unlockData.id}/unlock`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.success) {
                setUnlockModalVisible(false);
                setUnlockData(null);
            } else {
                alert(data.error || 'Erro ao desbloquear conteúdo');
            }
        } catch (e) {
            alert('Erro na requisição');
        } finally {
            setUnlocking(false);
        }
    };

    const handleSendGift = async () => {
        if (!giftAmountStr || parseFloat(giftAmountStr) <= 0) return;
        
        const giftAmountInCents = parseFloat(giftAmountStr) * 100;
        if (balance < giftAmountInCents) {
            setGiftModalVisible(false);
            openRechargeModal('Você não tem saldo suficiente para enviar este presente. Por favor, recarregue sua carteira.');
            return;
        }

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
                if (data.error?.toLowerCase().includes('saldo') || data.error?.toLowerCase().includes('insuficiente')) {
                    setGiftModalVisible(false);
                    openRechargeModal('Você não tem saldo suficiente para enviar este presente. Por favor, recarregue sua carteira.');
                } else {
                    alert(data.error || 'Erro ao enviar presente');
                }
            }
        } catch (e) {
            alert('Erro de conexão');
        } finally {
            setSendingGift(false);
        }
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (useNativeTransition) {
            router.back();
        } else {
            setIsLeaving(true);
            setTimeout(() => {
                router.push('/chats');
            }, 220);
        }
    };

    const charCount = messageText.length;
    const isSubscriber = receiver?.subscribers?.includes(user?.id ?? '');
    const currentRate = receiver?.isProfessional 
        ? (isSubscriber 
            ? (receiver.chargePerCharSubscribers ?? 0.002) 
            : (receiver.chargePerCharNonSubscribers ?? 0.005))
        : 0;

    let estimatedCostInReais = 0;
    if (charCount > 0 && receiver?.isProfessional) {
        const costPerCharInCents = currentRate * 100;
        const rawCostInCents = charCount * costPerCharInCents;
        const totalCostInCents = Math.max(1, Math.ceil(rawCostInCents));
        estimatedCostInReais = totalCostInCents / 100;
    }

    const isClosingOrLeaving = isClosing || isLeaving;

    const layoutClass = isSubPage
        ? 'fixed inset-0 z-50 w-full h-full'
        : 'w-full h-full';

    const animationClass = isSubPage
        ? '' // A div externa do layout já gerencia as animações de slide-in/out da subpágina
        : (useNativeTransition ? '' : (isClosingOrLeaving ? 'animate-android-slide-out' : 'animate-android-slide-in'));

    return (
        <div 
            className={`flex flex-col bg-gray-50 overflow-hidden ${layoutClass} ${animationClass}`}
            style={viewportStyle}
        >
            {/* Header */}
            <div className="shared-header bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 z-20 sticky top-0 shadow-md flex items-center gap-2">
                {selectedMessageIds.size > 0 ? (
                    <>
                        <button
                            onClick={() => setSelectedMessageIds(new Set())}
                            className="text-white hover:bg-white/10 transition-colors p-2 -ml-2 rounded-full"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <div className="flex-1">
                            <p className="text-white font-bold">{selectedMessageIds.size} selecionada{selectedMessageIds.size > 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDeleteMessage}
                                className="text-red-300 hover:text-red-100 p-2 hover:bg-white/10 rounded-full transition-colors"
                                title="Excluir"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                            </button>
                            {selectedMessageIds.size === 1 && (
                                <button
                                    onClick={() => setDetailsModalVisible(true)}
                                    className="text-white/90 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                                    title="Detalhes"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleBack}
                            className="text-white hover:bg-white/10 transition-colors p-2 -ml-2 rounded-full"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button 
                            onClick={() => receiver?.username && router.push(`/${receiver.username}`)}
                            className="flex-1 flex items-center gap-3.5 min-w-0 text-left py-0.5"
                        >
                            <div className={`relative shrink-0 ${!receiver ? 'animate-pulse' : ''}`}>
                                <Avatar uri={receiver?.photoUrl} size={44} />
                                {receiver?.isOnline && (
                                    <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-purple-600 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                )}
                            </div>
                            <div className={`flex-1 min-w-0 ${!receiver ? 'animate-pulse' : ''}`}>
                                <p className="text-base font-bold text-white truncate tracking-tight">
                                    {receiver?.name || receiver?.username || (otherUserId ? `Usuário ${otherUserId.substring(0, 8)}` : 'Conversa')}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {!connected ? (
                                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Conectando...</span>
                                    ) : isTyping ? (
                                        <span className="text-[11px] text-emerald-300 font-bold animate-pulse tracking-wide lowercase">digitando...</span>
                                    ) : receiver?.isOnline ? (
                                        <span className="text-[11px] text-emerald-300 font-semibold tracking-wide lowercase">
                                            online
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-white/65 font-medium truncate tracking-tight normal-case">
                                            {receiver ? formatLastSeen(receiver.isOnline, receiver.lastSeen) : (receiver?.username ? `@${receiver.username}` : 'Ver perfil')}
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
                            {!userData?.isProfessional && receiver?.isProfessional && (
                                <button
                                    id="gallery-btn"
                                    onClick={() => setGalleryVisible(true)}
                                    className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all"
                                    title="Ver mídias compartilhadas"
                                >
                                    {/* Ícone grade 2x2 */}
                                    <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                                        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                                        <rect x="11" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                                        <rect x="1" y="11" width="6" height="6" rx="1.5" fill="currentColor"/>
                                        <rect x="11" y="11" width="6" height="6" rx="1.5" fill="currentColor"/>
                                    </svg>
                                </button>
                            )}

                            <div className="relative">
                                <button
                                    onClick={() => setMenuVisible(!menuVisible)}
                                    className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full active:scale-95 transition-all"
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
            <div ref={messagesContainerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto flex flex-col ${loadingMessages ? '' : 'flex-col-reverse'} gap-1`}>
                {loadingMessages ? (
                    <MessageSkeleton />
                ) : (
                    <>
                        <div ref={messagesEndRef} />
                        <div className="px-4 py-3 flex flex-col-reverse gap-0.5">
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white text-gray-900 shadow-sm rounded-2xl rounded-bl-sm px-3 py-1.5">
                            <div className="flex items-center gap-1 h-[22.75px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                {[...messages].reverse().map((item, index, arr) => {
                    const isMine = item.senderId === user?.id;
                    const isLocked = item.isLockedImage;
                    const isText = !item.isGift && !isLocked && !item.originalImageUrl && !item.isVideo;
                    
                    const nextItem = arr[index + 1];
                    let shouldShowSeparator = false;
                    if (!nextItem) {
                        shouldShowSeparator = true;
                    } else {
                        const currentDate = new Date(item.timestamp);
                        const nextDate = new Date(nextItem.timestamp);
                        if (
                            currentDate.getFullYear() !== nextDate.getFullYear() ||
                            currentDate.getMonth() !== nextDate.getMonth() ||
                            currentDate.getDate() !== nextDate.getDate()
                        ) {
                            shouldShowSeparator = true;
                        }
                    }
                    
                    return (
                        <React.Fragment key={item._id}>
                            <div
                                className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end ${isText ? 'mb-0.5' : 'mb-2'} -mx-4 px-4 py-0.5 transition-colors duration-300 ${selectedMessageIds.has(item._id) ? 'bg-purple-100/50' : ''} select-none no-select`}
                            onMouseDown={(e) => handleStartPress(item._id, e)}
                            onMouseMove={handleMovePress}
                            onMouseUp={handleEndPress}
                            onMouseLeave={handleEndPress}
                            onTouchStart={(e) => handleStartPress(item._id, e)}
                            onTouchMove={handleMovePress}
                            onTouchEnd={handleEndPress}
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
                                                    ) : item.isRead ? (
                                                        <div className="inline-flex items-center">
                                                            <span className="relative">✓</span>
                                                            <span className="relative -ml-1.5">✓</span>
                                                        </div>
                                                    ) : item.isDelivered ? (
                                                        <div className="inline-flex items-center">
                                                            <span className="relative">✓</span>
                                                            <span className="relative -ml-1.5">✓</span>
                                                        </div>
                                                    ) : '✓'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {isMine && userData?.isProfessional && item.lockedImagePrice! > 0 && !isLocked && (
                                        <MediaEarningsIndicator
                                            messageId={item._id}
                                            receiverEarnings={item.receiverEarnings}
                                            cost={item.lockedImagePrice || 0}
                                            isSelected={selectedMessageIds.has(item._id)}
                                            isNew={newUnlockedMediaIds.has(item._id)}
                                        />
                                    )}
                                    <div
                                        className={`relative z-10 max-w-[75%] ${isLocked || item.originalImageUrl || item.isVideo ? 'p-1 bg-transparent' : 'px-3 py-1.5'} rounded-2xl ${
                                        (!isLocked && !item.originalImageUrl && !item.isVideo) 
                                    ? (isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-white text-gray-900 shadow-sm rounded-bl-sm')
                                            : (isMine ? 'rounded-br-sm' : 'rounded-bl-sm')
                                        }`}
                                >
                                    {isLocked || item.originalImageUrl || item.isVideo ? (
                                        <>
                                            {isLocked ? (
                                                <div className="relative w-60 h-60 rounded-2xl overflow-hidden cursor-pointer bg-gray-200 shadow-sm flex items-center justify-center" onClick={() => {
                                                    if (!isMine) {
                                                        const price = 'lockedImagePrice' in item ? item.lockedImagePrice : (item as any).lockedPrice;
                                                        handleUnlockImage(item._id, price || 0, item.isVideo);
                                                    } else {
                                                        setFullscreenLockedMessage(item);
                                                    }
                                                }}>
                                                    {(item.isVideo ? item.thumbnailUrl : item.originalImageUrl) ? (
                                                        <img 
                                                            src={(isMine ? (item.isVideo ? item.thumbnailUrl : item.originalImageUrl) : item.blurredImageUrl) || ''} 
                                                            className={`w-full h-full object-cover ${isMine ? 'blur-sm scale-102' : ''}`}
                                                            alt="Locked Media" 
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-purple-950/20 flex flex-col items-center justify-center gap-2 text-purple-600">
                                                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M23 7l-7 5 7 5V7z" />
                                                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                                            </svg>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700/60">Vídeo</span>
                                                        </div>
                                                    )}

                                                    <LockedMediaTypeBadge
                                                        isVideo={item.isVideo}
                                                        duration={videoDurations[item._id]}
                                                    />

                                                    {/* Progresso de upload circular para envio em background */}
                                                    {isMine && item.tempId && uploadTasks[item.tempId] && (
                                                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 z-10">
                                                            {uploadTasks[item.tempId].status === 'uploading' ? (
                                                                <div className="w-16 h-16 relative flex items-center justify-center">
                                                                    <svg className="w-full h-full transform -rotate-90">
                                                                        <circle
                                                                            cx="32"
                                                                            cy="32"
                                                                            r="24"
                                                                            stroke="rgba(255, 255, 255, 0.2)"
                                                                            strokeWidth="3.5"
                                                                            fill="transparent"
                                                                        />
                                                                        <circle
                                                                            cx="32"
                                                                            cy="32"
                                                                            r="24"
                                                                            stroke="#a855f7"
                                                                            strokeWidth="3.5"
                                                                            fill="transparent"
                                                                            strokeDasharray={2 * Math.PI * 24}
                                                                            strokeDashoffset={2 * Math.PI * 24 * (1 - (uploadTasks[item.tempId].progress || 0) / 100)}
                                                                            className="transition-all duration-300 ease-out"
                                                                        />
                                                                    </svg>
                                                                    <span className="absolute text-xs font-black text-white">{uploadTasks[item.tempId].progress}%</span>
                                                                </div>
                                                            ) : uploadTasks[item.tempId].status === 'error' ? (
                                                                <div className="flex flex-col items-center gap-1 text-center">
                                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
                                                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                                                        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                                                                        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
                                                                    </svg>
                                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Falhou</span>
                                                                    {uploadTasks[item.tempId].error && (
                                                                        <span className="text-[8px] font-medium text-red-300 leading-tight break-words px-1 max-w-[95%] text-center">
                                                                            {uploadTasks[item.tempId].error}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    )}

                                                    {!isMine ? (
                                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] flex flex-col items-center justify-center gap-2">
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 drop-shadow">
                                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                            </svg>
                                                            <span className="text-[10px] font-medium uppercase tracking-widest text-white/90 drop-shadow">
                                                                Desbloquear
                                                            </span>
                                                            <span className="text-xs font-semibold text-purple-200 drop-shadow">
                                                                R$ {((item.lockedImagePrice || 0) / 100).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        (!item.tempId || !uploadTasks[item.tempId]) && (
                                                            <div className="absolute top-2 right-2 z-20">
                                                                <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 shadow-md">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                                    <span className="text-[8px] font-bold text-white uppercase tracking-wider">
                                                                        {item.lockedImagePrice && item.lockedImagePrice > 0 
                                                                            ? `Aguardando • R$ ${((item.lockedImagePrice || 0) / 100).toFixed(2)}` 
                                                                            : 'Aguardando'
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <div 
                                                    className="relative w-60 h-60 rounded-2xl overflow-hidden bg-gray-100 shadow-sm cursor-pointer group flex items-center justify-center"
                                                    onClick={() => {
                                                        const url = item.isVideo ? item.videoUrl : item.originalImageUrl;
                                                        if (url) {
                                                            const idx = mediaItems.findIndex(m => m.url === url);
                                                            setFullscreenIndex(idx >= 0 ? idx : 0);
                                                        }
                                                    }}
                                                >
                                                    {(item.isVideo ? item.thumbnailUrl : item.originalImageUrl) ? (
                                                        <img 
                                                            src={(item.isVideo ? item.thumbnailUrl : item.originalImageUrl) || ''} 
                                                            className="w-full h-full object-cover animate-in fade-in duration-300" 
                                                            alt="Media" 
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-purple-950/20 flex flex-col items-center justify-center gap-2 text-purple-600">
                                                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M23 7l-7 5 7 5V7z" />
                                                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                                            </svg>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700/60">Vídeo</span>
                                                        </div>
                                                    )}

                                                    {/* Progresso de upload circular para envio em background */}
                                                    {isMine && item.tempId && uploadTasks[item.tempId] && (
                                                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 z-10">
                                                            {uploadTasks[item.tempId].status === 'uploading' ? (
                                                                <div className="w-16 h-16 relative flex items-center justify-center">
                                                                    <svg className="w-full h-full transform -rotate-90">
                                                                        <circle
                                                                            cx="32"
                                                                            cy="32"
                                                                            r="24"
                                                                            stroke="rgba(255, 255, 255, 0.2)"
                                                                            strokeWidth="3.5"
                                                                            fill="transparent"
                                                                        />
                                                                        <circle
                                                                            cx="32"
                                                                            cy="32"
                                                                            r="24"
                                                                            stroke="#a855f7"
                                                                            strokeWidth="3.5"
                                                                            fill="transparent"
                                                                            strokeDasharray={2 * Math.PI * 24}
                                                                            strokeDashoffset={2 * Math.PI * 24 * (1 - (uploadTasks[item.tempId].progress || 0) / 100)}
                                                                            className="transition-all duration-300 ease-out"
                                                                        />
                                                                    </svg>
                                                                    <span className="absolute text-xs font-black text-white">{uploadTasks[item.tempId].progress}%</span>
                                                                </div>
                                                            ) : uploadTasks[item.tempId].status === 'error' ? (
                                                                <div className="flex flex-col items-center gap-1 text-center">
                                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
                                                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                                                        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                                                                        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
                                                                    </svg>
                                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Falhou</span>
                                                                    {uploadTasks[item.tempId].error && (
                                                                        <span className="text-[8px] font-medium text-red-300 leading-tight break-words px-1 max-w-[95%] text-center">
                                                                            {uploadTasks[item.tempId].error}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    )}

                                                    {item.isVideo && (!item.tempId || !uploadTasks[item.tempId]) && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-12 h-12 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center text-white border border-white/10 group-hover:scale-110 transition-transform">
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M8 5v14l11-7z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Badges de informações para a profissional após o desbloqueio */}
                                                    {isMine && (
                                                        <LockedMediaTypeBadge
                                                            isVideo={item.isVideo}
                                                            duration={videoDurations[item._id]}
                                                        />
                                                    )}

                                                    {isMine && item.lockedImagePrice! > 0 && (
                                                        <div className="absolute top-2 right-2 z-20">
                                                            <div className="bg-emerald-500/80 backdrop-blur-md px-2 py-1.5 rounded-lg border border-emerald-400/20 flex items-center gap-1.5 shadow-md animate-in fade-in duration-200">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                                <span className="text-[8px] font-black text-white uppercase tracking-wider">
                                                                    Desbloqueado • R$ {((item.lockedImagePrice || 0) / 100).toFixed(2)}
                                                                </span>
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
                                                            ) : item.isRead ? (
                                                                <div className="inline-flex items-center">
                                                                    <span className="relative">✓</span>
                                                                    <span className="relative -ml-1.5">✓</span>
                                                                </div>
                                                            ) : item.isDelivered ? (
                                                                <div className="inline-flex items-center">
                                                                    <span className="relative">✓</span>
                                                                    <span className="relative -ml-1.5">✓</span>
                                                                </div>
                                                            ) : '✓'}
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
                                                        ) : item.isRead ? (
                                                            <div className="inline-flex items-center">
                                                                <span className="relative">✓</span>
                                                                <span className="relative -ml-1.5">✓</span>
                                                            </div>
                                                        ) : item.isDelivered ? (
                                                            <div className="inline-flex items-center">
                                                                <span className="relative">✓</span>
                                                                <span className="relative -ml-1.5">✓</span>
                                                            </div>
                                                        ) : '✓'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="clear-both" />
                                        </div>
                                    )}
                                </div>
                                    {!isMine && userData?.isProfessional && (
                                        <EarningsIndicator
                                            messageId={item._id}
                                            receiverEarnings={item.receiverEarnings}
                                            cost={item.cost}
                                            isSelected={selectedMessageIds.has(item._id)}
                                            isNew={newIncomingMessageIds.has(item._id)}
                                        />
                                    )}
                                </>
                            )}
                            </div>
                            {shouldShowSeparator && (
                                <div className="flex items-center gap-3 my-6 px-4 w-full">
                                    <span className="text-[8.5px] font-black uppercase tracking-[0.15em] text-purple-600/75 dark:text-purple-400/80 whitespace-nowrap">
                                        {formatSeparatorDate(item.timestamp)}
                                    </span>
                                    <div className="flex-1 h-[1px] bg-gradient-to-r from-purple-200/40 dark:from-purple-900/30 to-transparent" />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
                {loadingMore && (
                    <div className="flex justify-center py-4 w-full">
                        <svg className="animate-spin h-6 w-6 text-purple-600" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}
                        </div>
                    </>
                )}
            </div>

            {/* Input area */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
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
                    <input type="file" className="hidden" ref={fileInputRef} accept="image/jpeg, image/png, image/gif, image/heic, image/webp, video/mp4, video/quicktime, video/x-m4v" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file?.type.startsWith('video/')) handleFileSelect(e, 'video');
                        else handleFileSelect(e, 'image');
                    }} />

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

            {selectedFile && userData?.isProfessional && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="font-black text-xl text-gray-900 mb-4 tracking-tight">
                            Enviar {isVideo ? 'Vídeo' : 'Foto'}
                        </h3>
                        
                        {/* Preview */}
                        <div className="w-full relative rounded-2xl overflow-hidden mb-5 aspect-square bg-gray-100 flex items-center justify-center border border-gray-100 shadow-inner">
                            {previewUrl ? (
                                <div className="relative w-full h-full">
                                    <img 
                                        src={previewUrl} 
                                        className={`w-full h-full object-cover transition-all duration-300 ${mediaPriceType === 'paid' ? 'blur scale-105' : ''}`} 
                                        alt="Preview" 
                                    />
                                    {isVideo && (
                                        <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-all duration-300 ${mediaPriceType === 'paid' ? 'blur' : ''}`}>
                                            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/40">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="animate-pulse flex flex-col items-center gap-2">
                                     <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Processando...</span>
                                </div>
                            )}
                        </div>

                        {/* Seletor Grátis / Pago */}
                        <div className="flex w-full bg-gray-100 p-1 rounded-2xl mb-5 border border-gray-200">
                            <button
                                type="button"
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                                    mediaPriceType === 'free'
                                        ? 'bg-white text-purple-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                onClick={() => {
                                    setMediaPriceType('free');
                                    setMediaPriceStr('0');
                                    setMediaPriceFormatted('R$ 0,00');
                                }}
                            >
                                Grátis
                            </button>
                            <button
                                type="button"
                                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                                    mediaPriceType === 'paid'
                                        ? 'bg-white text-purple-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                                onClick={() => {
                                    setMediaPriceType('paid');
                                }}
                            >
                                Pago
                            </button>
                        </div>

                        {/* Input do Valor */}
                        {mediaPriceType === 'paid' && (
                            <div className="w-full relative mb-5 animate-in slide-in-from-top-2 duration-200">
                                <input
                                    type="text"
                                    className="bg-gray-50 border border-gray-200 rounded-2xl p-4 w-full text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900"
                                    placeholder="R$ 0,00"
                                    value={mediaPriceFormatted}
                                    onChange={handlePriceChange}
                                />
                                <p className="text-[10px] text-center text-gray-400 mt-2 font-medium">
                                    Defina o valor em reais que o cliente pagará para desbloquear a mídia.
                                </p>
                            </div>
                        )}

                        {/* Botões de Ação */}
                        <div className="flex gap-3 w-full">
                            <button
                                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-all active:scale-98"
                                onClick={() => {
                                    setSelectedFile(null);
                                    setPreviewUrl(null);
                                    setMediaPriceStr('');
                                    setMediaPriceFormatted('R$ 0,00');
                                    setMediaPriceType('free');
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isVideo && !previewUrl}
                                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold flex justify-center items-center transition-all shadow-lg shadow-purple-600/20 active:scale-98 disabled:opacity-50"
                                onClick={() => {
                                    const price = parseFloat(mediaPriceStr || '0');
                                    if (mediaPriceType === 'paid' && (!price || price <= 0)) {
                                        alert('Por favor, defina um valor maior que R$ 0,00 para mídias pagas.');
                                        return;
                                    }
                                    
                                    const file = selectedFile;
                                    const isVideoFile = isVideo;
                                    const preview = previewUrl || '';
                                    
                                    setSelectedFile(null);
                                    setPreviewUrl(null);
                                    setMediaPriceStr('');
                                    setMediaPriceFormatted('R$ 0,00');
                                    setMediaPriceType('free');

                                    const tempId = `temp-media-${Date.now()}`;
                                    const priceInCents = Math.round(price * 100);
                                    const newMsg: Message = {
                                        _id: tempId,
                                        tempId: tempId,
                                        senderId: user?.id ?? '',
                                        receiverId: otherUserId,
                                        content: isVideoFile ? 'Vídeo' : 'Foto',
                                        charCount: 0,
                                        cost: 0,
                                        timestamp: new Date().toISOString(),
                                        status: 'sending',
                                        isVideo: isVideoFile,
                                        thumbnailUrl: isVideoFile ? preview : undefined,
                                        originalImageUrl: !isVideoFile ? preview : undefined,
                                        isLockedImage: priceInCents > 0,
                                        lockedImagePrice: priceInCents
                                    };
                                    setMessages(prev => [...prev, newMsg]);

                                    startMediaUpload(file, isVideoFile, priceInCents, tempId, preview);
                                }}
                            >
                                Enviar
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

            {unlockModalVisible && unlockData && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm flex flex-col items-center shadow-2xl relative overflow-hidden animate-in zoom-in duration-200">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
                        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                            </svg>
                        </div>
                        <h3 className="font-bold text-xl text-gray-900 mb-2 tracking-tight text-center">
                            Desbloquear {unlockData.isVideo ? 'Vídeo' : 'Foto'}?
                        </h3>
                        <p className="text-gray-500 text-sm text-center mb-6">
                            Você usará seu saldo para liberar este conteúdo exclusivo permanentemente.
                        </p>
                        
                        <div className="w-full bg-gray-50 rounded-2xl p-4 flex flex-col items-center mb-6 border border-gray-100">
                            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Custo do desbloqueio</span>
                            <span className="text-3xl font-black text-gray-900 leading-none">
                                R$ {(unlockData.price / 100).toFixed(2)}
                            </span>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button 
                                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-all active:scale-95" 
                                onClick={() => { setUnlockModalVisible(false); setUnlockData(null); }}
                            >
                                Cancelar
                            </button>
                            <button 
                                disabled={unlocking}
                                className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold flex justify-center items-center transition-all shadow-lg shadow-green-500/30 active:scale-95 disabled:opacity-50" 
                                onClick={confirmUnlock}
                            >
                                {unlocking ? (
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : "Desbloquear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {detailsModalVisible && selectedMessageIds.size === 1 && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm" onClick={() => setDetailsModalVisible(false)}>
                    <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-8 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                        
                        <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Detalhes da Mensagem</h3>
                        
                        {(() => {
                            const selectedId = Array.from(selectedMessageIds)[0];
                            const msg = messages.find(m => m._id === selectedId);
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

            {/* ===== VIEWER FULLSCREEN COM SWIPE ===== */}
            {fullscreenIndex !== null && mediaItems.length > 0 && (() => {
                const goPrev = () => setFullscreenIndex(i => (i !== null && i > 0 ? i - 1 : i));
                const goNext = () => setFullscreenIndex(i => (i !== null && i < mediaItems.length - 1 ? i + 1 : i));
                const canPrev = fullscreenIndex > 0;
                const canNext = fullscreenIndex < mediaItems.length - 1;

                const handleTouchStart = (e: React.TouchEvent) => {
                    swipeTouchStartX.current = e.touches[0].clientX;
                    swipeTouchStartY.current = e.touches[0].clientY;
                    swipeLockedRef.current = null;
                    touchOffsetRef.current = 0;
                    setTouchOffset(0);
                    setIsDragging(true);
                };

                const handleTouchMove = (e: React.TouchEvent) => {
                    if (swipeTouchStartX.current === null || swipeTouchStartY.current === null) return;
                    
                    const deltaX = e.touches[0].clientX - swipeTouchStartX.current;
                    const deltaY = e.touches[0].clientY - swipeTouchStartY.current;
                    
                    // Determina a direção bloqueada na primeira movimentação significativa
                    if (swipeLockedRef.current === null && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
                        swipeLockedRef.current = Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical';
                    }
                    
                    // Só processa movimento horizontal bloqueado
                    if (swipeLockedRef.current !== 'horizontal') return;
                    
                    let offset = deltaX;
                    if (!canPrev && deltaX > 0) {
                        offset = deltaX * 0.3;
                    } else if (!canNext && deltaX < 0) {
                        offset = deltaX * 0.3;
                    }
                    
                    touchOffsetRef.current = offset;
                    setTouchOffset(offset);
                };

                const handleTouchEnd = () => {
                    setIsDragging(false);
                    const threshold = window.innerWidth * 0.08;
                    const finalOffset = touchOffsetRef.current;

                    touchOffsetRef.current = 0;
                    setTouchOffset(0);
                    swipeTouchStartX.current = null;
                    swipeTouchStartY.current = null;
                    swipeLockedRef.current = null;

                    if (finalOffset < -threshold && canNext) {
                        goNext();
                    } else if (finalOffset > threshold && canPrev) {
                        goPrev();
                    }
                };

                // Toque simples: 3 zonas de 33% cada
                const handleSlideClick = (e: React.MouseEvent) => {
                    if (Math.abs(touchOffsetRef.current) > 5) return;
                    const x = e.clientX;
                    const w = window.innerWidth;
                    if (x < w * 0.33) {
                        if (canPrev) goPrev();
                    } else if (x > w * 0.67) {
                        if (canNext) goNext();
                    } else {
                        setControlsVisible(v => !v);
                    }
                };

                return (
                    <div
                        className="fixed inset-0 z-[100] bg-black flex flex-col select-none overflow-hidden"
                    >
                        {/* Container dos Slides que preenche tudo */}
                        <div 
                            className="absolute inset-0 z-0 overflow-hidden"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <div 
                                className="flex h-full absolute top-0 left-0"
                                style={{
                                    transform: `translateX(calc(${-fullscreenIndex * 100}vw + ${touchOffset}px))`,
                                    transition: isDragging ? 'none' : 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                                    width: `${mediaItems.length * 100}vw`
                                }}
                            >
                                {mediaItems.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        className="h-full flex-shrink-0 flex items-center justify-center"
                                        style={{ width: '100vw' }}
                                        onClick={handleSlideClick}
                                    >
                                        {item.isVideo ? (
                                            <VideoPlayer
                                                key={item.url}
                                                src={item.url}
                                                isActive={idx === fullscreenIndex}
                                                controlsVisible={controlsVisible}
                                            />
                                        ) : (
                                            <img
                                                key={item.url}
                                                src={item.url}
                                                className="max-w-full max-h-full object-contain"
                                                alt={`Mídia ${idx + 1}`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Controles flutuantes — somem após 1s de inatividade */}
                        <div
                            className="absolute inset-0 z-20 pointer-events-none"
                            style={{
                                opacity: controlsVisible ? 1 : 0,
                                transition: 'opacity 400ms ease'
                            }}
                        >
                            {/* Topo flutuante */}
                            <div 
                                className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pb-2 bg-gradient-to-b from-black/60 to-transparent" 
                                style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
                            >
                                <button
                                    className="w-10 h-10 rounded-full bg-black/45 flex items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-all pointer-events-auto backdrop-blur-sm"
                                    onClick={() => setFullscreenIndex(null)}
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                                <span className="text-white/80 text-sm font-semibold tracking-wide bg-black/45 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                    {fullscreenIndex + 1} / {mediaItems.length}
                                </span>
                                <div className="w-10" />{/* spacer */}
                            </div>

                            {/* Seta esquerda */}
                            {canPrev && (
                                <button
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/60 active:scale-95 transition-all flex items-center justify-center text-white backdrop-blur-sm pointer-events-auto"
                                    onClick={e => { e.stopPropagation(); goPrev(); }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6"/>
                                    </svg>
                                </button>
                            )}

                            {/* Seta direita */}
                            {canNext && (
                                <button
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 hover:bg-black/60 active:scale-95 transition-all flex items-center justify-center text-white backdrop-blur-sm pointer-events-auto"
                                    onClick={e => { e.stopPropagation(); goNext(); }}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6"/>
                                    </svg>
                                </button>
                            )}

                            {/* Dots de paginação */}
                            {mediaItems.length > 1 && mediaItems.length <= 20 && (
                                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-1.5 py-2">
                                    {mediaItems.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setFullscreenIndex(i)}
                                            className={`rounded-full transition-all pointer-events-auto ${
                                                i === fullscreenIndex
                                                    ? 'w-5 h-2 bg-white'
                                                    : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ===== VIEWER FULLSCREEN DEDICADO PARA MÍDIA BLOQUEADA (PROFISSIONAL) ===== */}
            {fullscreenLockedMessage !== null && (() => {
                const isVideo = !!fullscreenLockedMessage.isVideo;
                const mediaUrl = isVideo ? fullscreenLockedMessage.videoUrl : fullscreenLockedMessage.originalImageUrl;
                
                return (
                    <div className="fixed inset-0 z-[100] bg-black flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
                        {/* Container da mídia */}
                        <div className="absolute inset-0 z-0 flex items-center justify-center" onClick={() => setControlsVisible(v => !v)}>
                            {isVideo ? (
                                <VideoPlayer
                                    key={mediaUrl}
                                    src={mediaUrl!}
                                    isActive={true}
                                    controlsVisible={controlsVisible}
                                />
                            ) : (
                                <img
                                    key={mediaUrl}
                                    src={mediaUrl!}
                                    className="max-w-full max-h-full object-contain"
                                    alt="Mídia Bloqueada"
                                />
                            )}
                        </div>

                        {/* Controles flutuantes */}
                        <div
                            className="absolute inset-0 z-20 pointer-events-none"
                            style={{
                                opacity: controlsVisible ? 1 : 0,
                                transition: 'opacity 400ms ease'
                            }}
                        >
                            {/* Topo flutuante */}
                            <div 
                                className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pb-2 bg-gradient-to-b from-black/60 to-transparent" 
                                style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
                            >
                                <button
                                    className="w-10 h-10 rounded-full bg-black/45 flex items-center justify-center text-white hover:bg-black/60 active:scale-95 transition-all pointer-events-auto backdrop-blur-sm"
                                    onClick={() => setFullscreenLockedMessage(null)}
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                                
                                <div className="pointer-events-auto flex items-center gap-1.5 bg-black/55 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md shadow-md animate-in fade-in duration-300">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                                        Aguardando Abertura • R$ {((fullscreenLockedMessage.lockedImagePrice || 0) / 100).toFixed(2)}
                                    </span>
                                </div>
                                <div className="w-10" />
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ===== GALERIA DE MÍDIA (Vaul Drawer) ===== */}
            <Drawer.Root open={galleryVisible} onOpenChange={setGalleryVisible}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/60" />
                    <Drawer.Content className="fixed inset-x-0 bottom-0 z-[101] flex flex-col bg-white rounded-t-[32px] max-h-[78vh] w-full max-w-lg mx-auto outline-none shadow-2xl">
                        {/* Header Fixo */}
                        <div className="w-full flex-shrink-0 px-6 pt-6 pb-4 bg-white rounded-t-[32px]">
                            {/* Handle */}
                            <div className="mx-auto w-12 h-1.5 rounded-full bg-gray-200 mb-6" />

                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <Drawer.Title className="text-xl font-bold text-gray-900">Mídia Compartilhada</Drawer.Title>
                                <span className="text-sm text-gray-400 font-medium">
                                    {mediaItems.length === 0
                                        ? 'Nenhum item'
                                        : `${mediaItems.length} ${mediaItems.length === 1 ? 'item' : 'itens'}`
                                    }
                                </span>
                            </div>
                        </div>

                        {/* Conteúdo Rolável */}
                        <div className="w-full flex-1 overflow-y-auto flex flex-col px-6 pb-8 min-h-0">

                            {/* Grid de thumbnails */}
                            {mediaItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-300">
                                        <svg width="28" height="28" viewBox="0 0 18 18" fill="none">
                                            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                                            <rect x="11" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                                            <rect x="1" y="11" width="6" height="6" rx="1.5" fill="currentColor"/>
                                            <rect x="11" y="11" width="6" height="6" rx="1.5" fill="currentColor"/>
                                        </svg>
                                    </div>
                                    <p className="text-gray-400 text-sm font-medium text-center">
                                        Nenhuma imagem ou vídeo enviado ainda
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-1">
                                    {mediaItems.map((item, idx) => (
                                        <button
                                            key={idx}
                                            className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 active:opacity-70 transition-opacity"
                                            onClick={() => {
                                                setGalleryVisible(false);
                                                setFullscreenIndex(idx);
                                            }}
                                        >
                                            <img
                                                src={item.thumbnailUrl || item.url}
                                                alt={`Mídia ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {item.isVideo && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-8 h-8 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                                            <path d="M8 5v14l11-7z"/>
                                                        </svg>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Modal de crédito promocional (cupom) resgatado */}
            {couponClaimModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 select-none no-select">
                    <div
                        className="absolute inset-0 bg-purple-950/35 backdrop-blur-[2px] animate-in fade-in duration-200"
                        onClick={() => setCouponClaimModal(false)}
                    />
                    <div className="relative w-full max-w-[360px] animate-in fade-in slide-in-from-bottom-6 zoom-in-95 duration-300">
                        <div className="relative overflow-hidden rounded-[28px] border border-purple-100 bg-white text-gray-900 shadow-2xl">
                            <button
                                type="button"
                                aria-label="Fechar"
                                onClick={() => setCouponClaimModal(false)}
                                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>

                            <div className="h-1.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-500" />

                            <div className="px-6 pb-6 pt-7">
                                <div className="mb-5 flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                                            <line x1="2" y1="10" x2="22" y2="10"></line>
                                        </svg>
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
                                                {((couponClaimAmount ?? 5000) / 100).toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                    maximumFractionDigits: 0,
                                                })}
                                            </p>
                                        </div>
                                        <svg className="mb-1 shrink-0 text-emerald-500" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                    </div>
                                    <div className="mt-4 h-px bg-purple-100" />
                                    <p className="mt-4 text-sm leading-relaxed text-gray-600">
                                        O valor já entrou no seu saldo e pode ser usado nas conversas e conteúdos do app.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setCouponClaimModal(false)}
                                    className="w-full rounded-2xl bg-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition-colors hover:bg-purple-700 active:scale-[0.99]"
                                >
                                    Continuar no chat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
