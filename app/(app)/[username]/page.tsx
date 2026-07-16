'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SubscribeModal } from '@/components/SubscribeModal';
import { useUserByUsername, usePublicGallery, useSubscribe, useMyProfile } from '@/hooks/useQueries';
import { UserX, Camera, Lock, Eye, EyeOff, X, ChevronLeft, ChevronRight, ShieldCheck, Crown, Gift } from 'lucide-react';

interface UserProfilePageProps {
    params?: Promise<{ username: string }>;
    username?: string;
    onBack?: () => void;
    isSubPage?: boolean;
    isClosing?: boolean;
}

interface PublicProfileGalleryItem {
    _id: string;
    imageUrl: string;
    mediaType?: 'image' | 'video' | string;
    visibility?: 'public' | 'subscribers';
    galleryType?: 'public' | 'private';
}

export default function UserProfilePage({ params, username: propUsername, onBack, isSubPage = false, isClosing = false }: UserProfilePageProps) {
    const router = useTransitionRouter();
    const [activeGalleryTab, setActiveGalleryTab] = useState<'public' | 'private'>('public');
    const [revealedItems, setRevealedItems] = useState<Record<string, boolean>>({});
    const [activeViewerIndex, setActiveViewerIndex] = useState<number | null>(null);
    const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
    const [viewerDragOffset, setViewerDragOffset] = useState(0);
    const [viewerIsDragging, setViewerIsDragging] = useState(false);
    const [viewerIsAnimating, setViewerIsAnimating] = useState(false);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const viewerTransitionTimeoutRef = useRef<number | null>(null);

    let resolvedUsername = '';
    if (propUsername) {
        resolvedUsername = propUsername;
    } else if (params) {
        const resolvedParams = React.use(params);
        resolvedUsername = resolvedParams.username;
    }

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const transitionWindow = window as Window & {
                __resolveTransition?: (() => void) | null;
            };

            if (transitionWindow.__resolveTransition) {
                transitionWindow.__resolveTransition();
                transitionWindow.__resolveTransition = null;
            }
        }
    }, []);

    // Decodifica e remove o @ caso o usuário tenha digitado com ele na URL
    const decodedUsername = decodeURIComponent(resolvedUsername).replace('@', '');

    const { data: user, isLoading, isError } = useUserByUsername(decodedUsername);
    const { data: me } = useMyProfile();
    const { data: galleryData, isLoading: loadingGallery } = usePublicGallery(user?.clerkId);
    const subscribeMutation = useSubscribe();

    const isSubscriber = galleryData?.isSubscriber;
    const isOwner = galleryData?.isOwner;
    // Um usuário nunca pode conversar consigo mesmo, nem com outro usuário do mesmo tipo
    // (profissional com profissional, cliente com cliente).
    const sameUserType = !!me && !!user && !!me.isProfessional === !!user.isProfessional;
    const canMessage = !isOwner && !sameUserType;
    const showSubscribeButton = user?.isProfessional && user?.isSubscriptionEnabled && !isSubscriber && !isOwner;

    const currentGalleryItems = useMemo<PublicProfileGalleryItem[]>(() => {
        const items = activeGalleryTab === 'public'
            ? (galleryData?.items ?? [])
            : (galleryData?.privateItems ?? []);

        return Array.isArray(items) ? items as PublicProfileGalleryItem[] : [];
    }, [activeGalleryTab, galleryData?.items, galleryData?.privateItems]);

    const activeViewerItem = activeViewerIndex !== null ? currentGalleryItems[activeViewerIndex] : null;
    const hasPreviousViewerItem = activeViewerIndex !== null && activeViewerIndex > 0;
    const hasNextViewerItem = activeViewerIndex !== null && activeViewerIndex < currentGalleryItems.length - 1;
    const previousViewerItem = hasPreviousViewerItem ? currentGalleryItems[activeViewerIndex - 1] : null;
    const nextViewerItem = hasNextViewerItem ? currentGalleryItems[activeViewerIndex + 1] : null;
    const viewerTransitionMs = 220;
    const isGalleryItemLocked = useCallback((item: PublicProfileGalleryItem | null) => {
        return !!item && item.visibility === 'subscribers' && !isSubscriber && !isOwner;
    }, [isOwner, isSubscriber]);

    const openViewer = useCallback((itemId: string) => {
        const index = currentGalleryItems.findIndex((item) => item._id === itemId);
        if (index >= 0) {
            setActiveViewerIndex(index);
        }
    }, [currentGalleryItems]);

    const closeViewer = useCallback(() => {
        setActiveViewerIndex(null);
        setViewerDragOffset(0);
        setViewerIsDragging(false);
        setViewerIsAnimating(false);
    }, []);

    const animateViewerToIndex = useCallback((nextIndex: number) => {
        if (activeViewerIndex === null || nextIndex === activeViewerIndex) return;

        if (viewerTransitionTimeoutRef.current !== null) {
            window.clearTimeout(viewerTransitionTimeoutRef.current);
        }

        const viewportWidth = window.innerWidth || 1;
        const directionOffset = nextIndex > activeViewerIndex ? -viewportWidth : viewportWidth;

        setViewerIsDragging(false);
        setViewerIsAnimating(true);
        setViewerDragOffset(directionOffset);

        viewerTransitionTimeoutRef.current = window.setTimeout(() => {
            setActiveViewerIndex(nextIndex);
            setViewerIsAnimating(false);
            setViewerDragOffset(0);
            viewerTransitionTimeoutRef.current = null;
        }, viewerTransitionMs);
    }, [activeViewerIndex]);

    const showPreviousViewerItem = useCallback(() => {
        if (activeViewerIndex !== null && activeViewerIndex > 0) {
            animateViewerToIndex(activeViewerIndex - 1);
        }
    }, [activeViewerIndex, animateViewerToIndex]);

    const showNextViewerItem = useCallback(() => {
        if (activeViewerIndex !== null && activeViewerIndex < currentGalleryItems.length - 1) {
            animateViewerToIndex(activeViewerIndex + 1);
        }
    }, [activeViewerIndex, animateViewerToIndex, currentGalleryItems.length]);

    const handleViewerTouchStart = (e: React.TouchEvent) => {
        if (viewerTransitionTimeoutRef.current !== null) return;

        touchStartX.current = e.targetTouches[0].clientX;
        touchEndX.current = e.targetTouches[0].clientX;
        setViewerIsDragging(true);
        setViewerIsAnimating(false);
    };

    const handleViewerTouchMove = (e: React.TouchEvent) => {
        if (viewerTransitionTimeoutRef.current !== null) return;

        const currentX = e.targetTouches[0].clientX;
        const rawOffset = currentX - touchStartX.current;
        const isPullingPastStart = rawOffset > 0 && !hasPreviousViewerItem;
        const isPullingPastEnd = rawOffset < 0 && !hasNextViewerItem;
        const resistedOffset = isPullingPastStart || isPullingPastEnd ? rawOffset * 0.28 : rawOffset;

        touchEndX.current = currentX;
        setViewerDragOffset(resistedOffset);
    };

    const handleViewerTouchEnd = useCallback(() => {
        if (viewerTransitionTimeoutRef.current !== null) return;

        const diffX = touchStartX.current - touchEndX.current;
        const viewportWidth = window.innerWidth || 1;
        const minSwipeDistance = Math.min(90, viewportWidth * 0.18);

        if (diffX > minSwipeDistance && hasNextViewerItem) {
            showNextViewerItem();
        } else if (diffX < -minSwipeDistance && hasPreviousViewerItem) {
            showPreviousViewerItem();
        } else {
            setViewerIsAnimating(true);
            setViewerDragOffset(0);

            viewerTransitionTimeoutRef.current = window.setTimeout(() => {
                setViewerIsAnimating(false);
                viewerTransitionTimeoutRef.current = null;
            }, viewerTransitionMs);
        }

        touchStartX.current = 0;
        touchEndX.current = 0;
        setViewerIsDragging(false);
    }, [hasNextViewerItem, hasPreviousViewerItem, showNextViewerItem, showPreviousViewerItem]);

    useEffect(() => {
        return () => {
            if (viewerTransitionTimeoutRef.current !== null) {
                window.clearTimeout(viewerTransitionTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (activeViewerIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeViewer();
            } else if (e.key === 'ArrowLeft') {
                showPreviousViewerItem();
            } else if (e.key === 'ArrowRight') {
                showNextViewerItem();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeViewerIndex, closeViewer, showNextViewerItem, showPreviousViewerItem]);

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    const handleSubscribe = () => {
        if (!user) return;
        setIsSubscribeModalOpen(true);
    };

    const handleViewerSubscribe = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleSubscribe();
    };

    const handleSubscribeConfirm = async () => {
        if (!user) throw new Error('Perfil não encontrado');
        await subscribeMutation.mutateAsync(user.clerkId);
    };

    const layoutClass = isSubPage
        ? 'fixed inset-0 z-50 w-full h-full'
        : 'w-full h-full';

    const animationClass = ''; // A div externa do layout já gerencia as animações de slide-in/out da subpágina

    if (isLoading) {
        return (
            <div className={`flex flex-col bg-white animate-pulse ${layoutClass} ${animationClass}`}>
                <div className="h-48 bg-gray-200" />
                <div className="px-6 -mt-12 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gray-300 border-4 border-white shadow-lg" />
                    <div className="mt-4 h-8 w-48 bg-gray-200 rounded-lg" />
                    <div className="mt-2 h-4 w-32 bg-gray-100 rounded-lg" />
                </div>
            </div>
        );
    }

    if (isError || !user) {
        return (
            <div className={`flex flex-col items-center justify-center p-8 text-center bg-white ${layoutClass} ${animationClass}`}>
                <div className="w-24 h-24 bg-purple-50/50 rounded-full flex items-center justify-center mb-6 border border-purple-100/50">
                    <UserX className="w-10 h-10 text-purple-300" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Pessoa não encontrada</h1>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">O perfil que você está tentando acessar não existe,<br/>é do mesmo modo que o seu ou foi removido.</p>
                <button 
                    onClick={handleBack}
                    className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                >
                    Voltar para Conversa
                </button>
            </div>
        );
    }

    const relationshipStats = (user as any).relationshipStats;



    return (
        <div className={`flex flex-col bg-slate-50 overflow-y-auto overflow-x-hidden pb-28 no-scrollbar relative ${layoutClass} ${animationClass}`}>
            {/* Efeito de Fundo Aurora (Esferas Desfocadas Modernas) */}
            <div className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] rounded-full bg-purple-400/15 blur-[100px] pointer-events-none select-none z-0" />
            <div className="absolute top-[35%] right-[-15%] w-[300px] h-[300px] rounded-full bg-pink-400/12 blur-[90px] pointer-events-none select-none z-0" />
            <div className="absolute bottom-[15%] left-[-15%] w-[280px] h-[280px] rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none select-none z-0" />
            
            {/* Textura Geométrica Discreta (Bolinhas Lavanda) */}
            <div 
                className="absolute inset-0 pointer-events-none select-none z-0" 
                style={{ 
                    backgroundImage: 'radial-gradient(#E9D5FF 1.5px, transparent 1.5px)', 
                    backgroundSize: '20px 20px',
                    opacity: 0.4
                }} 
            />

            {/* Cover and Header */}
            <div className="relative shrink-0 z-10">
                <div className="relative h-44 w-full overflow-hidden bg-purple-50 shadow-inner">
                    {user.coverUrl ? (
                        <img 
                            src={user.coverUrl} 
                            alt="Foto de capa" 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-500" />
                    )}
                </div>
                <button 
                    onClick={handleBack}
                    className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/30 transition-all active:scale-90 z-20"
                    title="Voltar"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                
                <div className="px-6 -mt-14 flex flex-col items-center relative z-10">
                    <div className="p-1.5 bg-white rounded-full shadow-2xl">
                        <Avatar uri={user.photoUrl} size={110} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 mt-4 flex flex-col items-center">
                <div className="flex items-center gap-1.5 justify-center">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">
                        {user.name || `@${user.username}`}
                    </h1>
                    {user.isProfessional && user.identityStatus === 'approved' && (
                        <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                    )}
                </div>
                <p className="text-purple-600 font-bold text-sm tracking-wide mt-0.5">
                    @{user.username}
                </p>

                {/* Painel de Perfil do Cliente */}
                {me?.isProfessional && !user.isProfessional && relationshipStats && (() => {
                    const totalRecharge = relationshipStats.totalHistoricalRecharge ?? 0;
                    const totalRechargeInReais = totalRecharge / 100;
                    const totalSpentWithMe = (relationshipStats.totalSpent ?? 0) / 100;
                    const hasGift = relationshipStats.hasEverSentGift ?? false;
                    const openCount = relationshipStats.messageOpenRate90 ?? 0;
                    const totalSent = relationshipStats.last10MessagesSentCount ?? 0;
                    const isVeryAttentive = totalSent >= 5 && openCount >= Math.ceil(totalSent * 0.9);

                    // Determinar nível baseado no total histórico de recargas
                    type ClientLevel = {
                        label: string;
                        color: string;
                        bgColor: string;
                        borderColor: string;
                        textColor: string;
                        icon: React.ReactNode;
                        description: string;
                    };

                    const getLevel = (): ClientLevel => {
                        if (totalRechargeInReais <= 0) {
                            return {
                                label: 'Novo',
                                color: '#64748b',
                                bgColor: 'bg-slate-50',
                                borderColor: 'border-slate-200',
                                textColor: 'text-slate-600',
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
                                description: 'Ainda não fez recargas'
                            };
                        }
                        if (totalRechargeInReais <= 100) {
                            return {
                                label: 'Bronze',
                                color: '#92400e',
                                bgColor: 'bg-amber-50',
                                borderColor: 'border-amber-200',
                                textColor: 'text-amber-800',
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.1 9.1H2L7.5 13.5L5.5 20.5L12 16.5L18.5 20.5L16.5 13.5L22 9.1H14.9L12 2Z" opacity="0.85"/></svg>,
                                description: 'Até R$ 100 em recargas'
                            };
                        }
                        if (totalRechargeInReais <= 500) {
                            return {
                                label: 'Prata',
                                color: '#475569',
                                bgColor: 'bg-slate-100',
                                borderColor: 'border-slate-300',
                                textColor: 'text-slate-700',
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.1 9.1H2L7.5 13.5L5.5 20.5L12 16.5L18.5 20.5L16.5 13.5L22 9.1H14.9L12 2Z"/></svg>,
                                description: 'R$ 100 a R$ 500 em recargas'
                            };
                        }
                        if (totalRechargeInReais <= 1000) {
                            return {
                                label: 'Ouro',
                                color: '#854d0e',
                                bgColor: 'bg-yellow-50',
                                borderColor: 'border-yellow-300',
                                textColor: 'text-yellow-800',
                                icon: <Crown width={18} height={18} />,
                                description: 'R$ 500 a R$ 1.000 em recargas'
                            };
                        }
                        return {
                            label: 'VIP',
                            color: '#6b21a8',
                            bgColor: 'bg-purple-50',
                            borderColor: 'border-purple-300',
                            textColor: 'text-purple-800',
                            icon: <Crown width={18} height={18} />,
                            description: 'Acima de R$ 1.000 em recargas'
                        };
                    };

                    const level = getLevel();

                    return (
                        <div className="w-full max-w-md mt-6 z-10 animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-3">

                            {/* Card principal: Nível do Cliente */}
                            <div className={`w-full ${level.bgColor} border ${level.borderColor} rounded-2xl p-4 shadow-sm`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${level.bgColor} border ${level.borderColor} shadow-sm`}
                                            style={{ color: level.color }}>
                                            {level.icon}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nível do Cliente</p>
                                            <p className={`text-lg font-black tracking-tight ${level.textColor}`}>{level.label}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gastou com você</p>
                                        <p className="text-base font-black text-purple-700">
                                            R$ {totalSpentWithMe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 mt-2">{level.description}</p>
                            </div>

                            {/* Seção de Conquistas/Badges */}
                            <div className="w-full bg-white/85 backdrop-blur-md border border-slate-100 rounded-2xl p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Conquistas</p>
                                <div className="grid grid-cols-2 gap-2.5">

                                    {/* Badge: Primeiro Mimo */}
                                    <div className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                                        hasGift
                                            ? 'bg-pink-50 border-pink-200 shadow-sm'
                                            : 'bg-slate-50 border-slate-100 opacity-50'
                                    }`}>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            hasGift ? 'bg-pink-100' : 'bg-slate-100'
                                        }`}>
                                            {hasGift ? (
                                                <Gift className="w-4 h-4 text-pink-500" />
                                            ) : (
                                                <Lock className="w-4 h-4 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-[11px] font-black leading-tight ${
                                                hasGift ? 'text-pink-700' : 'text-slate-400'
                                            }`}>Primeiro Mimo</p>
                                            <p className="text-[9px] font-medium text-slate-400 leading-tight mt-0.5">
                                                {hasGift ? 'Já enviou um presente' : 'Nunca enviou presente'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Badge: Muito Atento */}
                                    <div className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                                        isVeryAttentive
                                            ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                            : 'bg-slate-50 border-slate-100 opacity-50'
                                    }`}>
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                            isVeryAttentive ? 'bg-emerald-100' : 'bg-slate-100'
                                        }`}>
                                            {isVeryAttentive ? (
                                                <Eye className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <Lock className="w-4 h-4 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-[11px] font-black leading-tight ${
                                                isVeryAttentive ? 'text-emerald-700' : 'text-slate-400'
                                            }`}>Muito Atento</p>
                                            <p className="text-[9px] font-medium text-slate-400 leading-tight mt-0.5">
                                                {isVeryAttentive
                                                    ? `Abriu ${openCount} das últimas ${totalSent} msgs`
                                                    : 'Abre menos de 90% das msgs'}
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </div>

                        </div>
                    );
                })()}




                {/* Biografia do usuário */}
                {user.isProfessional && user.bio && (
                    <p className="mt-4 px-6 text-center text-xs text-slate-600 leading-relaxed max-w-sm italic font-medium z-10 animate-in fade-in duration-300">
                        "{user.bio}"
                    </p>
                )}

                {/* Painel Elegante de Estatísticas (Stats) para Credibilidade */}
                {user.isProfessional && (
                    <div className="w-full max-w-sm mt-5 flex flex-col items-center border-y border-slate-200/50 py-3.5 px-4 mb-4 z-10 bg-white/40 backdrop-blur-sm rounded-xl animate-in fade-in duration-300">
                        <div className="w-full grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center text-center border-r border-slate-200/50">
                                <span className="text-sm font-bold text-slate-800 tabular-nums">
                                    {(user as any).conversationsLastWeekCount || 0}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                    Conversas
                                </span>
                            </div>
                            <div className="flex flex-col items-center text-center border-r border-slate-200/50">
                                <span className="text-sm font-bold text-slate-800 tabular-nums">
                                    {((user as any).messagesLastWeekCount || 0).toLocaleString('pt-BR')}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                    Mensagens
                                </span>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <span className="text-sm font-bold text-slate-800 tabular-nums">
                                    {((user as any).mediaGiftsLastWeekCount || 0).toLocaleString('pt-BR')}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                    Mídia/presentes
                                </span>
                            </div>
                        </div>
                        <span className="text-[8px] font-semibold text-slate-400/80 tracking-wider mt-2.5 uppercase">
                            Últimos 7 dias
                        </span>
                    </div>
                )}


            </div>

            {/* Seletor de Abas da Galeria (apenas para o dono ou se for assinante e o recurso estiver habilitado) */}
            {user?.isProfessional && (isOwner || isSubscriber) ? (
                <div className="flex border-b border-purple-100/50 mb-2.5 px-6 shrink-0 z-10">
                    <button
                        onClick={() => setActiveGalleryTab('public')}
                        className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 text-center ${
                            activeGalleryTab === 'public'
                                ? 'border-purple-600 text-purple-600 font-bold'
                                : 'border-transparent text-gray-400'
                        }`}
                    >
                        Galeria Pública ({galleryData?.items?.length ?? 0})
                    </button>
                    <button
                        onClick={() => setActiveGalleryTab('private')}
                        className={`flex-1 pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 text-center ${
                            activeGalleryTab === 'private'
                                ? 'border-purple-600 text-purple-600 font-bold'
                                : 'border-transparent text-gray-400'
                        }`}
                    >
                        Galeria Privada ({galleryData?.privateItems?.length ?? 0})
                    </button>
                </div>
            ) : null}

            {/* Gallery section */}
            {user?.isProfessional && (
                <div className="mt-2 w-full shrink-0 z-10">
                    {loadingGallery ? (
                        <div className="grid grid-cols-3 gap-0.5 animate-pulse px-0.5">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="aspect-square bg-gray-100" />
                            ))}
                        </div>
                    ) : activeGalleryTab === 'public' ? (
                        (galleryData?.items?.length ?? 0) === 0 ? (
                            <div className="bg-white/50 rounded-2xl p-8 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center mx-6 mt-4 gap-1.5">
                                <Camera className="w-6 h-6 text-gray-300" />
                                <p className="text-xs text-gray-400 font-medium">Nenhuma foto na galeria ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-0.5 px-0.5">
                                {currentGalleryItems.map((item) => {
                                    const isLocked = item.visibility === 'subscribers' && !isSubscriber && !isOwner;
                                    const isOwnerSubscribersOnly = item.visibility === 'subscribers' && isOwner;
                                    const isOwnerLocked = isOwnerSubscribersOnly && !revealedItems[item._id];
                                    return (
                                        <div key={item._id} className="relative aspect-square overflow-hidden bg-gray-100 group">
                                            {isLocked || isOwnerLocked ? (
                                                <div 
                                                    onClick={() => {
                                                        if (isOwnerLocked) {
                                                            openViewer(item._id);
                                                        } else {
                                                            handleSubscribe();
                                                        }
                                                    }}
                                                    className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-500 flex flex-col items-center justify-center p-2.5 text-center select-none cursor-pointer"
                                                >
                                                    {/* Textura geométrica de bolinhas */}
                                                    <div 
                                                        className="absolute inset-0 opacity-[0.15]" 
                                                        style={{ 
                                                            backgroundImage: 'radial-gradient(#fff 1.5px, transparent 1.5px)', 
                                                            backgroundSize: '10px 10px' 
                                                        }} 
                                                    />
                                                    {/* Textura geométrica de linhas diagonais */}
                                                    <div 
                                                        className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(45deg,_rgba(255,255,255,0.15)_25%,_transparent_25%,_transparent_50%,_rgba(255,255,255,0.15)_50%,_rgba(255,255,255,0.15)_75%,_transparent_75%,_transparent)] bg-[size:16px_16px]" 
                                                    />
                                                    
                                                    {isOwnerLocked && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setRevealedItems(prev => ({ ...prev, [item._id]: true }));
                                                            }}
                                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/25 hover:bg-white/35 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md transition-all active:scale-90 z-20"
                                                            title="Revelar foto na galeria"
                                                        >
                                                            <Eye className="w-4 h-4 text-white" />
                                                        </button>
                                                    )}
                                                    
                                                    <div className="relative z-10 flex flex-col items-center gap-1">
                                                        <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">
                                                            Exclusivo
                                                        </span>
                                                        <span className="text-[7.5px] font-bold text-purple-100 uppercase tracking-wider leading-none block mt-0.5">
                                                            para assinantes
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div 
                                                    className="w-full h-full relative cursor-pointer"
                                                    onClick={() => openViewer(item._id)}
                                                >
                                                    <img
                                                        src={item.imageUrl}
                                                        alt="Gallery item"
                                                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                                                    />
                                                    {isOwnerSubscribersOnly && revealedItems[item._id] && (
                                                        <>
                                                            <div className="absolute bottom-2 left-2 bg-purple-600/90 text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 shadow-md z-10">
                                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                                </svg>
                                                                <span>Exclusivo</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRevealedItems(prev => ({ ...prev, [item._id]: false }));
                                                                }}
                                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-md transition-all active:scale-90 z-20"
                                                                title="Ocultar foto na galeria"
                                                            >
                                                                <EyeOff className="w-4 h-4 text-white" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        (galleryData?.privateItems?.length ?? 0) === 0 ? (
                            <div className="bg-white/50 rounded-2xl p-8 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center mx-6 mt-4 gap-1.5">
                                <Lock className="w-6 h-6 text-gray-300" />
                                <p className="text-xs text-gray-400 font-medium">Nenhuma mídia privada ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-0.5 px-0.5">
                                {currentGalleryItems.map((item) => (
                                    <div
                                        key={item._id}
                                        className="relative aspect-square overflow-hidden bg-gray-100 group cursor-pointer"
                                        onClick={() => openViewer(item._id)}
                                    >
                                        {item.mediaType === 'video' ? (
                                            <div className="w-full h-full relative">
                                                <video src={item.imageUrl} preload="metadata" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="opacity-80 drop-shadow-md">
                                                        <polygon points="5 3 19 12 5 21 5 3"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full">
                                                <img
                                                    src={item.imageUrl}
                                                    alt="Private Gallery item"
                                                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* O banner discretizado antigo foi removido por ter sido integrado ao bloco superior */}

            {/* Barra de Ações Flutuante no Rodapé */}
            {(showSubscribeButton || canMessage) && (
                <div className="fixed bottom-6 left-4 right-4 z-30 flex justify-center pointer-events-none">
                    <div className="w-full max-w-md flex gap-3 px-2 pointer-events-auto">
                        {showSubscribeButton && (
                            <button
                                onClick={handleSubscribe}
                                disabled={subscribeMutation.isPending}
                                className={`${canMessage ? 'flex-[3]' : 'w-full'} py-3.5 px-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30`}
                            >
                                <span>Assinar por R$ {user.subscriptionPrice?.toFixed(2)}</span>
                            </button>
                        )}
                        {canMessage && (
                            <button
                                onClick={() => router.push(`/chat/${user.clerkId}`)}
                                className={showSubscribeButton
                                    ? "flex-[2] py-3.5 px-4 bg-white/95 hover:bg-gray-50 active:scale-[0.98] text-gray-800 border border-gray-200/80 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                                    : "w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-[0.98] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30"}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                                <span>{showSubscribeButton ? 'Mensagem' : 'Enviar Mensagem'}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Visualizador fullscreen da galeria */}
            {typeof document !== 'undefined' && activeViewerItem && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black animate-in fade-in duration-200 select-none"
                    role="dialog"
                    aria-modal="true"
                    onClick={closeViewer}
                >
                    <div
                        className="absolute inset-0 overflow-hidden bg-black"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={handleViewerTouchStart}
                        onTouchMove={handleViewerTouchMove}
                        onTouchEnd={handleViewerTouchEnd}
                        style={{ touchAction: 'none' }}
                    >
                        <div
                            className="flex h-full w-full will-change-transform"
                            style={{
                                transform: `translate3d(calc(-100% + ${viewerDragOffset}px), 0, 0)`,
                                transition: viewerIsDragging || !viewerIsAnimating
                                    ? 'none'
                                    : `transform ${viewerTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                            }}
                        >
                            {[previousViewerItem, activeViewerItem, nextViewerItem].map((item, slideIndex) => (
                                <div
                                    key={item?._id ?? `empty-${slideIndex}`}
                                    className="flex h-screen w-screen shrink-0 items-center justify-center bg-black"
                                >
                                    {isGalleryItemLocked(item) ? (
                                        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-purple-950 via-slate-950 to-fuchsia-950 px-6 text-center">
                                            <div
                                                className="absolute inset-0 opacity-[0.16]"
                                                style={{
                                                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
                                                    backgroundSize: '18px 18px'
                                                }}
                                            />
                                            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
                                            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />
                                            <div className="relative z-10 flex w-full max-w-xs flex-col items-center">
                                                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-white shadow-2xl shadow-purple-950/40 backdrop-blur-md">
                                                    <Lock className="h-7 w-7" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-purple-200">
                                                    Exclusivo
                                                </p>
                                                <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-white">
                                                    Conteúdo para assinantes
                                                </h2>
                                                <p className="mt-3 text-sm font-medium leading-relaxed text-white/70">
                                                    Assine o perfil para liberar esta mídia e acessar a galeria privada.
                                                </p>
                                                {showSubscribeButton && (
                                                    <button
                                                        onClick={handleViewerSubscribe}
                                                        disabled={subscribeMutation.isPending}
                                                        className="mt-6 h-12 w-full rounded-2xl bg-white px-5 text-sm font-black text-purple-700 shadow-xl shadow-black/25 transition-all hover:bg-purple-50 active:scale-[0.98] disabled:opacity-70"
                                                    >
                                                        {subscribeMutation.isPending ? 'Processando...' : `Assinar por R$ ${user.subscriptionPrice?.toFixed(2)}`}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : item?.mediaType === 'video' ? (
                                        <video
                                            src={item.imageUrl}
                                            controls={slideIndex === 1}
                                            autoPlay={slideIndex === 1}
                                            preload="metadata"
                                            className="h-screen w-screen object-contain bg-black"
                                        />
                                    ) : item ? (
                                        <img
                                            src={item.imageUrl}
                                            alt="Midia da galeria em tela cheia"
                                            className="h-screen w-screen object-contain pointer-events-none"
                                            draggable={false}
                                        />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 text-white flex items-center justify-center transition-all z-20 active:scale-95 border border-white/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            closeViewer();
                        }}
                        title="Fechar visualizacao"
                        aria-label="Fechar visualizacao"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {hasPreviousViewerItem && (
                        <button
                            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/45 hover:bg-black/70 active:scale-90 flex items-center justify-center text-white transition-all z-20 border border-white/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                showPreviousViewerItem();
                            }}
                            aria-label="Midia anterior"
                        >
                            <ChevronLeft className="w-7 h-7" />
                        </button>
                    )}

                    {hasNextViewerItem && (
                        <button
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/45 hover:bg-black/70 active:scale-90 flex items-center justify-center text-white transition-all z-20 border border-white/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                showNextViewerItem();
                            }}
                            aria-label="Proxima midia"
                        >
                            <ChevronRight className="w-7 h-7" />
                        </button>
                    )}

                    {currentGalleryItems.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white/90 border border-white/10 z-20">
                            {(activeViewerIndex ?? 0) + 1} de {currentGalleryItems.length}
                        </div>
                    )}
                </div>,
                document.body
            )}

            {/* Modal de Assinatura */}
            {user && (
                <SubscribeModal
                    isOpen={isSubscribeModalOpen}
                    onClose={() => setIsSubscribeModalOpen(false)}
                    onConfirm={handleSubscribeConfirm}
                    professional={{
                        name: user.name,
                        username: user.username,
                        photoUrl: user.photoUrl,
                        subscriptionPrice: user.subscriptionPrice,
                    }}
                    myBalance={me?.balance ?? 0}
                />
            )}
        </div>
    );
}
