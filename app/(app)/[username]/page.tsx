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
                    const totalRechargeInReais = totalRecharge;
                    const totalSpentWithMe = (relationshipStats.totalSpent ?? 0) / 100;
                    const hasGift = relationshipStats.hasEverSentGift ?? false;
                    const openCount = relationshipStats.messageOpenRate90 ?? 0;
                    const totalSent = relationshipStats.last10MessagesSentCount ?? 0;
                    const isVeryAttentive = totalSent >= 5 && openCount >= Math.ceil(totalSent * 0.9);

                    type ClientLevel = {
                        label: string;
                        sublabel: string;
                        gradient: string;
                        iconBg: string;
                        textColor: string;
                        subtextColor: string;
                        icon: React.ReactNode;
                        pillBg: string;
                        pillText: string;
                    };

                    const getLevel = (): ClientLevel => {
                        if (totalRechargeInReais <= 0) return {
                            label: 'Novo',
                            sublabel: 'Ainda não fez recargas nos últimos 30 dias',
                            gradient: 'from-slate-100 to-slate-50',
                            iconBg: 'bg-slate-200/80',
                            textColor: 'text-slate-700',
                            subtextColor: 'text-slate-400',
                            pillBg: 'bg-slate-200',
                            pillText: 'text-slate-600',
                            icon: (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                                </svg>
                            )
                        };
                        if (totalRechargeInReais <= 100) return {
                            label: 'Bronze',
                            sublabel: 'Até R$ 100 recarregados nos últimos 30 dias',
                            gradient: 'from-amber-100 via-orange-50 to-amber-50',
                            iconBg: 'bg-amber-200/70',
                            textColor: 'text-amber-900',
                            subtextColor: 'text-amber-600/80',
                            pillBg: 'bg-amber-200',
                            pillText: 'text-amber-800',
                            icon: (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-amber-600">
                                    <path d="M12 2L9.1 9.1H2L7.5 13.5L5.5 20.5L12 16.5L18.5 20.5L16.5 13.5L22 9.1H14.9L12 2Z"/>
                                </svg>
                            )
                        };
                        if (totalRechargeInReais <= 500) return {
                            label: 'Prata',
                            sublabel: 'R$ 100 a R$ 500 recarregados nos últimos 30 dias',
                            gradient: 'from-slate-200 via-slate-100 to-slate-50',
                            iconBg: 'bg-slate-300/60',
                            textColor: 'text-slate-800',
                            subtextColor: 'text-slate-500',
                            pillBg: 'bg-slate-300',
                            pillText: 'text-slate-700',
                            icon: (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-slate-500">
                                    <path d="M12 2L9.1 9.1H2L7.5 13.5L5.5 20.5L12 16.5L18.5 20.5L16.5 13.5L22 9.1H14.9L12 2Z"/>
                                </svg>
                            )
                        };
                        if (totalRechargeInReais <= 1000) return {
                            label: 'Ouro',
                            sublabel: 'R$ 500 a R$ 1.000 recarregados nos últimos 30 dias',
                            gradient: 'from-yellow-200 via-amber-100 to-yellow-50',
                            iconBg: 'bg-yellow-300/70',
                            textColor: 'text-yellow-900',
                            subtextColor: 'text-yellow-700/80',
                            pillBg: 'bg-yellow-300',
                            pillText: 'text-yellow-900',
                            icon: <Crown className="w-[22px] h-[22px] text-yellow-600" />
                        };
                        return {
                            label: 'VIP',
                            sublabel: 'Mais de R$ 1.000 recarregados nos últimos 30 dias',
                            gradient: 'from-purple-200 via-violet-100 to-purple-50',
                            iconBg: 'bg-purple-300/60',
                            textColor: 'text-purple-900',
                            subtextColor: 'text-purple-600/80',
                            pillBg: 'bg-purple-300',
                            pillText: 'text-purple-900',
                            icon: <Crown className="w-[22px] h-[22px] text-purple-600" />
                        };
                    };

                    const level = getLevel();

                    return (
                        <div className="w-full max-w-md mt-5 z-10 animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-3">

                            {/* Card de Nível — visual rico com gradiente */}
                            <div className={`w-full rounded-3xl bg-gradient-to-br ${level.gradient} overflow-hidden shadow-md`}>
                                <div className="px-5 pt-5 pb-4">
                                    {/* Topo: label e pill */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Nível do Cliente</span>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${level.pillBg} ${level.pillText}`}>
                                            {level.label}
                                        </span>
                                    </div>

                                    {/* Centro: ícone + nome do nível */}
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl ${level.iconBg} flex items-center justify-center shadow-sm flex-shrink-0`}>
                                            {level.icon}
                                        </div>
                                        <div>
                                            <p className={`text-2xl font-black tracking-tight leading-none ${level.textColor}`}>{level.label}</p>
                                            <p className={`text-xs font-medium mt-1 leading-tight ${level.subtextColor}`}>{level.sublabel}</p>
                                        </div>
                                    </div>

                                    {/* Rodapé: divisor + gasto comigo */}
                                    <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gastou com você</span>
                                        <span className="text-base font-black text-purple-700">
                                            {totalSpentWithMe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Seção de Conquistas */}
                            <div className="w-full bg-white/90 backdrop-blur-md border border-slate-100/80 rounded-3xl overflow-hidden shadow-sm">
                                <div className="px-5 pt-4 pb-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Conquistas</span>
                                </div>

                                {/* Badge: Primeiro Mimo */}
                                <div className={`mx-3 mb-3 mt-2 rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                                    hasGift
                                        ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200'
                                        : 'bg-slate-50/80 border-slate-100'
                                }`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                        hasGift
                                            ? 'bg-gradient-to-br from-pink-400 to-rose-500 shadow-md shadow-pink-300/40'
                                            : 'bg-slate-200/70'
                                    }`}>
                                        {hasGift ? (
                                            <Gift className="w-5 h-5 text-white" />
                                        ) : (
                                            <Lock className="w-4 h-4 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-black leading-tight ${hasGift ? 'text-rose-700' : 'text-slate-400'}`}>
                                                Primeiro Mimo
                                            </p>
                                            {hasGift && (
                                                <span className="text-[9px] font-black uppercase tracking-wider bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">Conquistado</span>
                                            )}
                                        </div>
                                        <p className={`text-[11px] font-medium mt-0.5 leading-tight ${hasGift ? 'text-rose-500/80' : 'text-slate-400'}`}>
                                            {hasGift ? 'Enviou pelo menos um presente' : 'Ainda não enviou nenhum presente'}
                                        </p>
                                    </div>
                                </div>

                                {/* Badge: Muito Atento */}
                                <div className={`mx-3 mb-3 rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                                    isVeryAttentive
                                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
                                        : 'bg-slate-50/80 border-slate-100'
                                }`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                        isVeryAttentive
                                            ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-300/40'
                                            : 'bg-slate-200/70'
                                    }`}>
                                        {isVeryAttentive ? (
                                            <Eye className="w-5 h-5 text-white" />
                                        ) : (
                                            <Lock className="w-4 h-4 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-black leading-tight ${isVeryAttentive ? 'text-emerald-700' : 'text-slate-400'}`}>
                                                Muito Atento
                                            </p>
                                            {isVeryAttentive && (
                                                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">Conquistado</span>
                                            )}
                                        </div>
                                        <p className={`text-[11px] font-medium mt-0.5 leading-tight ${isVeryAttentive ? 'text-emerald-600/80' : 'text-slate-400'}`}>
                                            {isVeryAttentive
                                                ? `Abriu ${openCount} das últimas ${totalSent} mensagens suas`
                                                : 'Abre menos de 90% das suas mensagens'}
                                        </p>
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
