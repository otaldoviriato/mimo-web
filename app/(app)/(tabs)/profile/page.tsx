'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { Avatar } from '@/components/Avatar';
import { useMyProfile, useUpdateProfile, useUploadPhoto, useUploadCover, useMyGallery, useUploadToGallery, usePendingWithdrawal, useRequestWithdraw, useDeleteFromGallery, useDepositHistory, useChatRooms } from '@/hooks/useQueries';
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
    const router = useRouter();
    const { openRechargeModal } = usePayment();
    const { isInstallable, promptInstall, mounted, isStandalone } = usePWA();
    const { permission: notificationPermission, handleRequestPermission } = usePushNotifications();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
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
    const [isProfessional, setIsProfessional] = useState(false);
    const [pixKey, setPixKey] = useState('');
    const [pixModalOpen, setPixModalOpen] = useState(false);
    const [withdrawConfirmModalOpen, setWithdrawConfirmModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [subscriptionPrice, setSubscriptionPrice] = useState('');
    const [chargePerCharSubscribers, setChargePerCharSubscribers] = useState('');
    const [chargePerCharNonSubscribers, setChargePerCharNonSubscribers] = useState('');

    const { data: pendingWithdrawal } = usePendingWithdrawal();
    const requestWithdrawMutation = useRequestWithdraw();
    const { data: depositHistory } = useDepositHistory();
    const { data: rooms = [] } = useChatRooms();

    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [visibilityModal, setVisibilityModal] = useState<{ open: boolean, file?: File }>({ open: false });
    const [cropperState, setCropperState] = useState<{ open: boolean; imageSrc: string; type: 'photo' | 'cover' } | null>(null);

    const hasPopulatedFromCache = useRef(false);

    useEffect(() => {
        if (userData && !hasPopulatedFromCache.current) {
            setUsername(userData.username || '');
            setName(userData.name || '');
            setTaxId(userData.taxId ? formatCPF(userData.taxId) : '');
            setPhone(userData.phone ? formatPhone(userData.phone) : '');
            setIsProfessional(!!userData.isProfessional);
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
        setVisibilityModal({ open: true, file });
    };

    const confirmGalleryUpload = async (visibility: 'public' | 'subscribers') => {
        if (!visibilityModal.file) return;
        
        setUploadingGallery(true);
        const formData = new FormData();
        formData.append('photo', visibilityModal.file);
        formData.append('visibility', visibility);

        try {
            await uploadGalleryMutation.mutateAsync(formData);
            setVisibilityModal({ open: false });
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        } catch (error: any) {
            setSaveError(error.message || 'Erro ao subir foto para galeria');
        } finally {
            setUploadingGallery(false);
        }
    };

    const onRefresh = useCallback(() => refetchProfile(), [refetchProfile]);

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
                        src="/icon-192x192.png"
                        alt="MimoChat"
                        className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0"
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
                        onClick={() => setIsSettingsOpen(true)}
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
                <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {isProfessional ? (
                        /* Layout com capa — apenas para profissionais */
                        <>
                            <div className="relative h-28 w-full overflow-hidden shrink-0">
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

                            <div className="px-4 pb-4">
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
                                <h1 className="text-base font-semibold text-gray-900 leading-tight">
                                    {userData?.name || userData?.username || user?.username || ''}
                                </h1>
                                <p className="text-xs text-purple-600 font-medium mt-0.5">@{userData?.username || ''}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                    {userData?.email && (
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                            {userData.email.replace(/(.{2})(.*)(@.*)/, '$1•••$3')}
                                        </span>
                                    )}
                                    {user?.createdAt && (
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Layout horizontal compacto — clientes sem capa */
                        <div className="p-4 flex items-center gap-4">
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
                        <span className="text-lg font-bold text-gray-900">{(depositHistory?.transactions ?? []).length}</span>
                        <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">Depósitos</span>
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
                                onClick={isProfessional
                                    ? () => { if (!pixKey) { setPixModalOpen(true); } else { setWithdrawConfirmModalOpen(true); } }
                                    : openRechargeModal}
                                disabled={isProfessional && pendingWithdrawal != null}
                                className={`mt-1 h-9 px-4 rounded-xl font-semibold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                                    isProfessional && pendingWithdrawal != null
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : isProfessional
                                            ? 'bg-gray-900 hover:bg-gray-800 text-white shadow-sm'
                                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20'
                                }`}
                            >
                                {isProfessional ? (
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

                    {/* Mini-extrato de depósitos */}
                    {(depositHistory?.transactions ?? []).length > 0 ? (
                        <div className="px-4 pt-3 pb-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">Últimos depósitos</p>
                            <div className="flex flex-col gap-3">
                                {(depositHistory?.transactions ?? []).slice(0, 3).map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-600"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-medium text-gray-700">Depósito via Pix</p>
                                                <p className="text-[10px] text-gray-400">{new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-green-600">+{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="px-4 py-3 flex items-center gap-2">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                            <p className="text-[11px] text-gray-400">Nenhum depósito encontrado. Recarregue para começar.</p>
                        </div>
                    )}
                </div>

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
                            const checks = isProfessional
                                ? [!!localPhotoUrl, !!userData?.taxId, !!userData?.pixKey, !!userData?.phone]
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
                        {(isProfessional
                            ? [
                                { label: 'Foto de perfil', done: !!localPhotoUrl, action: () => fileInputRef.current?.click() },
                                { label: 'CPF informado', done: !!userData?.taxId, action: () => setIsSettingsOpen(true) },
                                { label: 'Chave Pix cadastrada', done: !!userData?.pixKey, action: () => setIsSettingsOpen(true) },
                                { label: 'Telefone cadastrado', done: !!userData?.phone, action: () => setIsSettingsOpen(true) },
                            ]
                            : [
                                { label: 'Foto de perfil', done: !!localPhotoUrl, action: () => fileInputRef.current?.click() },
                                { label: 'CPF informado', done: !!userData?.taxId, action: () => setIsSettingsOpen(true) },
                                { label: 'Telefone cadastrado', done: !!userData?.phone, action: () => setIsSettingsOpen(true) },
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
                        ))}
                    </div>
                </div>

                {/* ── GALERIA (Profissionais) ────────────────────────────── */}
                {isProfessional && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-800">Minha Galeria</h2>
                                <p className="text-[10px] text-gray-400">{galleryData?.items?.length ?? 0} {(galleryData?.items?.length ?? 0) === 1 ? 'foto' : 'fotos'}</p>
                            </div>
                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                className="h-7 px-3 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Adicionar
                            </button>
                            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFileChange} />
                        </div>

                        {galleryData?.items?.length === 0 ? (
                            <div className="py-6 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl gap-1">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                <p className="text-xs text-gray-400">Nenhuma foto ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                                {galleryData?.items?.map((item: any) => (
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
                        )}
                    </div>
                )}
            </div>

            {/* ── CONFIGURAÇÕES OVERLAY ───────────────────────────────────── */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">

                    {/* Header — igual ao header principal do app */}
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[56px] shrink-0 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                        <button
                            onClick={() => { setIsSettingsOpen(false); setSaveError(''); setSaveSuccess(false); }}
                            className="p-1.5 hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors text-white flex items-center justify-center"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                            </svg>
                        </button>
                        <h1 className="text-base font-bold text-white">Configurações</h1>
                    </div>

                    <div className="p-4 flex flex-col gap-4">

                        {/* ── SEÇÃO: DADOS DO PERFIL ── */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Dados do Perfil</p>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Nome */}
                                <div className="px-4 py-3.5 border-b border-gray-50">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Nome de Exibição</label>
                                    <input
                                        className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                        placeholder="Seu nome ou apelido"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                {/* Username */}
                                <div className="px-4 py-3.5 border-b border-gray-50">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Username</label>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm text-gray-300 select-none">@</span>
                                        <input
                                            className="flex-1 text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                            placeholder="username"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                        />
                                    </div>
                                </div>
                                {/* CPF */}
                                <div className="px-4 py-3.5 border-b border-gray-50">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">CPF</label>
                                    <input
                                        className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                        placeholder="000.000.000-00"
                                        value={taxId}
                                        onChange={(e) => setTaxId(formatCPF(e.target.value))}
                                        maxLength={14}
                                        inputMode="numeric"
                                    />
                                </div>
                                {/* Telefone */}
                                <div className="px-4 py-3.5">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Telefone / WhatsApp</label>
                                    <input
                                        className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                        placeholder="(00) 00000-0000"
                                        value={phone}
                                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                                        maxLength={15}
                                        type="tel"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── SEÇÃO: PREÇOS E GANHOS (Profissionais) ── */}
                        {isProfessional && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Preços e Ganhos</p>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3.5 border-b border-gray-50">
                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Assinatura Mensal (R$)</label>
                                        <input
                                            className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                            placeholder="0.00"
                                            value={subscriptionPrice}
                                            onChange={(e) => setSubscriptionPrice(e.target.value)}
                                            type="number"
                                            step="0.01"
                                            inputMode="decimal"
                                        />
                                    </div>
                                    <div className="px-4 py-3.5 border-b border-gray-50">
                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Por Caractere — Assinantes (R$)</label>
                                        <input
                                            className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                            placeholder="0.002"
                                            value={chargePerCharSubscribers}
                                            onChange={(e) => setChargePerCharSubscribers(e.target.value)}
                                            type="number"
                                            step="0.0001"
                                            inputMode="decimal"
                                        />
                                        {chargePerCharSubscribers && !isNaN(Number(chargePerCharSubscribers)) && (
                                            <p className="text-[10px] text-gray-400 mt-1.5">
                                                100 chars = <span className="font-semibold text-purple-600">{(Number(chargePerCharSubscribers) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}</span> para assinantes
                                            </p>
                                        )}
                                    </div>
                                    <div className="px-4 py-3.5">
                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Por Caractere — Não Assinantes (R$)</label>
                                        <input
                                            className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                            placeholder="0.005"
                                            value={chargePerCharNonSubscribers}
                                            onChange={(e) => setChargePerCharNonSubscribers(e.target.value)}
                                            type="number"
                                            step="0.0001"
                                            inputMode="decimal"
                                        />
                                        {chargePerCharNonSubscribers && !isNaN(Number(chargePerCharNonSubscribers)) && (
                                            <p className="text-[10px] text-gray-400 mt-1.5">
                                                100 chars = <span className="font-semibold text-purple-600">{(Number(chargePerCharNonSubscribers) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}</span> para não assinantes
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── BOTÃO SALVAR — imediatamente após os campos ── */}
                        <div className="flex flex-col gap-2">
                            {saveError && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    <p className="text-xs text-red-600 font-medium">{saveError}</p>
                                </div>
                            )}
                            {saveSuccess && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                                    <p className="text-xs text-green-700 font-medium">Perfil atualizado com sucesso</p>
                                </div>
                            )}
                            <button
                                onClick={handleSaveAll}
                                disabled={loading}
                                className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                )}
                                Salvar Alterações
                            </button>
                        </div>

                        {/* ── SEÇÃO: PREFERÊNCIAS DO DISPOSITIVO ── */}
                        {mounted && (notificationPermission !== 'granted' || (isInstallable && !isStandalone)) && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Este Dispositivo</p>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {/* Notificações */}
                                    <div className={`px-4 py-3.5 flex items-center justify-between ${isInstallable && !isStandalone ? 'border-b border-gray-50' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800">Notificações</p>
                                                <p className="text-[10px] text-gray-400 leading-snug">
                                                    {notificationPermission === 'granted'
                                                        ? 'Ativas para este dispositivo'
                                                        : notificationPermission === 'denied'
                                                            ? 'Bloqueadas pelo navegador'
                                                            : 'Alertas de novas mensagens'}
                                                </p>
                                            </div>
                                        </div>
                                        {notificationPermission === 'granted' ? (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                <span className="text-[10px] font-semibold text-green-600">Ativo</span>
                                            </div>
                                        ) : notificationPermission === 'denied' ? (
                                            <span className="shrink-0 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">Bloqueado</span>
                                        ) : (
                                            <button
                                                onClick={handleRequestPermission}
                                                className="shrink-0 h-7 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold transition-colors"
                                            >
                                                Ativar
                                            </button>
                                        )}
                                    </div>

                                    {/* Instalar app (PWA) */}
                                    {isInstallable && !isStandalone && (
                                        <div className="px-4 py-3.5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">Instalar Aplicativo</p>
                                                    <p className="text-[10px] text-gray-400">Acesso rápido na tela inicial</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={promptInstall}
                                                className="shrink-0 h-7 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold transition-colors"
                                            >
                                                Instalar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── SEÇÃO: SOBRE O APP ── */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Mais Informações</p>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                                    className="w-full px-4 py-3.5 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">Sobre o MimoChat</span>
                                    </div>
                                    <svg
                                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                        className={`text-gray-400 transition-transform duration-200 ${isAboutExpanded ? 'rotate-180' : ''}`}
                                    >
                                        <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                </button>
                                {isAboutExpanded && (
                                    <div className="border-t border-gray-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-50">
                                            <span className="text-xs text-gray-400">Versão</span>
                                            <span className="text-xs font-semibold text-gray-700 tabular-nums">1.0.0</span>
                                        </div>
                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                            <span className="text-xs text-gray-400">ID do Usuário</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-mono text-gray-600 truncate max-w-[130px]">{user?.id}</span>
                                                <button
                                                    onClick={() => { if (user?.id) { navigator.clipboard.writeText(user.id); alert('ID copiado!'); } }}
                                                    className="text-[10px] font-semibold text-purple-600 hover:text-purple-700"
                                                >
                                                    Copiar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── SEÇÃO: CONTA (sair) ── */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Conta</p>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-red-50 active:bg-red-100 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-red-500">Sair da conta</span>
                                </button>
                            </div>
                        </div>

                        <div className="pb-2" />

                    </div>
                </div>
            )}

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
                            <button
                                onClick={() => confirmGalleryUpload('public')}
                                disabled={uploadingGallery}
                                className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-600 hover:bg-purple-50 transition-all flex items-center gap-4 group text-left"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-purple-100/50 flex items-center justify-center transition-colors">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-purple-600 transition-colors">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="2" y1="12" x2="22" y2="12" />
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 leading-tight">Público</p>
                                    <p className="text-xs text-gray-500">Qualquer pessoa pode ver</p>
                                </div>
                            </button>

                            {isProfessional && (
                                <button
                                    onClick={() => confirmGalleryUpload('subscribers')}
                                    disabled={uploadingGallery}
                                    className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-600 hover:bg-purple-50 transition-all flex items-center gap-4 group text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-purple-100/50 flex items-center justify-center transition-colors">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-purple-600 transition-colors">
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
                                </button>
                            )}
                        </div>

                        <Button
                            title="Cancelar"
                            onPress={() => setVisibilityModal({ open: false })}
                            variant="outline"
                            size="md"
                            className="w-full"
                            disabled={uploadingGallery}
                        />
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
