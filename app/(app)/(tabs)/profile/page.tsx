'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { Avatar } from '@/components/Avatar';
import { useMyProfile, useUploadPhoto, useMyGallery, useUploadToGallery, useDeleteFromGallery, useDepositHistory, useChatRooms, useUpdateGalleryItemVisibility, useMySubscriptions, useCancelSubscription, type MySubscription } from '@/hooks/useQueries';
import { ImageCropper } from '@/components/ImageCropper';
import { usePayment } from '@/context/PaymentContext';
import { PullToRefresh } from '@/components';
import { ProfessionalProfilePresentation, type ProfileGalleryItem } from '@/components/ProfessionalProfilePresentation';
import { Settings, Share2, Image as ImageIcon, Lock, Trash2, Plus, AlertTriangle, ShieldCheck, ShieldAlert, Heart, Globe, Crown, Camera, Gift, CreditCard, QrCode, Star, X, MoreVertical, ChevronLeft, ChevronRight, ExternalLink, CalendarClock, AlertCircle, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildProfileShareUrl } from '@/lib/referral';
import { recordLinkShared } from '@/lib/clientAcquisitionAnalytics';

export default function ProfilePage() {
    const { user } = useUser();
    const router = useTransitionRouter();
    const { openRechargeModal } = usePayment();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const privateGalleryInputRef = useRef<HTMLInputElement>(null);

    const { data: userData, isLoading: loadingProfile, refetch: refetchProfile } = useMyProfile();
    const { data: galleryData, refetch: refetchGallery } = useMyGallery();
    const uploadPhotoMutation = useUploadPhoto();
    const uploadGalleryMutation = useUploadToGallery();
    const deleteGalleryMutation = useDeleteFromGallery();
    const updateGalleryItemVisibilityMutation = useUpdateGalleryItemVisibility();
    const { data: depositHistory, isLoading: loadingHistory, refetch: refetchHistory } = useDepositHistory();
    const { refetch: refetchRooms } = useChatRooms();
    const { data: subscriptionsData, refetch: refetchSubscriptions } = useMySubscriptions();
    const cancelSubscriptionMutation = useCancelSubscription();

    const onRefreshCreator = useCallback(async () => {
        await Promise.all([
            refetchProfile(),
            refetchGallery(),
            refetchRooms()
        ]);
    }, [refetchProfile, refetchGallery, refetchRooms]);

    const onRefreshClient = useCallback(async () => {
        await Promise.all([
            refetchProfile(),
            refetchHistory(),
            refetchSubscriptions(),
        ]);
    }, [refetchProfile, refetchHistory, refetchSubscriptions]);

    const onRefreshTeam = useCallback(async () => {
        await Promise.all([
            refetchProfile(),
            refetchRooms(),
        ]);
    }, [refetchProfile, refetchRooms]);

    const [localPhotoUrl, setLocalPhotoUrl] = useState<string | undefined>(undefined);
    const [activeGalleryTab, setActiveGalleryTab] = useState<'public' | 'private'>('public');
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [selectedVisibility, setSelectedVisibility] = useState<'public' | 'subscribers'>('public');
    const [visibilityModal, setVisibilityModal] = useState<{ open: boolean, file?: File }>({ open: false });
    const [cropperState, setCropperState] = useState<{ open: boolean; imageSrc: string; type: 'photo' | 'cover' } | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [showItemOptionsMenu, setShowItemOptionsMenu] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [managingSubscription, setManagingSubscription] = useState<MySubscription | null>(null);
    const [cancellingSubscriptionId, setCancellingSubscriptionId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const currentGalleryItems = activeGalleryTab === 'public'
        ? (galleryData?.publicItems ?? galleryData?.items ?? [])
        : (galleryData?.privateItems ?? []);

    const handleNextPhoto = useCallback(() => {
        if (!selectedItem) return;
        const currentIndex = currentGalleryItems.findIndex((item: any) => item._id === selectedItem._id);
        if (currentIndex !== -1 && currentIndex < currentGalleryItems.length - 1) {
            setSelectedItem(currentGalleryItems[currentIndex + 1]);
            setShowItemOptionsMenu(false);
        }
    }, [selectedItem, currentGalleryItems]);

    const handlePrevPhoto = useCallback(() => {
        if (!selectedItem) return;
        const currentIndex = currentGalleryItems.findIndex((item: any) => item._id === selectedItem._id);
        if (currentIndex > 0) {
            setSelectedItem(currentGalleryItems[currentIndex - 1]);
            setShowItemOptionsMenu(false);
        }
    }, [selectedItem, currentGalleryItems]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = useCallback(() => {
        const diffX = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 50;

        if (diffX > minSwipeDistance) {
            handleNextPhoto();
        } else if (diffX < -minSwipeDistance) {
            handlePrevPhoto();
        }

        touchStartX.current = 0;
        touchEndX.current = 0;
    }, [handleNextPhoto, handlePrevPhoto]);

    useEffect(() => {
        if (!selectedItem) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                handleNextPhoto();
            } else if (e.key === 'ArrowLeft') {
                handlePrevPhoto();
            } else if (e.key === 'Escape') {
                setSelectedItem(null);
                setShowItemOptionsMenu(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItem, handleNextPhoto, handlePrevPhoto]);

    useEffect(() => {
        if (userData) {
            if (userData.photoUrl) setLocalPhotoUrl(userData.photoUrl);
        }
    }, [userData]);

    const handleShare = async () => {
        if (typeof window === 'undefined' || !userData?.username) return;

        const profileUrl = buildProfileShareUrl(window.location.origin, userData.username, user?.id || userData.clerkId);
        const name       = userData.name || `@${userData.username}`;
        const shareText  = `Ei! Esse é meu perfil no MimoChat — ${name}. Me manda uma mensagem, adoro conversar! 💬`;

        // Web Share API: abre o sheet nativo do Android/iOS (requer HTTPS em produção)
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: `${name} no MimoChat`,
                    text: shareText,
                    url: profileUrl,
                });
                recordLinkShared('native_share');
                return;
            } catch (err: any) {
                // AbortError = usuário fechou o sheet sem compartilhar — comportamento normal
                if (err?.name === 'AbortError') return;
                // Qualquer outro erro cai no fallback abaixo
            }
        }

        // Fallback: copia o link para a área de transferência e mostra feedback
        try {
            await navigator.clipboard.writeText(`${shareText}\n\n${profileUrl}`);
            recordLinkShared('clipboard');
            toast.success('Link copiado! Cole no WhatsApp, e-mail ou onde preferir.');
        } catch {
            // sem permissão de clipboard — ignora silenciosamente
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setCropperState({
            open: true,
            imageSrc: previewUrl,
            type: 'photo'
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCropConfirm = async (croppedFile: File) => {
        if (!cropperState) return;
        
        const type = cropperState.type;
        setCropperState(null);

        const formData = new FormData();

        if (type === 'photo') {
            const previewUrl = URL.createObjectURL(croppedFile);
            setLocalPhotoUrl(previewUrl);
            formData.append('photo', croppedFile);

            try {
                const uploadResponse = await uploadPhotoMutation.mutateAsync(formData);
                if (uploadResponse.photoUrl) setLocalPhotoUrl(uploadResponse.photoUrl);
            } catch {
                if (userData?.photoUrl) setLocalPhotoUrl(userData.photoUrl);
            }
        }
    };

    const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSizeBytes = 8 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            alert('Esta imagem é muito grande. Escolha uma foto de no máximo 8MB.');
            if (galleryInputRef.current) galleryInputRef.current.value = '';
            return;
        }

        setSelectedVisibility('public');
        setVisibilityModal({ open: true, file });
    };

    const handlePrivateGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSizeBytes = 8 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            alert('Este arquivo é muito grande. Escolha um arquivo de no máximo 8MB.');
            if (privateGalleryInputRef.current) privateGalleryInputRef.current.value = '';
            return;
        }

        if (confirm(`Deseja adicionar este arquivo (${file.type.startsWith('video/') ? 'vídeo' : 'foto'}) à sua Galeria Privada?`)) {
            setUploadingGallery(true);
            const originalName = file.name || 'file.jpg';
            const extension = originalName.split('.').pop() || 'jpg';
            const cleanName = `private_${Date.now()}.${extension}`;

            const formData = new FormData();
            formData.append('photo', file, cleanName);
            formData.append('galleryType', 'private');
            formData.append('visibility', 'subscribers');

            try {
                await uploadGalleryMutation.mutateAsync(formData);
                if (privateGalleryInputRef.current) privateGalleryInputRef.current.value = '';
            } catch (error: any) {
                alert(error.message || 'Erro ao subir arquivo para galeria privada');
            } finally {
                setUploadingGallery(false);
            }
        } else {
            if (privateGalleryInputRef.current) privateGalleryInputRef.current.value = '';
        }
    };

    const confirmGalleryUpload = async (visibility: 'public' | 'subscribers') => {
        if (!visibilityModal.file) return;
        
        setUploadingGallery(true);
        const originalName = visibilityModal.file.name || 'photo.jpg';
        const extension = originalName.split('.').pop() || 'jpg';
        const cleanName = `public_${Date.now()}.${extension}`;

        const formData = new FormData();
        formData.append('photo', visibilityModal.file, cleanName);
        formData.append('visibility', visibility);
        formData.append('galleryType', 'public');

        try {
            await uploadGalleryMutation.mutateAsync(formData);
            setVisibilityModal({ open: false });
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        } catch (error: any) {
            alert(error.message || 'Erro ao subir foto para galeria');
        } finally {
            setUploadingGallery(false);
        }
    };

    const handleDeleteGalleryItem = async (itemId: string) => {
        if (!confirm('Tem certeza que deseja remover esta foto da sua galeria?')) return;
        try {
            await deleteGalleryMutation.mutateAsync(itemId);
        } catch (error: any) {
            alert(error.message || 'Erro ao deletar foto');
        }
    };

    if (loadingProfile && !userData) {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-slate-50 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-gray-200" />
            </div>
        );
    }

    const isProfessional = !!userData?.isProfessional;
    const isTeam = !!userData?.isTeam;
    const publicItemsCount = galleryData?.publicItems?.length ?? galleryData?.items?.length ?? 0;
    const publicExclusiveCount = (galleryData?.publicItems ?? galleryData?.items ?? []).filter((item: any) => item.visibility === 'subscribers').length;
    
    const minPublicPhotos = userData?.minPublicPhotos ?? 6;
    const maxPublicPhotos = userData?.maxPublicPhotos ?? 12;
    const minExclusivePhotos = userData?.minExclusivePhotos ?? 2;
    const maxExclusivePhotos = userData?.maxExclusivePhotos ?? 4;
    
    const publicGalleryIsComplete = 
        publicItemsCount >= minPublicPhotos && 
        publicItemsCount <= maxPublicPhotos && 
        publicExclusiveCount >= minExclusivePhotos && 
        publicExclusiveCount <= maxExclusivePhotos;

    // ─── LAYOUT CREATOR (PROFISSIONAL ESTILO TINDER) ─────────────────────────
    const publicGalleryItems = React.useMemo<ProfileGalleryItem[]>(() => {
        const rawItems: ProfileGalleryItem[] = Array.isArray(galleryData?.publicItems) 
            ? galleryData.publicItems 
            : Array.isArray(galleryData?.items) 
                ? galleryData.items.filter((item: any) => item.galleryType !== 'private' && item.visibility !== 'subscribers' && item.mediaType !== 'video') 
                : [];
        const candidates = userData?.photoUrl ? [{ _id: 'profile-photo', imageUrl: userData.photoUrl }, ...rawItems] : rawItems;
        const seen = new Set<string>();
        return candidates.filter(item => {
            if (seen.has(item.imageUrl)) return false;
            seen.add(item.imageUrl);
            return true;
        });
    }, [galleryData?.publicItems, galleryData?.items, userData?.photoUrl]);

    const exclusiveGalleryItems = React.useMemo<ProfileGalleryItem[]>(() => {
        return Array.isArray(galleryData?.privateItems) ? galleryData.privateItems : [];
    }, [galleryData?.privateItems]);

    if (isProfessional) {
        return (
            <div className="flex-1 flex flex-col min-h-0 bg-white relative max-w-full overflow-hidden">
                <PullToRefresh onRefresh={onRefreshCreator} className="no-scrollbar" contentClassName="pb-[calc(76px+env(safe-area-inset-bottom))]">
                    <ProfessionalProfilePresentation
                        key={userData?.id || 'creator-profile'}
                        user={{
                            name: userData?.name,
                            username: userData?.username || '',
                            photoUrl: userData?.photoUrl,
                            bio: userData?.bio,
                            identityStatus: userData?.identityStatus,
                            messagesLastWeekCount: userData?.messagesLastWeekCount,
                            isSubscriptionEnabled: userData?.isSubscriptionEnabled,
                            subscriptionPrice: userData?.subscriptionPrice,
                            chargePerCharSubscribers: userData?.chargePerCharSubscribers,
                            chargePerCharNonSubscribers: userData?.chargePerCharNonSubscribers,
                        }}
                        publicItems={publicGalleryItems}
                        exclusiveItems={exclusiveGalleryItems}
                        privateCount={exclusiveGalleryItems.length}
                        isSubscriber={false}
                        isOwner={true}
                        loadingGallery={loadingProfile}
                        subscribing={false}
                        headerActions={
                            <>
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    aria-label="Compartilhar perfil"
                                    className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-700 backdrop-blur-md hover:bg-white hover:text-purple-600 transition-all active:scale-95 shadow-md cursor-pointer"
                                    title="Compartilhar perfil"
                                >
                                    <Share2 size={20} />
                                </button>
                                
                                <div className="flex items-center gap-2 pointer-events-auto">
                                    <button
                                        type="button"
                                        onClick={() => router.push('/profile/edit')}
                                        aria-label="Editar perfil e fotos"
                                        title="Editar perfil e fotos"
                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-purple-700 backdrop-blur-md hover:bg-white hover:text-purple-800 transition-all active:scale-95 shadow-md cursor-pointer"
                                    >
                                        <Pencil size={20} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/settings')}
                                        aria-label="Configurações"
                                        title="Configurações"
                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-700 backdrop-blur-md hover:bg-white hover:text-purple-600 transition-all active:scale-95 shadow-md cursor-pointer"
                                    >
                                        <Settings size={20} />
                                    </button>
                                </div>
                            </>
                        }
                        onOpen={(items, index) => {
                            setSelectedItem(items[index]);
                        }}
                    />
                </PullToRefresh>

                {/* Modal fullscreen de visualização de foto */}
                {mounted && selectedItem && createPortal(
                    <div className="fixed inset-0 z-[9999] flex flex-col justify-between bg-black animate-in fade-in duration-200 select-none">
                        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-md z-10 shrink-0">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="w-10 h-10 rounded-full hover:bg-white/10 active:scale-75 flex items-center justify-center text-white transition-all duration-75 cursor-pointer"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <span className="text-white text-sm font-semibold">Visualizar Mídia</span>
                            <div className="w-10" />
                        </div>
                        <div className="flex-1 relative flex items-center justify-center bg-black w-full h-full p-4">
                            {selectedItem.mediaType === 'video' ? (
                                <video src={selectedItem.imageUrl} controls autoPlay className="w-full h-full max-h-[80vh] object-contain bg-black" />
                            ) : (
                                <img src={selectedItem.imageUrl} alt="Mídia" className="w-full h-full max-h-[80vh] object-contain" />
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    // ─── LAYOUT CLIENTE (COMUM COM SALDO E RECARGAS) ─────────────────────────
    const depositHistoryItems = (depositHistory?.transactions ?? []).map((tx) => ({
        id: tx.id,
        amount: tx.source === 'gift' ? tx.amount / 100 : tx.amount,
        createdAt: tx.createdAt,
        label: tx.source === 'gift'
            ? `Cupom${typeof tx.metadata?.giftCode === 'string' ? ` ${tx.metadata.giftCode}` : ''}`
            : tx.type === 'CC'
                ? 'Cartão de Crédito'
                : 'Pix',
        type: tx.source === 'gift' ? 'gift' : tx.type === 'CC' ? 'card' : 'pix'
    }));

    const teamMemberSince = userData?.createdAt
        ? new Date(userData.createdAt).toLocaleDateString('pt-BR')
        : 'Nao informado';

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden max-w-full">
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



            <PullToRefresh onRefresh={isTeam ? onRefreshTeam : onRefreshClient} className="px-4 pt-5 pb-24 max-w-md w-full mx-auto relative z-10" contentClassName="flex flex-col gap-4">
                {/* Informações Básicas / Perfil */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Avatar com Indicadores de Câmera e Online Posicionados sem Sobreposição */}
                        <div className="relative shrink-0">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="cursor-pointer group relative rounded-full"
                            >
                                <Avatar uri={localPhotoUrl} size={60} />
                                {/* Botão Câmera (Top Right) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                    disabled={uploadPhotoMutation.isPending}
                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-600 hover:bg-purple-700 active:scale-90 border-2 border-white flex items-center justify-center shadow-xs transition-all cursor-pointer z-20"
                                    title="Alterar foto de perfil"
                                >
                                    <Camera className="w-2.5 h-2.5 text-white" />
                                </button>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                            
                            {/* Ponto Verde Online (Bottom Right) sem sobreposição */}
                            <span 
                                className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0 shadow-2xs z-10 flex items-center justify-center" 
                                title="Você está online"
                            >
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            </span>
                        </div>
                        
                        {/* Informações do Usuário */}
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-slate-900 truncate leading-tight">
                                {userData?.name || userData?.username || user?.username || ''}
                            </h2>
                            <p className="text-xs text-purple-600 font-medium truncate mt-0.5">
                                @{userData?.username || ''}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                {isTeam ? (userData?.teamTitle || 'Equipe Mimo') : 'Conta Ativa'}
                            </p>
                        </div>
                    </div>

                    {/* Botão Editar Perfil */}
                    <button
                        onClick={() => router.push('/profile/edit')}
                        className="shrink-0 bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all border border-slate-200/80 cursor-pointer shadow-2xs"
                    >
                        <Pencil className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Editar</span>
                    </button>
                </div>

                {isTeam ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                        <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Funcao na equipe</span>
                                <h3 className="text-base font-black text-slate-900 leading-tight mt-0.5">
                                    {userData?.teamTitle || 'Equipe Mimo'}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-500 font-semibold flex items-center gap-2">
                                <CalendarClock className="w-3.5 h-3.5 text-purple-600" />
                                Membro desde
                            </span>
                            <span className="font-bold text-slate-800">{teamMemberSince}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-500 font-semibold">Identificacao</span>
                            <span className="font-bold text-slate-800 truncate ml-3">@{userData?.username || ''}</span>
                        </div>
                    </div>
                ) : (
                    <>
                {/* Card de Saldo */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meu Saldo</span>
                            <span className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 block">
                                {((userData?.balance ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            {userData?.promotionalBalance > 0 && (
                                <span className="text-[10px] text-purple-600 font-semibold mt-1 block">
                                    Sendo {((userData.promotionalBalance) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de {userData.promotionalBalanceLabel || 'Crédito de boas-vindas'}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={openRechargeModal}
                            className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs transition-all shadow-sm shadow-purple-200 flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Recarregar
                        </button>
                    </div>
                </div>

                {/* Histórico de Recargas */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">Histórico de Recargas</h3>
                    
                    {loadingHistory ? (
                        <div className="flex flex-col gap-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between text-xs animate-pulse">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-xl bg-slate-100/70" />
                                        <div className="flex flex-col gap-1.5">
                                            <div className="h-3 bg-slate-100 rounded w-20" />
                                            <div className="h-2 bg-slate-100 rounded w-28" />
                                        </div>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded w-10" />
                                </div>
                            ))}
                        </div>
                    ) : depositHistoryItems.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {depositHistoryItems.slice(0, 5).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                            {tx.type === 'gift' && <Gift className="w-3.5 h-3.5" />}
                                            {tx.type === 'card' && <CreditCard className="w-3.5 h-3.5" />}
                                            {tx.type === 'pix' && <QrCode className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700">{tx.label}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {new Date(tx.createdAt).toLocaleDateString('pt-BR')} às {new Date(tx.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-emerald-600">+{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 font-medium text-center py-4">Nenhuma recarga efetuada ainda.</p>
                    )}
                </div>
                    </>
                )}

                {/* Card de Assinaturas Ativas */}
                {!isTeam && (() => {
                    const mySubscriptions = subscriptionsData?.subscriptions ?? [];
                    if (mySubscriptions.length === 0) return null;
                    return (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">Minhas Assinaturas</h3>
                            <div className="flex flex-col gap-2">
                                {mySubscriptions.map((sub) => {
                                    const prof = sub.professional;
                                    const renewsAt = new Date(sub.expiresAt);
                                    const daysLeft = Math.max(0, Math.ceil((renewsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                    const isExpiringSoon = daysLeft <= 3;
                                    const renewalCanceled = Boolean(sub.cancelAtPeriodEnd);
                                    return (
                                        <button
                                            key={sub._id}
                                            onClick={() => setManagingSubscription(sub)}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-all duration-75 active:scale-[0.98] text-left cursor-pointer"
                                        >
                                            {/* Avatar */}
                                            <div className="relative shrink-0">
                                                {prof?.photoUrl ? (
                                                    <img src={prof.photoUrl} alt={prof.name || prof.username} className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                        <Crown className="w-4 h-4 text-purple-500" />
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate">{prof?.name || `@${prof?.username}`}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">@{prof?.username}</p>
                                                <div className={`flex items-center gap-1 mt-1 ${isExpiringSoon || renewalCanceled ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {isExpiringSoon || renewalCanceled ? (
                                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                                    ) : (
                                                        <CalendarClock className="w-3 h-3 shrink-0" />
                                                    )}
                                                    <span className="text-[10px] font-medium">
                                                        {renewalCanceled
                                                            ? `Expira em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
                                                            : isExpiringSoon
                                                            ? `Expira em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
                                                            : `Renova em ${renewsAt.toLocaleDateString('pt-BR')}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Preço */}
                                            <div className="shrink-0 text-right">
                                                <span className="text-xs font-black text-purple-700">
                                                    {(sub.priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                                <p className="text-[9px] text-slate-400">/mês</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

            </PullToRefresh>

            {/* Modal de Gerenciamento de Assinatura */}
            {mounted && managingSubscription && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={(e) => { if (e.target === e.currentTarget) { setManagingSubscription(null); setCancellingSubscriptionId(null); } }}
                >
                    <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl pb-safe animate-in slide-in-from-bottom-4 duration-300">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-gray-200 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pt-3 pb-4 border-b border-gray-100 flex items-center gap-3">
                            {managingSubscription.professional?.photoUrl ? (
                                <img
                                    src={managingSubscription.professional.photoUrl}
                                    alt={managingSubscription.professional.name || managingSubscription.professional.username}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-100"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-purple-500" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-bold text-gray-900 truncate">
                                    {managingSubscription.professional?.name || `@${managingSubscription.professional?.username}`}
                                </h2>
                                <p className="text-xs text-purple-600 font-medium">@{managingSubscription.professional?.username}</p>
                            </div>
                            <button
                                onClick={() => { setManagingSubscription(null); setCancellingSubscriptionId(null); }}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all active:scale-90"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Detalhes */}
                        <div className="px-5 py-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-3">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor mensal</p>
                                    <p className="text-lg font-black text-gray-900 mt-0.5">
                                        {(managingSubscription.priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {managingSubscription.cancelAtPeriodEnd ? 'Acesso ate' : 'Proxima renovacao'}
                                    </p>
                                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                                        {new Date(managingSubscription.expiresAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            {/* Ação: acessar perfil */}
                            {managingSubscription.professional?.username && (
                                <button
                                    onClick={() => {
                                        setManagingSubscription(null);
                                        router.push(`/${managingSubscription.professional!.username}`);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition-all duration-75 active:scale-95 active:bg-purple-800 shadow-sm shadow-purple-500/20"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Visitar perfil
                                </button>
                            )}

                            {/* Confirmação de cancelamento inline */}
                            {cancellingSubscriptionId === managingSubscription._id ? (
                                <div className="border border-red-100 bg-red-50/60 rounded-2xl p-4 flex flex-col gap-3">
                                    <p className="text-xs font-bold text-red-700 text-center">
                                        Tem certeza? A renovacao sera cancelada, mas seu acesso continua ate {new Date(managingSubscription.expiresAt).toLocaleDateString('pt-BR')}.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCancellingSubscriptionId(null)}
                                            className="flex-1 h-10 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                                        >
                                            Voltar
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await cancelSubscriptionMutation.mutateAsync(managingSubscription._id);
                                                    toast.success('Renovacao cancelada. Seu acesso segue ativo ate o fim do ciclo.');
                                                    setManagingSubscription(null);
                                                    setCancellingSubscriptionId(null);
                                                } catch (err: any) {
                                                    toast.error(err.message || 'Erro ao cancelar assinatura');
                                                }
                                            }}
                                            disabled={cancelSubscriptionMutation.isPending}
                                            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all active:scale-95 disabled:opacity-60"
                                        >
                                            {cancelSubscriptionMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
                                        </button>
                                    </div>
                                </div>
                            ) : managingSubscription.cancelAtPeriodEnd ? (
                                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs font-bold text-amber-700 text-center">
                                    Renovacao cancelada. Acesso ativo ate {new Date(managingSubscription.expiresAt).toLocaleDateString('pt-BR')}.
                                </div>
                            ) : (
                                <button
                                    onClick={() => setCancellingSubscriptionId(managingSubscription._id)}
                                    className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm transition-all duration-75 active:scale-95"
                                >
                                    Cancelar assinatura
                                </button>
                            )}
                        </div>
                        <div className="h-6" />
                    </div>
                </div>,
                document.body
            )}

            {mounted && cropperState && cropperState.open && createPortal(
                <ImageCropper
                    imageSrc={cropperState.imageSrc}
                    circular={cropperState.type === 'photo'}
                    aspectRatio={cropperState.type === 'photo' ? 1 : 2.75}
                    onCrop={handleCropConfirm}
                    onCancel={() => setCropperState(null)}
                />,
                document.body
            )}
        </div>
    );
}
