'use client';

import { useFreeIntro } from '@/hooks/useFreeIntro';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ProfessionalProfilePresentation, ProfilePhoto, type ProfileGalleryItem } from '@/components/ProfessionalProfilePresentation';
import { SubscribeModal } from '@/components/SubscribeModal';
import { useUserByUsername, usePublicGallery, useSubscribe, useMyProfile } from '@/hooks/useQueries';
import { UserX, Lock, Eye, X, ChevronLeft, ChevronRight, ShieldCheck, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { trackAcquisitionEvent } from '@/lib/clientAcquisitionAnalytics';
import { emitCampaignTelemetry } from '@/lib/campaignTelemetry';

interface UserProfilePageProps {
    params?: Promise<{ username: string }>;
    username?: string;
    initialUser?: any;
    onBack?: () => void;
    isSubPage?: boolean;
    isClosing?: boolean;
}

type PublicProfileGalleryItem = ProfileGalleryItem;

export default function UserProfilePage({ params, username: propUsername, initialUser, onBack, isSubPage = false }: UserProfilePageProps) {
    const router = useTransitionRouter();
    const [viewerItems, setViewerItems] = useState<PublicProfileGalleryItem[]>([]);
    const [activeViewerIndex, setActiveViewerIndex] = useState<number | null>(null);
    const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
    const [viewerDragOffset, setViewerDragOffset] = useState(0);
    const [viewerIsDragging, setViewerIsDragging] = useState(false);
    const [viewerIsAnimating, setViewerIsAnimating] = useState(false);
    const [startingTeamChat, setStartingTeamChat] = useState(false);
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

    const { data: fetchedUser, isLoading, isError } = useUserByUsername(decodedUsername);
    const user = fetchedUser || initialUser;
    const { data: freeIntro } = useFreeIntro(user?.clerkId);
    const { data: me } = useMyProfile();
    const { data: galleryData, isLoading: loadingGallery } = usePublicGallery(user?.clerkId);
    const subscribeMutation = useSubscribe();

    const isSubscriber = galleryData?.isSubscriber;
    const isOwner = galleryData?.isOwner || (!!me?.clerkId && me.clerkId === user?.clerkId);
    const hasChat = !!galleryData?.hasChat;
    // Um usuário nunca pode conversar consigo mesmo, nem com outro usuário do mesmo tipo.
    // Profissionais só podem conversar com clientes se a conversa já tiver sido iniciada pelo cliente.
    const sameUserType = !!me && !!user && !me.isTeam && !user.isTeam && !!me.isProfessional === !!user.isProfessional;
    const canMessage = !isOwner && !sameUserType && (!me?.isProfessional || hasChat || me?.isTeam);
    const teamActivationContact = user?.teamActivationContact;
    const isBlockedByOtherTeamMember = Boolean(
        me?.isTeam &&
        user?.isProfessional &&
        teamActivationContact?.assignedTeamMemberId &&
        !teamActivationContact?.isAssignedToCurrentTeamMember
    );
    const showSubscribeButton = user?.isProfessional && user?.isSubscriptionEnabled && !isSubscriber && !isOwner;

    useEffect(() => {
        if (!user?.clerkId || typeof window === 'undefined') return;
        const search = new URLSearchParams(window.location.search);
        if (search.get('ref') !== user.clerkId) return;

        trackAcquisitionEvent({
            eventType: 'link_viewed',
            professionalId: user.clerkId,
            metadata: {
                utmSource: search.get('utm_source') || '',
                utmMedium: search.get('utm_medium') || '',
                utmCampaign: search.get('utm_campaign') || '',
            },
        });
        if (user?.clerkId) {
            emitCampaignTelemetry({
                eventType: 'profile_view',
                professionalId: user.clerkId,
                username: user.username,
                name: user.name,
            });
        }
    }, [user?.clerkId, user?.username, user?.name]);

    const handleMessageClick = async () => {
        if (!user || isBlockedByOtherTeamMember) return;

        if (user.clerkId) {
            emitCampaignTelemetry({
                eventType: 'message_click',
                professionalId: user.clerkId,
                username: user.username,
            });
        }

        if (me?.isTeam && user.isProfessional) {
            setStartingTeamChat(true);
            try {
                const res = await fetch('/api/team/activation/start-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ professionalId: user.clerkId }),
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    toast.error(data?.error || 'Erro ao abrir conversa.');
                    return;
                }

                router.push(`/chat/${user.username || user.clerkId}`, { initialUser: user });
            } catch (err) {
                console.error('Erro ao abrir conversa de ativacao:', err);
                toast.error('Falha de conexao.');
            } finally {
                setStartingTeamChat(false);
            }
            return;
        }

        router.push(`/chat/${user.username || user.clerkId}`, { initialUser: user });
    };

    const publicGalleryItems = useMemo<PublicProfileGalleryItem[]>(() => {
        const items: PublicProfileGalleryItem[] = Array.isArray(galleryData?.items) ? galleryData.items : [];
        const photos = items.filter(item => item.visibility !== 'subscribers' && item.galleryType !== 'private' && item.mediaType !== 'video' && item.imageUrl);
        const candidates = user?.photoUrl ? [{ _id: 'profile-photo', imageUrl: user.photoUrl }, ...photos] : photos;
        const seen = new Set<string>();
        return candidates.filter(item => {
            if (seen.has(item.imageUrl)) return false;
            seen.add(item.imageUrl);
            return true;
        });
    }, [galleryData?.items, user?.photoUrl]);

    const exclusiveGalleryItems = useMemo<PublicProfileGalleryItem[]>(() => {
        const items: PublicProfileGalleryItem[] = Array.isArray(galleryData?.items) ? galleryData.items : [];
        const privateItems: PublicProfileGalleryItem[] = (isSubscriber || isOwner) && Array.isArray(galleryData?.privateItems) ? galleryData.privateItems : [];
        return [...items.filter(item => item.visibility === 'subscribers' || item.galleryType === 'private'), ...privateItems];
    }, [galleryData?.items, galleryData?.privateItems, isSubscriber, isOwner]);

    const currentGalleryItems = viewerItems;

    const activeViewerItem = activeViewerIndex !== null ? currentGalleryItems[activeViewerIndex] : null;
    const hasPreviousViewerItem = activeViewerIndex !== null && activeViewerIndex > 0;
    const hasNextViewerItem = activeViewerIndex !== null && activeViewerIndex < currentGalleryItems.length - 1;
    const previousViewerItem = hasPreviousViewerItem ? currentGalleryItems[activeViewerIndex - 1] : null;
    const nextViewerItem = hasNextViewerItem ? currentGalleryItems[activeViewerIndex + 1] : null;
    const viewerTransitionMs = 220;
    const isGalleryItemLocked = useCallback((item: PublicProfileGalleryItem | null) => {
        return !!item && (item.visibility === 'subscribers' || item.galleryType === 'private') && !isSubscriber && !isOwner;
    }, [isOwner, isSubscriber]);

    const openViewer = useCallback((items: PublicProfileGalleryItem[], index: number) => {
        setViewerItems(items);
        setActiveViewerIndex(index);

        if (user?.clerkId) {
            emitCampaignTelemetry({
                eventType: 'photo_view',
                professionalId: user.clerkId,
                username: user.username,
                photoIndex: index,
                totalPhotos: items.length,
            });
        }
    }, [user?.clerkId, user?.username]);

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

        if (user?.clerkId) {
            emitCampaignTelemetry({
                eventType: 'photo_view',
                professionalId: user.clerkId,
                username: user.username,
                photoIndex: nextIndex,
                totalPhotos: currentGalleryItems.length,
            });
        }

        viewerTransitionTimeoutRef.current = window.setTimeout(() => {
            setActiveViewerIndex(nextIndex);
            setViewerIsAnimating(false);
            setViewerDragOffset(0);
            viewerTransitionTimeoutRef.current = null;
        }, viewerTransitionMs);
    }, [activeViewerIndex, currentGalleryItems.length, user?.clerkId, user?.username]);

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

    if (!user && isLoading) {
        return (
            <div className={`flex flex-col bg-white animate-pulse ${layoutClass} ${animationClass}`}>
                <div className="h-[min(52svh,440px)] min-h-56 shrink-0 bg-gray-200" />
                <div className="mx-auto w-full max-w-2xl px-6 py-4">
                    <div className="mt-4 h-8 w-48 bg-gray-200 rounded-lg" />
                    <div className="mt-2 h-4 w-32 bg-gray-100 rounded-lg" />
                </div>
            </div>
        );
    }

    if ((isError && !user) || !user) {
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

    const relationshipStats = user.relationshipStats as {
        totalSpent?: number;
        hasEverSentGift?: boolean;
        messageOpenRate90?: number;
        last10MessagesSentCount?: number;
    } | undefined;



    return (
        <div className={`flex flex-col bg-slate-50 overflow-y-auto overflow-x-hidden pb-[calc(7rem+env(safe-area-inset-bottom))] no-scrollbar relative ${user.isProfessional ? 'lg:overflow-hidden lg:pb-0' : ''} ${layoutClass} ${animationClass}`}>
            {user.isProfessional ? (
                <ProfessionalProfilePresentation
                    key={user.clerkId}
                    user={user}
                    publicItems={publicGalleryItems}
                    exclusiveItems={exclusiveGalleryItems}
                    privateCount={(galleryData?.privatePhotosCount ?? 0) + (galleryData?.privateVideosCount ?? 0)}
                    isSubscriber={!!isSubscriber}
                    isOwner={!!isOwner}
                    loadingGallery={loadingGallery}
                    subscribing={subscribeMutation.isPending}
                    onBack={handleBack}
                    onSubscribe={handleSubscribe}
                    onOpen={openViewer}
                />
            ) : <>
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
                <div className="flex items-center gap-1.5 justify-center flex-wrap">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">
                        {user.name || `@${user.username}`}
                    </h1>
                    {user.isTeam && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Equipe Mimo ✓
                        </span>
                    )}
                    {user.isProfessional && user.identityStatus === 'approved' && (
                        <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                    )}
                </div>
                <p className="text-purple-600 font-bold text-sm tracking-wide mt-0.5">
                    @{user.username}
                </p>

                {user.isTeam && (
                    <div className="w-full max-w-sm mt-3 mb-2 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl text-left flex items-start gap-3">
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

                {/* Painel de Perfil do Cliente */}
                {me?.isProfessional && !user.isProfessional && relationshipStats && (() => {
                    const totalSpentWithMe = (relationshipStats.totalSpent ?? 0) / 100;
                    const hasGift = relationshipStats.hasEverSentGift ?? false;
                    const openCount = relationshipStats.messageOpenRate90 ?? 0;
                    const totalSent = relationshipStats.last10MessagesSentCount ?? 0;
                    const isVeryAttentive = totalSent >= 5 && openCount >= Math.ceil(totalSent * 0.9);
                    const hasAnyAchievement = hasGift || isVeryAttentive;

                    return (
                        <div className="w-full max-w-md mt-5 z-10 animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-3">
                            {/* Card de Resumo de Gastos com a Profissional */}
                            <div className="w-full rounded-3xl bg-white border border-slate-200/80 p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gastou com você</span>
                                    <span className="text-base font-black text-purple-700">
                                        {totalSpentWithMe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            </div>

                            {/* Seção de Conquistas (Apenas as conquistadas são exibidas) */}
                            {hasAnyAchievement && (
                                <div className="w-full bg-white/90 backdrop-blur-md border border-slate-100/80 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="px-5 pt-4 pb-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Conquistas</span>
                                    </div>

                                    {/* Badge: Primeiro Mimo */}
                                    {hasGift && (
                                        <div className="mx-3 mb-3 mt-2 rounded-2xl border p-4 flex items-center gap-4 transition-all bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-pink-400 to-rose-500 shadow-md shadow-pink-300/40">
                                                <Gift className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black leading-tight text-rose-700">
                                                        Primeiro Mimo
                                                    </p>
                                                    <span className="text-[9px] font-black uppercase tracking-wider bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">Conquistado</span>
                                                </div>
                                                <p className="text-[11px] font-medium mt-0.5 leading-tight text-rose-500/80">
                                                    Enviou pelo menos um presente
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Badge: Muito Atento */}
                                    {isVeryAttentive && (
                                        <div className="mx-3 mb-3 rounded-2xl border p-4 flex items-center gap-4 transition-all bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-300/40">
                                                <Eye className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black leading-tight text-emerald-700">
                                                        Muito Atento
                                                    </p>
                                                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">Conquistado</span>
                                                </div>
                                                <p className="text-[11px] font-medium mt-0.5 leading-tight text-emerald-600/80">
                                                    Abriu {openCount} das últimas {totalSent} mensagens suas
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    );
                })()}




            </div>
            </>}

            {canMessage && (
                <div className={`fixed bottom-0 left-0 right-0 z-30 border-t border-slate-100 bg-white/95 px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm ${user.isProfessional ? 'lg:left-1/2 lg:px-10 lg:py-5 xl:px-16' : ''}`}>
                    <div className="mx-auto w-full max-w-2xl">
                        <Button
                            title={isBlockedByOtherTeamMember ? 'Em atendimento' : startingTeamChat ? 'Abrindo...' : freeIntro?.eligible ? 'Conhecer grátis' : 'Enviar mensagem'}
                            onClick={handleMessageClick}
                            disabled={startingTeamChat || isBlockedByOtherTeamMember}
                            size="lg"
                            className="w-full"
                        />
                        {freeIntro?.eligible && <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">As primeiras {freeIntro.limit} respostas dela são grátis. Depois, você paga para ler.</p>}
                        {isBlockedByOtherTeamMember && <p className="mt-2 text-center text-xs text-slate-500">Em atendimento por {teamActivationContact?.assignedTeamMemberName || 'outro membro da equipe'}</p>}
                    </div>
                </div>
            )}

            {/* Visualizador fullscreen da galeria */}
            {typeof document !== 'undefined' && activeViewerItem && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black animate-in fade-in duration-200 select-none"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Visualizador de fotos"
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
                                        <div className="relative h-screen w-screen pointer-events-none">
                                            <ProfilePhoto src={item.imageUrl} alt="Midia da galeria em tela cheia" ambient />
                                        </div>
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
