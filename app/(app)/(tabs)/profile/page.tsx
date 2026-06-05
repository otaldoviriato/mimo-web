'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { Avatar } from '@/components/Avatar';
import { useMyProfile, useUpdateProfile, useUploadPhoto, useUploadCover, useMyGallery, useUploadToGallery, usePendingWithdrawal, useRequestWithdraw, useDeleteFromGallery } from '@/hooks/useQueries';
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

            <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 flex flex-col gap-4">
                {/* Capa e Avatar */}
                <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col items-center pb-5">
                    {/* Capa */}
                    <div className="relative h-32 w-full bg-purple-50 overflow-hidden shrink-0">
                        {localCoverUrl ? (
                            <img 
                                src={localCoverUrl} 
                                alt="Capa" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-500" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/25 to-fuchsia-500/15 mix-blend-overlay" />
                        
                        {/* Editar Capa Botão */}
                        <button
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadCoverMutation.isPending}
                            className="absolute bottom-2 right-2 px-3 py-1 bg-black/40 hover:bg-black/60 active:scale-95 text-white text-[10px] font-bold rounded-lg border border-white/20 backdrop-blur-sm transition-all flex items-center gap-1 shadow-sm"
                            title="Editar capa"
                        >
                            <span>✏️ Capa</span>
                        </button>
                    </div>
                    
                    {/* Input de Capa */}
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverChange}
                    />

                    {/* Avatar */}
                    <div className="-mt-11 z-10 relative">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadPhotoMutation.isPending}
                            className="relative group block p-1 bg-white rounded-full shadow-lg"
                        >
                            <Avatar uri={localPhotoUrl} size={80} />
                            {uploadPhotoMutation.isPending && (
                                <div className="absolute inset-1 rounded-full bg-black/50 flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100">
                                <span className="text-[11px]">✏️</span>
                            </div>
                            <div className="absolute inset-1 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoChange}
                        />
                    </div>

                    <p className="mt-3 text-base font-bold text-gray-900">
                        {userData?.name || userData?.username || user?.username || ''}
                    </p>
                    <p className="text-sm text-gray-400">@{userData?.username || ''}</p>
                    {isProfessional && (
                        <span className="mt-2 inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                            Profissional
                        </span>
                    )}
                </div>

                {/* Balance Card - Discreet */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 shrink-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">Saldo na Carteira</span>
                            <div className="text-2xl font-black text-gray-900 tracking-tight">
                                {((userData?.balance ?? 0) / 100).toLocaleString('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </div>
                        </div>

                        <button
                            onClick={isProfessional 
                                ? () => {
                                    if (!pixKey) {
                                        setPixModalOpen(true);
                                    } else {
                                        setWithdrawConfirmModalOpen(true);
                                    }
                                } 
                                : openRechargeModal}
                            disabled={isProfessional && pendingWithdrawal != null}
                            className={`h-10 px-4 rounded-xl font-bold text-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2 ${
                                isProfessional && pendingWithdrawal != null
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700'
                            }`}
                        >
                            {isProfessional ? (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                    </svg>
                                    <span>Retirar</span>
                                </>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                    </svg>
                                    <span>Recarregar</span>
                                </>
                            )}
                        </button>
                    </div>
                    {pendingWithdrawal && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 mt-1">
                            <span className="text-amber-500">⏳</span>
                            <div>
                                <p className="text-xs font-bold text-amber-800">Saque Pendente</p>
                                <p className="text-[10px] text-amber-700">
                                    Valor: {((pendingWithdrawal.amount ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Pode levar até 24h.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Gallery Section */}
                {isProfessional && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-gray-900">Minha Galeria</h2>
                            <Button
                                title="Fazer Upload"
                                onPress={() => galleryInputRef.current?.click()}
                                size="sm"
                                variant="outline"
                            />
                            <input
                                ref={galleryInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleGalleryFileChange}
                            />
                        </div>

                        {galleryData?.items?.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                                <span className="text-2xl mb-2">📸</span>
                                <p className="text-sm text-gray-400">Sua galeria está vazia</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {galleryData?.items?.map((item: any) => (
                                    <div key={item._id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                                        <img
                                            src={item.imageUrl}
                                            alt="Gallery item"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-black/50 text-[10px] text-white">
                                            {item.visibility === 'public' ? 'Pública' : 'Assinantes'}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteGalleryItem(item._id);
                                            }}
                                            disabled={deleteGalleryMutation.isPending}
                                            className="absolute bottom-1 right-1 p-1 rounded-md bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                                            title="Excluir foto"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Configurações Overlay */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-y-auto pb-16 md:pb-4 animate-in slide-in-from-right duration-200">
                    {/* Header Config */}
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center gap-3 z-10 sticky top-0 shadow-md">
                        <button
                            onClick={() => {
                                setIsSettingsOpen(false);
                                setSaveError('');
                                setSaveSuccess(false);
                            }}
                            className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors text-white mr-1 flex items-center justify-center"
                            title="Voltar"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12" />
                                <polyline points="12 19 5 12 12 5" />
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold text-white">Configurações</h1>
                    </div>

                    <div className="p-4 flex flex-col gap-4">
                        {/* Dados Pessoais */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">Dados Gerais</h2>
                            
                            <Input
                                label="Nome de Exibição"
                                placeholder="Seu nome real ou apelido"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />

                            <Input
                                label="Username"
                                placeholder="@username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoCapitalize="none"
                            />

                            <Input
                                label="CPF"
                                placeholder="000.000.000-00"
                                value={taxId}
                                onChange={(e) => setTaxId(formatCPF(e.target.value))}
                                maxLength={14}
                                type="text"
                            />

                            <Input
                                label="WhatsApp / Telefone"
                                placeholder="(00) 00000-0000"
                                value={phone}
                                onChange={(e) => setPhone(formatPhone(e.target.value))}
                                maxLength={15}
                                type="tel"
                            />
                        </div>

                        {/* Configurações Profissionais */}
                        {isProfessional && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                                <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">Preços e Ganhos</h2>

                                <Input
                                    label="Preço da Assinatura Mensal (R$)"
                                    placeholder="0.00"
                                    value={subscriptionPrice}
                                    onChange={(e) => setSubscriptionPrice(e.target.value)}
                                    type="number"
                                    step="0.01"
                                />

                                <div className="flex flex-col gap-1">
                                    <Input
                                        label="Valor por caractere (Assinantes) em R$"
                                        placeholder="0.002"
                                        value={chargePerCharSubscribers}
                                        onChange={(e) => setChargePerCharSubscribers(e.target.value)}
                                        type="number"
                                        step="0.0001"
                                    />
                                    {chargePerCharSubscribers && !isNaN(Number(chargePerCharSubscribers)) && (
                                        <span className="text-[11px] text-gray-500 italic px-1">
                                            💡 Uma mensagem de 100 caracteres custará <strong>
                                                {(Number(chargePerCharSubscribers) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                                            </strong> para seus assinantes.
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Input
                                        label="Valor por caractere (Não Assinantes) em R$"
                                        placeholder="0.005"
                                        value={chargePerCharNonSubscribers}
                                        onChange={(e) => setChargePerCharNonSubscribers(e.target.value)}
                                        type="number"
                                        step="0.0001"
                                    />
                                    {chargePerCharNonSubscribers && !isNaN(Number(chargePerCharNonSubscribers)) && (
                                        <span className="text-[11px] text-gray-500 italic px-1">
                                            💡 Uma mensagem de 100 caracteres custará <strong>
                                                {(Number(chargePerCharNonSubscribers) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                                            </strong> para não assinantes.
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Push Notifications Card */}
                        {mounted && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl text-purple-700 font-bold shrink-0">
                                        🔔
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-gray-900">Notificações no Celular</h2>
                                        <p className="text-xs text-gray-500 leading-snug">
                                            {notificationPermission === 'granted'
                                                ? 'Ativadas para este dispositivo.'
                                                : notificationPermission === 'denied'
                                                    ? 'Bloqueadas nas configurações do seu navegador.'
                                                    : 'Receba alertas de novas mensagens em tempo real.'}
                                        </p>
                                    </div>
                                </div>
                                {notificationPermission !== 'granted' && (
                                    <Button
                                        title={notificationPermission === 'denied' ? "Como Desbloquear" : "Ativar Notificações"}
                                        onPress={notificationPermission === 'denied'
                                            ? () => alert('Acesse as configurações do seu navegador ou celular, procure as permissões de notificação deste site e marque como "Permitir".')
                                            : handleRequestPermission}
                                        size="md"
                                        className="w-full bg-purple-600 hover:bg-purple-700 shadow-md !text-white"
                                    />
                                )}
                            </div>
                        )}

                        {/* PWA Install Button */}
                        {mounted && isInstallable && !isStandalone && (
                            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-xl shadow-sm text-white">
                                        📲
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-gray-900">Aplicativo Mimo</h2>
                                        <p className="text-xs text-gray-500">Instale para ter acesso rápido e notificações</p>
                                    </div>
                                </div>
                                <Button
                                    title="Instalar Agora"
                                    onPress={promptInstall}
                                    size="md"
                                    className="w-full bg-purple-600 hover:bg-purple-700 shadow-md !text-white"
                                />
                            </div>
                        )}

                        {/* Accordion Sobre o Mimo */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
                            <button
                                onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                                className="flex items-center justify-between w-full text-left font-bold text-gray-900 focus:outline-none"
                            >
                                <span>Sobre o Mimo</span>
                                <span className="text-gray-400 transition-transform duration-200" style={{ transform: isAboutExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    ▼
                                </span>
                            </button>
                            {isAboutExpanded && (
                                <div className="flex flex-col gap-3 mt-2 border-t border-gray-100 pt-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500">Versão</span>
                                        <span className="font-medium text-gray-800">1.0.0</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500">ID do Usuário</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-800 font-mono text-[11px] truncate max-w-[150px]">{user?.id}</span>
                                            <button
                                                onClick={() => {
                                                    if (user?.id) {
                                                        navigator.clipboard.writeText(user.id);
                                                        alert('ID copiado para a área de transferência!');
                                                    }
                                                }}
                                                className="text-xs text-purple-600 hover:text-purple-700 font-semibold"
                                            >
                                                Copiar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Botão de Salvar Alterações e Logs */}
                        <div className="mt-2 flex flex-col gap-2">
                            {saveError && (
                                <p className="text-sm text-red-500">{saveError}</p>
                            )}
                            {saveSuccess && (
                                <p className="text-sm text-green-600 font-medium">✓ Perfil atualizado com sucesso!</p>
                            )}

                            <Button
                                title="Salvar Alterações"
                                onPress={handleSaveAll}
                                loading={loading}
                                size="md"
                                className="w-full bg-purple-600 hover:bg-purple-700 shadow-md !text-white"
                            />
                        </div>

                        {/* Logout no fim */}
                        <div className="mt-4">
                            <Button
                                title="Sair da Conta"
                                onPress={handleLogout}
                                variant="outline"
                                size="md"
                                className="w-full !border-red-400 !text-red-500 hover:!bg-red-50"
                            />
                        </div>
                    </div>
                </div>
            )}

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
