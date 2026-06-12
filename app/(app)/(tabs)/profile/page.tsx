'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { Avatar } from '@/components/Avatar';
import { useMyProfile, useUpdateProfile, useUploadPhoto, useUploadCover, useMyGallery, useUploadToGallery, usePendingWithdrawal, useRequestWithdraw, useDeleteFromGallery, useDepositHistory, useWithdrawalHistory, useChatRooms } from '@/hooks/useQueries';
import { ImageCropper } from '@/components/ImageCropper';
import { usePayment } from '@/context/PaymentContext';
import { usePWA } from '@/context/PWAContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { formatCPF, formatPhone } from '@/components/RechargeModal';

function SkeletonBox({ className = '' }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
    );
}

export default function ProfilePage() {
    const { user } = useUser();
    const { signOut } = useClerk();
    const router = useTransitionRouter();

    // Resolve a transição de visualização imediatamente para não travar a animação de volta
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }
    }, []);

    useEffect(() => {
        router.prefetch('/settings');
    }, [router]);
    const { openRechargeModal } = usePayment();
    const { isInstallable, promptInstall, mounted, isStandalone } = usePWA();
    const { permission: notificationPermission, handleRequestPermission } = usePushNotifications();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const privateGalleryInputRef = useRef<HTMLInputElement>(null);
    const { data: galleryData } = useMyGallery();
    const uploadGalleryMutation = useUploadToGallery();
    const deleteGalleryMutation = useDeleteFromGallery();

    const { data: userData, isLoading: loadingProfile, isFetching, refetch: refetchProfile } = useMyProfile();
    const updateProfileMutation = useUpdateProfile();
    const uploadPhotoMutation = useUploadPhoto();
    const uploadCoverMutation = useUploadCover();

    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [phone, setPhone] = useState('');
    const [localPhotoUrl, setLocalPhotoUrl] = useState<string | undefined>(undefined);
    const [localCoverUrl, setLocalCoverUrl] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [isProfessional, setIsProfessional] = useState(() => !!userData?.isProfessional);
    const [pixKey, setPixKey] = useState('');
    const [pixModalOpen, setPixModalOpen] = useState(false);
    const [withdrawConfirmModalOpen, setWithdrawConfirmModalOpen] = useState(false);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [subscriptionPrice, setSubscriptionPrice] = useState('');
    const [chargePerCharSubscribers, setChargePerCharSubscribers] = useState('');
    const [chargePerCharNonSubscribers, setChargePerCharNonSubscribers] = useState('');
    const [isSavingPrice, setIsSavingPrice] = useState(false);
    const [priceSavedFeedback, setPriceSavedFeedback] = useState(false);

    const { data: pendingWithdrawal } = usePendingWithdrawal();
    const requestWithdrawMutation = useRequestWithdraw();
    const { data: depositHistory } = useDepositHistory();
    const { data: withdrawalHistory } = useWithdrawalHistory();
    const { data: rooms = [] } = useChatRooms();

    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [selectedVisibility, setSelectedVisibility] = useState<'public' | 'subscribers'>('public');
    const [visibilityModal, setVisibilityModal] = useState<{ open: boolean, file?: File }>({ open: false });
    const [cropperState, setCropperState] = useState<{ open: boolean; imageSrc: string; type: 'photo' | 'cover' } | null>(null);
    const [activeGalleryTab, setActiveGalleryTab] = useState<'public' | 'private'>('public');

    const hasPopulatedFromCache = useRef(false);

    useEffect(() => {
        if (userData && !hasPopulatedFromCache.current) {
            setUsername(userData.username || '');
            setName(userData.name || '');
            setTaxId(userData.taxId ? formatCPF(userData.taxId) : '');
            setPhone(userData.phone ? formatPhone(userData.phone) : '');
            setPixKey(userData.pixKey || '');
            setSubscriptionPrice(userData.subscriptionPrice?.toString() ?? '0');
            setChargePerCharSubscribers(userData.chargePerCharSubscribers?.toString() ?? '0.002');
            setChargePerCharNonSubscribers(userData.chargePerCharNonSubscribers?.toString() ?? '0.005');
            if (userData.photoUrl) setLocalPhotoUrl(userData.photoUrl);
            if (userData.coverUrl) setLocalCoverUrl(userData.coverUrl);
            hasPopulatedFromCache.current = true;
        } else if (userData) {
            if (userData.photoUrl && !uploadPhotoMutation.isPending) {
                setLocalPhotoUrl(userData.photoUrl);
            }
            if (userData.coverUrl && !uploadCoverMutation.isPending) {
                setLocalCoverUrl(userData.coverUrl);
            }
            if (userData.taxId && !taxId) setTaxId(formatCPF(userData.taxId));
            if (userData.phone && !phone) setPhone(formatPhone(userData.phone));
            if (userData.pixKey && !pixKey) setPixKey(userData.pixKey);
            if (userData.subscriptionPrice !== undefined && !subscriptionPrice) setSubscriptionPrice(userData.subscriptionPrice.toString());
            if (userData.chargePerCharSubscribers !== undefined && !chargePerCharSubscribers) setChargePerCharSubscribers(userData.chargePerCharSubscribers.toString());
            if (userData.chargePerCharNonSubscribers !== undefined && !chargePerCharNonSubscribers) setChargePerCharNonSubscribers(userData.chargePerCharNonSubscribers.toString());
        }
    }, [userData]);

    useEffect(() => {
        if (userData?.isProfessional !== undefined) {
            setIsProfessional(!!userData.isProfessional);
        }
    }, [userData?.isProfessional]);

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

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setCropperState({
            open: true,
            imageSrc: previewUrl,
            type: 'cover'
        });
        
        if (coverInputRef.current) coverInputRef.current.value = '';
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
        } else if (type === 'cover') {
            const previewUrl = URL.createObjectURL(croppedFile);
            setLocalCoverUrl(previewUrl);
            formData.append('cover', croppedFile);

            try {
                const uploadResponse = await uploadCoverMutation.mutateAsync(formData);
                if (uploadResponse.coverUrl) setLocalCoverUrl(uploadResponse.coverUrl);
            } catch {
                if (userData?.coverUrl) setLocalCoverUrl(userData.coverUrl);
            }
        }
    };

    const handleSaveAll = async () => {
        setLoading(true);
        setSaveError('');
        setSaveSuccess(false);

        try {
            const updateData: any = { 
                name, 
                username, 
                taxId: taxId.replace(/\D/g, ''), 
                phone: phone.replace(/\D/g, ''),
                pixKey: pixKey
            };

            if (isProfessional) {
                updateData.subscriptionPrice = Number(subscriptionPrice) || 0;
                updateData.chargePerCharSubscribers = Number(chargePerCharSubscribers) || 0;
                updateData.chargePerCharNonSubscribers = Number(chargePerCharNonSubscribers) || 0;
            }
            
            await updateProfileMutation.mutateAsync(updateData);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error: any) {
            if (error.response?.status === 409) {
                setSaveError('Username já está em uso');
            } else {
                setSaveError('Erro ao salvar alterações');
            }
        } finally {
            setLoading(false);
        }
    };

    const savePriceSettings = async (nonSubscribersPrice: number, subscribersPrice: number) => {
        setIsSavingPrice(true);
        setPriceSavedFeedback(false);
        try {
            await updateProfileMutation.mutateAsync({
                chargePerCharNonSubscribers: nonSubscribersPrice,
                chargePerCharSubscribers: subscribersPrice,
            });
            setPriceSavedFeedback(true);
            setTimeout(() => setPriceSavedFeedback(false), 2000);
        } catch {
            alert('Erro ao salvar o preço por caractere.');
        } finally {
            setIsSavingPrice(false);
        }
    };

    const handleAdjustPrice = async (delta: number) => {
        const limitMax = userData?.maxPricePerChar ?? 0.2;
        const discountFactor = 1 - (userData?.subscriberDiscountPercentage ?? 20) / 100;
        const currentPrice = Number(chargePerCharNonSubscribers) || 0;
        let newPrice = currentPrice + delta;

        if (newPrice > limitMax) {
            alert(`O valor máximo por caractere é R$ ${limitMax.toFixed(2)}`);
            newPrice = limitMax;
        } else if (newPrice < 0) {
            newPrice = 0;
        }

        const newPriceStr = parseFloat(newPrice.toFixed(4)).toString();
        const subscriberPriceStr = parseFloat((newPrice * discountFactor).toFixed(4)).toString();

        setChargePerCharNonSubscribers(newPriceStr);
        setChargePerCharSubscribers(subscriberPriceStr);

        await savePriceSettings(newPrice, newPrice * discountFactor);
    };

    const handleInputBlur = async () => {
        const parsed = parseFloat(Number(chargePerCharNonSubscribers).toFixed(4));
        const limitMax = userData?.maxPricePerChar ?? 0.2;
        const discountFactor = 1 - (userData?.subscriberDiscountPercentage ?? 20) / 100;

        if (isNaN(parsed) || parsed < 0) {
            if (userData) {
                setChargePerCharNonSubscribers(userData.chargePerCharNonSubscribers?.toString() ?? '0.005');
                setChargePerCharSubscribers(userData.chargePerCharSubscribers?.toString() ?? '0.002');
            }
            return;
        }

        let nonSubPrice = parsed;
        if (nonSubPrice > limitMax) {
            alert(`O valor máximo por caractere é R$ ${limitMax.toFixed(2)}`);
            nonSubPrice = limitMax;
        }

        const subPrice = parseFloat((nonSubPrice * discountFactor).toFixed(4));

        setChargePerCharNonSubscribers(nonSubPrice.toString());
        setChargePerCharSubscribers(subPrice.toString());

        await savePriceSettings(nonSubPrice, subPrice);
    };

    const handleDeleteGalleryItem = async (itemId: string) => {
        if (!confirm('Tem certeza que deseja remover esta foto da sua galeria?')) return;
        try {
            await deleteGalleryMutation.mutateAsync(itemId);
        } catch (error: any) {
            alert(error.message || 'Erro ao deletar foto');
        }
    };




    const handleLogout = async () => {
        if (confirm('Tem certeza que deseja sair da sua conta?')) {
            await signOut(() => router.replace('/login'));
        }
    };

    const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamanho do arquivo (limite de 8MB para evitar erro HTTP 413 do ngrok/servidor)
        const maxSizeBytes = 8 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            alert('Esta imagem é muito grande. Escolha uma foto de no máximo 8MB.');
            if (galleryInputRef.current) galleryInputRef.current.value = '';
            return;
        }

        setSaveError('');
        setSelectedVisibility('public');
        setVisibilityModal({ open: true, file });
    };

    const handlePrivateGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tamanho do arquivo (limite de 8MB)
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
        setSaveError('');
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
            console.error('Erro no upload da galeria:', error);
            const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Erro ao subir foto para galeria';
            setSaveError(msg);
        } finally {
            setUploadingGallery(false);
        }
    };

    const onRefresh = useCallback(() => refetchProfile(), [refetchProfile]);
    const profileIsProfessional = userData?.isProfessional !== undefined ? !!userData.isProfessional : isProfessional;
    const walletHistoryItems = profileIsProfessional
        ? (withdrawalHistory?.withdrawals ?? []).map((withdrawal) => ({
            id: withdrawal.id,
            amount: withdrawal.amount / 100,
            createdAt: withdrawal.createdAt,
            label: withdrawal.status === 'pendente' ? 'Saque pendente' : withdrawal.status === 'concluido' ? 'Saque concluído' : 'Saque rejeitado',
            valuePrefix: '-',
            amountClassName: withdrawal.status === 'rejeitado' ? 'text-gray-400' : 'text-gray-900',
            iconClassName: withdrawal.status === 'rejeitado' ? 'text-gray-400' : 'text-gray-700',
            iconBgClassName: withdrawal.status === 'rejeitado' ? 'bg-gray-50 border-gray-100' : 'bg-gray-50 border-gray-200',
        }))
        : (depositHistory?.transactions ?? []).map((tx) => ({
            id: tx.id,
            amount: tx.source === 'gift' ? tx.amount / 100 : tx.amount,
            createdAt: tx.createdAt,
            label: tx.source === 'gift'
                ? `Crédito via cupom${typeof tx.metadata?.giftCode === 'string' ? ` ${tx.metadata.giftCode}` : ''}`
                : tx.type === 'CC'
                    ? 'Depósito via cartão'
                    : 'Depósito via Pix',
            valuePrefix: '+',
            amountClassName: 'text-green-600',
            iconClassName: 'text-green-600',
            iconBgClassName: tx.source === 'gift' ? 'bg-purple-50 border-purple-100' : 'bg-green-50 border-green-100',
        }));
    const walletHistoryTitle = profileIsProfessional ? 'Últimos saques' : 'Histórico';
    const walletHistoryEmpty = profileIsProfessional
        ? 'Nenhum saque encontrado. Solicite um saque para começar.'
        : 'Nenhum histórico encontrado. Recarregue ou use um cupom para começar.';
    const walletStatLabel = profileIsProfessional ? 'Saques' : 'Histórico';

    if (loadingProfile && !userData) {
        return (
            <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center gap-3 shadow-md">
                    <div className="h-8 w-24 bg-white/20 rounded-lg animate-pulse" />
                    <div className="h-5 w-16 bg-white/10 rounded-md animate-pulse" />
                </div>
                <div className="p-4 flex flex-col gap-4">
                    <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm">
                        <SkeletonBox className="w-24 h-24 rounded-full" />
                        <SkeletonBox className="w-40 h-5" />
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                        <SkeletonBox className="w-32 h-8" />
                        <SkeletonBox className="w-full h-10" />
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                        <SkeletonBox className="w-36 h-5" />
                        <SkeletonBox className="w-full h-10" />
                        <SkeletonBox className="w-full h-10" />
                        <SkeletonBox className="w-full h-10" />
                        <SkeletonBox className="w-full h-11" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-8 h-8 object-contain shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Perfil</span>
                </div>
                <div className="flex items-center gap-3">
                    {isFetching && !loadingProfile && (
                        <div className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    )}
                    <button
                        onClick={() => router.push('/settings')}
                        className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center"
                        title="Configurações"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6 flex flex-col gap-3">

                {/* ── CARD DE PERFIL ─────────────────────────────────────── */}
                <div
                    className={`relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0 h-auto ${
                        profileIsProfessional ? 'min-h-[220px]' : 'min-h-[96px]'
                    }`}
                >
                    {profileIsProfessional ? (
                        /* Layout com capa — apenas para profissionais */
                        <div className="block h-auto" style={{ display: 'block' }}>
                            <div className="relative w-full overflow-hidden shrink-0" style={{ height: 112 }}>
                                {localCoverUrl ? (
                                    <img src={localCoverUrl} alt="Capa" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                <button
                                    onClick={() => coverInputRef.current?.click()}
                                    disabled={uploadCoverMutation.isPending}
                                    className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/35 hover:bg-black/55 active:scale-95 text-white text-[10px] font-semibold rounded-lg border border-white/20 backdrop-blur-sm transition-all flex items-center gap-1"
                                >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Capa
                                </button>
                            </div>
                            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

                            <div className="p-5 pt-0">
                                <div className="flex items-end justify-between -mt-8 mb-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadPhotoMutation.isPending}
                                        className="relative group block p-0.5 bg-white rounded-full shadow-md ring-2 ring-white"
                                    >
                                        <Avatar uri={localPhotoUrl} size={72} />
                                        {uploadPhotoMutation.isPending ? (
                                            <div className="absolute inset-0.5 rounded-full bg-black/50 flex items-center justify-center">
                                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            </div>
                                        ) : (
                                            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white shadow border border-gray-100 flex items-center justify-center">
                                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </div>
                                        )}
                                    </button>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                    <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                        Profissional
                                    </span>
                                </div>
                                <h1 className="text-base font-semibold text-gray-900 leading-tight truncate">
                                    {userData?.name || userData?.username || user?.username || ''}
                                </h1>
                                <p className="text-xs text-purple-600 font-medium mt-0.5">@{userData?.username || ''}</p>
                                <div className="flex flex-col gap-0.5 mt-1.5 pb-1">
                                    {userData?.email && (
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                            {userData.email.replace(/(.{2})(.*)(@.*)/, '$1•••$3')}
                                        </span>
                                    )}
                                    {user?.createdAt && (
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Layout horizontal compacto — clientes sem capa */
                        <div className="p-5 flex items-center gap-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadPhotoMutation.isPending}
                                className="relative shrink-0 group block p-0.5 bg-white rounded-full shadow-sm ring-1 ring-gray-100"
                            >
                                <Avatar uri={localPhotoUrl} size={64} />
                                {uploadPhotoMutation.isPending ? (
                                    <div className="absolute inset-0.5 rounded-full bg-black/50 flex items-center justify-center">
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    </div>
                                ) : (
                                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white shadow border border-gray-100 flex items-center justify-center">
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </div>
                                )}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

                            <div className="flex-1 min-w-0">
                                <h1 className="text-sm font-semibold text-gray-900 truncate">
                                    {userData?.name || userData?.username || user?.username || ''}
                                </h1>
                                <p className="text-xs text-purple-600 font-medium mt-0.5">@{userData?.username || ''}</p>
                                <div className="flex flex-col gap-0.5 mt-1.5">
                                    {userData?.email && (
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                            {userData.email.replace(/(.{2})(.*)(@.*)/, '$1•••$3')}
                                        </span>
                                    )}
                                    {user?.createdAt && (
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── ESTATÍSTICAS DA CONTA ──────────────────────────────── */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-0.5">
                        <span className="text-lg font-bold text-gray-900">{(rooms as any[]).length}</span>
                        <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">Conversas</span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-0.5">
                        <span className="text-lg font-bold text-gray-900">{walletHistoryItems.length}</span>
                        <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">{walletStatLabel}</span>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <span className="text-sm font-bold text-green-600">Ativa</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">Conta</span>
                    </div>
                </div>

                {/* ── CARTEIRA REDESENHADA ───────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    {/* Topo da carteira */}
                    <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Saldo Disponível</span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="text-[11px] font-medium text-gray-400">R$</span>
                                    <span className="text-2xl font-bold text-gray-900 tracking-tight">
                                        {((userData?.balance ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    <span className="text-[10px] text-gray-400">Protegido · Atualizado agora</span>
                                </div>
                            </div>
                            <button
                                onClick={profileIsProfessional
                                    ? () => { if (!pixKey) { setPixModalOpen(true); } else { setWithdrawConfirmModalOpen(true); } }
                                    : openRechargeModal}
                                disabled={profileIsProfessional && pendingWithdrawal != null}
                                className={`mt-1 h-9 px-4 rounded-xl font-semibold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                                    profileIsProfessional && pendingWithdrawal != null
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20'
                                }`}
                            >
                                {profileIsProfessional ? (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                                        Sacar
                                    </>
                                ) : (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                                        Recarregar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {pendingWithdrawal && (
                        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <div>
                                <p className="text-[11px] font-semibold text-amber-800">Saque em processamento</p>
                                <p className="text-[10px] text-amber-600">{((pendingWithdrawal.amount ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · Pode levar até 24h</p>
                            </div>
                        </div>
                    )}

                    {/* Mini-extrato */}
                    {walletHistoryItems.length > 0 ? (
                        <div className="px-4 pt-3 pb-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">{walletHistoryTitle}</p>
                            <div className="flex flex-col gap-3">
                                {walletHistoryItems.slice(0, 3).map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${tx.iconBgClassName}`}>
                                                {profileIsProfessional ? (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={tx.iconClassName}><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                                                ) : (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={tx.iconClassName}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-medium text-gray-700">{tx.label}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[11px] font-bold ${tx.amountClassName}`}>{tx.valuePrefix}{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="px-4 py-3 flex items-center gap-2">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                            <p className="text-[11px] text-gray-400">{walletHistoryEmpty}</p>
                        </div>
                    )}
                </div>

                {/* ── PREÇO POR CARACTERE (Apenas Profissionais) ───────────────── */}
                {profileIsProfessional && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-800">Preço por Caractere</h2>
                            <p className="text-[10px] text-gray-400">
                                Defina o preço base. Assinantes têm {userData?.subscriberDiscountPercentage ?? 20}% de desconto automaticamente.
                            </p>
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <span className="text-xs font-medium text-gray-500">Valor Base</span>
                            
                            <div className="flex items-center gap-2">
                                {/* Botão Decrementar */}
                                <button
                                    onClick={() => handleAdjustPrice(-0.001)}
                                    disabled={isSavingPrice || Number(chargePerCharNonSubscribers) <= 0}
                                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                                    title="Diminuir preço"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>

                                {/* Input de Valor */}
                                <div className="relative flex items-center">
                                    <span className="absolute left-2.5 text-xs font-semibold text-gray-400">R$</span>
                                    <input
                                        type="number"
                                        step="0.0001"
                                        min="0"
                                        className="w-24 h-8 pl-8 pr-2 text-center text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={chargePerCharNonSubscribers}
                                        onChange={(e) => setChargePerCharNonSubscribers(e.target.value)}
                                        onBlur={handleInputBlur}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleInputBlur();
                                            }
                                        }}
                                    />
                                </div>

                                {/* Botão Incrementar */}
                                <button
                                    onClick={() => handleAdjustPrice(0.001)}
                                    disabled={isSavingPrice}
                                    className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                                    title="Aumentar preço"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Detalhes de cálculo dinâmico */}
                        <div className="grid grid-cols-2 gap-2 bg-purple-50/40 rounded-xl p-3 border border-purple-50 text-xs">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Não Assinantes</span>
                                <span className="font-bold text-gray-800">
                                    {Number(chargePerCharNonSubscribers).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}
                                </span>
                                <span className="text-[9px] text-gray-500 font-medium">
                                    100 chars = {((Number(chargePerCharNonSubscribers) || 0) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            
                            <div className="flex flex-col gap-0.5 border-l border-purple-100/50 pl-3">
                                <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1">
                                    Assinantes
                                    <span className="bg-purple-100 text-purple-700 text-[8px] font-bold px-1.5 py-0.5 rounded-md">-{userData?.subscriberDiscountPercentage ?? 20}%</span>
                                </span>
                                <span className="font-bold text-purple-700">
                                    {(Number(chargePerCharNonSubscribers) * (1 - (userData?.subscriberDiscountPercentage ?? 20) / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}
                                </span>
                                <span className="text-[9px] text-purple-500 font-medium">
                                    100 chars = {((Number(chargePerCharNonSubscribers) || 0) * (1 - (userData?.subscriberDiscountPercentage ?? 20) / 100) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Feedback visual de salvamento */}
                        {isSavingPrice && (
                            <div className="flex items-center gap-1.5 justify-center text-[10px] text-gray-400 animate-pulse">
                                <svg className="animate-spin h-3 w-3 text-purple-600" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Salvando preço...
                            </div>
                        )}
                        {!isSavingPrice && priceSavedFeedback && (
                            <div className="flex items-center gap-1 justify-center text-[10px] text-green-600 font-medium animate-in fade-in duration-200">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
                                Valor atualizado!
                            </div>
                        )}
                    </div>
                )}

                {/* ── INTEGRIDADE DA CONTA ───────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-800">Integridade da Conta</p>
                                <p className="text-[10px] text-gray-400">Complete seu perfil para maior segurança</p>
                            </div>
                        </div>
                        {/* Barra de progresso */}
                        {(() => {
                            const minPublicPhotos = userData?.minPublicPhotos ?? 6;
                            const maxPublicPhotos = userData?.maxPublicPhotos ?? 12;
                            const minExclusivePhotos = userData?.minExclusivePhotos ?? 2;
                            const maxExclusivePhotos = userData?.maxExclusivePhotos ?? 4;
                            const publicItemsCount = galleryData?.publicItems?.length ?? galleryData?.items?.length ?? 0;
                            const publicExclusiveCount = (galleryData?.publicItems ?? galleryData?.items ?? []).filter((item: any) => item.visibility === 'subscribers').length;
                            const publicGalleryIsComplete = 
                                publicItemsCount >= minPublicPhotos && 
                                publicItemsCount <= maxPublicPhotos && 
                                publicExclusiveCount >= minExclusivePhotos && 
                                publicExclusiveCount <= maxExclusivePhotos;

                            const checks = profileIsProfessional
                                ? [!!localPhotoUrl, !!userData?.taxId, !!userData?.pixKey, !!userData?.phone, publicGalleryIsComplete]
                                : [!!localPhotoUrl, !!userData?.taxId, !!userData?.phone];
                            const done = checks.filter(Boolean).length;
                            const total = checks.length;
                            return (
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    done === total ? 'text-green-700 bg-green-50' : done >= Math.ceil(total / 2) ? 'text-amber-700 bg-amber-50' : 'text-red-600 bg-red-50'
                                }`}>{done}/{total}</span>
                            );
                        })()}
                    </div>
                    <div className="flex flex-col gap-2">
                        {(() => {
                            const minPublicPhotos = userData?.minPublicPhotos ?? 6;
                            const maxPublicPhotos = userData?.maxPublicPhotos ?? 12;
                            const minExclusivePhotos = userData?.minExclusivePhotos ?? 2;
                            const maxExclusivePhotos = userData?.maxExclusivePhotos ?? 4;
                            const publicItemsCount = galleryData?.publicItems?.length ?? galleryData?.items?.length ?? 0;
                            const publicExclusiveCount = (galleryData?.publicItems ?? galleryData?.items ?? []).filter((item: any) => item.visibility === 'subscribers').length;
                            const publicGalleryIsComplete = 
                                publicItemsCount >= minPublicPhotos && 
                                publicItemsCount <= maxPublicPhotos && 
                                publicExclusiveCount >= minExclusivePhotos && 
                                publicExclusiveCount <= maxExclusivePhotos;

                            return (profileIsProfessional
                                ? [
                                    { label: 'Foto de perfil', done: !!localPhotoUrl, action: () => fileInputRef.current?.click() },
                                    { label: 'CPF informado', done: !!userData?.taxId, action: () => router.push('/settings') },
                                    { label: 'Chave Pix cadastrada', done: !!userData?.pixKey, action: () => router.push('/settings') },
                                    { label: 'Telefone cadastrado', done: !!userData?.phone, action: () => router.push('/settings') },
                                    { label: `Galeria pública completa (${publicItemsCount} fotos, ${publicExclusiveCount} exclusivas)`, done: publicGalleryIsComplete, action: () => { setActiveGalleryTab('public'); const el = document.getElementById('my-gallery-section'); el?.scrollIntoView({ behavior: 'smooth' }); } },
                                ]
                                : [
                                    { label: 'Foto de perfil', done: !!localPhotoUrl, action: () => fileInputRef.current?.click() },
                                    { label: 'CPF informado', done: !!userData?.taxId, action: () => router.push('/settings') },
                                    { label: 'Telefone cadastrado', done: !!userData?.phone, action: () => router.push('/settings') },
                                ]
                            ).map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                            item.done ? 'bg-green-100' : 'bg-gray-100'
                                        }`}>
                                            {item.done ? (
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
                                            ) : (
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-400"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            )}
                                        </div>
                                        <span className={`text-xs ${ item.done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                                    </div>
                                    {!item.done && (
                                        <button onClick={item.action} className="text-[10px] font-semibold text-purple-600 hover:text-purple-700">
                                            Completar
                                        </button>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                {/* ── GALERIA (Profissionais) ────────────────────────────── */}
                {profileIsProfessional && (() => {
                    const minPublicPhotos = userData?.minPublicPhotos ?? 6;
                    const maxPublicPhotos = userData?.maxPublicPhotos ?? 12;
                    const minExclusivePhotos = userData?.minExclusivePhotos ?? 2;
                    const maxExclusivePhotos = userData?.maxExclusivePhotos ?? 4;
                    const publicItemsCount = galleryData?.publicItems?.length ?? galleryData?.items?.length ?? 0;
                    const publicExclusiveCount = (galleryData?.publicItems ?? galleryData?.items ?? []).filter((item: any) => item.visibility === 'subscribers').length;
                    const publicGalleryIsComplete = 
                        publicItemsCount >= minPublicPhotos && 
                        publicItemsCount <= maxPublicPhotos && 
                        publicExclusiveCount >= minExclusivePhotos && 
                        publicExclusiveCount <= maxExclusivePhotos;

                    return (
                        <div id="my-gallery-section" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-gray-800">Minha Galeria</h2>
                                
                                {activeGalleryTab === 'public' ? (
                                    <button
                                        onClick={() => galleryInputRef.current?.click()}
                                        className="h-7 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                        Adicionar Foto
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => privateGalleryInputRef.current?.click()}
                                        className="h-7 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                                    >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                        Adicionar Mídia
                                    </button>
                                )}
                                
                                <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFileChange} />
                                <input ref={privateGalleryInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePrivateGalleryFileChange} />
                            </div>

                            {/* Seletor de Abas */}
                            <div className="flex border-b border-gray-100 mt-1">
                                <button
                                    onClick={() => setActiveGalleryTab('public')}
                                    className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 text-center ${
                                        activeGalleryTab === 'public'
                                            ? 'border-purple-600 text-purple-600'
                                            : 'border-transparent text-gray-400'
                                    }`}
                                >
                                    Pública ({publicItemsCount})
                                </button>
                                <button
                                    onClick={() => setActiveGalleryTab('private')}
                                    className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 text-center ${
                                        activeGalleryTab === 'private'
                                            ? 'border-purple-600 text-purple-600'
                                            : 'border-transparent text-gray-400'
                                    }`}
                                >
                                    Privada ({galleryData?.privateItems?.length ?? 0})
                                </button>
                            </div>

                            {/* Avisos/Alertas de Validação */}
                            {activeGalleryTab === 'public' && !publicGalleryIsComplete && (
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5">
                                    <span className="text-base mt-0.5">⚠️</span>
                                    <div className="text-xs text-amber-800 font-medium">
                                        <p className="font-bold">Galeria Pública Incompleta</p>
                                        <p className="mt-0.5">
                                            Insira de {minPublicPhotos} a {maxPublicPhotos} fotos. No mínimo {minExclusivePhotos} e no máximo {maxExclusivePhotos} delas devem ser exclusivas para assinantes.
                                        </p>
                                        <p className="mt-1 font-semibold text-amber-900">
                                            Atual: {publicItemsCount} fotos ({publicExclusiveCount} exclusivas).
                                        </p>
                                    </div>
                                </div>
                            )}
                            {activeGalleryTab === 'private' && (
                                <div className="bg-purple-50/50 border border-purple-100/60 rounded-xl p-3 flex items-start gap-2.5">
                                    <span className="text-base mt-0.5">🔒</span>
                                    <div className="text-xs text-purple-800 font-medium">
                                        <p className="font-bold">Galeria Privada Exclusiva</p>
                                        <p className="mt-0.5">
                                            Todos os itens adicionados aqui são exclusivos para assinantes por definição. Aceita fotos e vídeos.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Grid de Itens */}
                            {activeGalleryTab === 'public' ? (
                                publicItemsCount === 0 ? (
                                    <div className="py-6 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl gap-1">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                        <p className="text-xs text-gray-400">Nenhuma foto pública ainda</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {(galleryData?.publicItems ?? galleryData?.items ?? []).map((item: any) => (
                                            <div key={item._id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                                                <img src={item.imageUrl} alt="Gallery" className="w-full h-full object-cover" />
                                                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/40 text-[9px] text-white backdrop-blur-sm">
                                                    {item.visibility === 'public' ? '🌐' : '💎'}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteGalleryItem(item._id); }}
                                                    disabled={deleteGalleryMutation.isPending}
                                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                (galleryData?.privateItems?.length ?? 0) === 0 ? (
                                    <div className="py-6 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl gap-1">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                        <p className="text-xs text-gray-400">Nenhuma mídia privada ainda</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {galleryData?.privateItems?.map((item: any) => (
                                            <div key={item._id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                                                {item.mediaType === 'video' ? (
                                                    <div className="w-full h-full relative">
                                                        <video src={item.imageUrl} preload="metadata" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="opacity-80">
                                                                <polygon points="5 3 19 12 5 21 5 3"/>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <img src={item.imageUrl} alt="Private Gallery" className="w-full h-full object-cover" />
                                                )}
                                                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/40 text-[9px] text-white backdrop-blur-sm">
                                                    🔒
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteGalleryItem(item._id); }}
                                                    disabled={deleteGalleryMutation.isPending}
                                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Visibility Selection Modal */}
            {/* Visibility Selection Modal */}
            {visibilityModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-5 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center shadow-inner">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Quem pode ver?</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Escolha a visibilidade desta foto na sua galeria.
                                </p>
                            </div>
                        </div>

                        {visibilityModal.file && (
                            <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                                <img 
                                    src={URL.createObjectURL(visibilityModal.file)} 
                                    className="w-full h-full object-cover" 
                                    alt="Preview" 
                                />
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-3">
                            <div
                                onClick={() => !uploadingGallery && setSelectedVisibility('public')}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && !uploadingGallery) {
                                        setSelectedVisibility('public');
                                    }
                                }}
                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group text-left cursor-pointer ${
                                    selectedVisibility === 'public'
                                        ? 'border-purple-600 bg-purple-50/50'
                                        : 'border-gray-100 hover:border-purple-300 hover:bg-purple-50/10'
                                } ${uploadingGallery ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                    selectedVisibility === 'public' ? 'bg-purple-100' : 'bg-gray-50 group-hover:bg-purple-100/50'
                                }`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors ${
                                        selectedVisibility === 'public' ? 'text-purple-600' : 'text-gray-500 group-hover:text-purple-600'
                                    }`}>
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 leading-tight">Público</p>
                                    <p className="text-xs text-gray-500">Qualquer pessoa pode ver</p>
                                </div>
                                {selectedVisibility === 'public' && (
                                    <span className="text-purple-600 font-bold text-lg">✓</span>
                                )}
                            </div>

                            {profileIsProfessional && (
                                <div
                                    onClick={() => !uploadingGallery && setSelectedVisibility('subscribers')}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if ((e.key === 'Enter' || e.key === ' ') && !uploadingGallery) {
                                            setSelectedVisibility('subscribers');
                                        }
                                    }}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 group text-left cursor-pointer ${
                                        selectedVisibility === 'subscribers'
                                            ? 'border-purple-600 bg-purple-50/50'
                                            : 'border-gray-100 hover:border-purple-300 hover:bg-purple-50/10'
                                    } ${uploadingGallery ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                        selectedVisibility === 'subscribers' ? 'bg-purple-100' : 'bg-gray-50 group-hover:bg-purple-100/50'
                                    }`}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors ${
                                            selectedVisibility === 'subscribers' ? 'text-purple-600' : 'text-gray-500 group-hover:text-purple-600'
                                        }`}>
                                            <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
                                            <line x1="2" y1="8.5" x2="12" y2="15" />
                                            <line x1="22" y1="8.5" x2="12" y2="15" />
                                            <polyline points="2 8.5 12 22 22 8.5" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 leading-tight">Somente Assinantes</p>
                                        <p className="text-xs text-gray-500">Apenas quem assina seu perfil</p>
                                    </div>
                                    {selectedVisibility === 'subscribers' && (
                                        <span className="text-purple-600 font-bold text-lg">✓</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {saveError && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <span className="text-sm shrink-0">⚠️</span>
                                <div className="font-medium break-words leading-tight flex-1">
                                    {saveError}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                title="Cancelar"
                                onPress={() => setVisibilityModal({ open: false })}
                                variant="outline"
                                size="md"
                                className="flex-1"
                                disabled={uploadingGallery}
                            />
                            <Button
                                title="Confirmar"
                                onPress={() => confirmGalleryUpload(selectedVisibility)}
                                size="md"
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={uploadingGallery}
                                loading={uploadingGallery}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Pix Key Config Modal */}
            {pixModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-5 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-3xl shadow-inner">
                                🔑
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Cadastrar Chave PIX</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Para realizar saques, você precisa de uma chave Pix cadastrada.
                                </p>
                            </div>
                        </div>

                        <Input
                            label="Sua Chave PIX"
                            placeholder="CPF, E-mail, Telefone ou Aleatória"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                        />

                        <div className="flex gap-3 mt-2">
                            <Button
                                title="Cancelar"
                                onPress={() => setPixModalOpen(false)}
                                variant="outline"
                                size="md"
                                className="flex-1"
                            />
                            <Button
                                title="Salvar e Continuar"
                                onPress={async () => {
                                    if (!pixKey.trim()) return;
                                    await handleSaveAll();
                                    setPixModalOpen(false);
                                    setWithdrawConfirmModalOpen(true);
                                }}
                                size="md"
                                className="flex-1"
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Withdraw Confirm Modal */}
            {withdrawConfirmModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-5 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl shadow-inner">
                                💸
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Confirmar Saque</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Deseja solicitar o saque de todo o seu saldo?
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl flex flex-col gap-2 text-sm text-gray-700">
                            <div className="flex justify-between">
                                <span>Valor do Saque:</span>
                                <span className="font-bold text-gray-900">
                                    {((userData?.balance ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span>Chave PIX:</span>
                                <span className="font-bold text-gray-900">{pixKey}</span>
                            </div>
                            <p className="text-xs text-amber-600 mt-2 text-center bg-amber-50 p-2 rounded">
                                O processo de transferência pode levar até 24 horas úteis.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                title="Cancelar"
                                onPress={() => setWithdrawConfirmModalOpen(false)}
                                variant="outline"
                                size="md"
                                className="flex-1"
                                disabled={requestWithdrawMutation.isPending}
                            />
                            <Button
                                title="Solicitar Saque"
                                onPress={async () => {
                                    try {
                                        await requestWithdrawMutation.mutateAsync();
                                        setWithdrawConfirmModalOpen(false);
                                        refetchProfile();
                                    } catch (err) {
                                        alert('Erro ao solicitar saque.');
                                    }
                                }}
                                size="md"
                                className="flex-1 bg-green-600 hover:bg-green-700 !border-green-600 text-white"
                                disabled={requestWithdrawMutation.isPending || !userData?.balance || userData.balance <= 0}
                                loading={requestWithdrawMutation.isPending}
                            />
                        </div>
                    </div>
                </div>
            )}

            {cropperState && cropperState.open && (
                <ImageCropper
                    imageSrc={cropperState.imageSrc}
                    circular={cropperState.type === 'photo'}
                    aspectRatio={cropperState.type === 'photo' ? 1 : 2.75}
                    onCrop={handleCropConfirm}
                    onCancel={() => setCropperState(null)}
                />
            )}
        </div>
    );
}
