'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { Avatar } from '@/components/Avatar';
import { useMyProfile, useUploadPhoto, useUploadCover, useMyGallery, useUploadToGallery, useDeleteFromGallery, useDepositHistory, useChatRooms, useUpdateGalleryItemVisibility } from '@/hooks/useQueries';
import { ImageCropper } from '@/components/ImageCropper';
import { usePayment } from '@/context/PaymentContext';
import { PullToRefresh } from '@/components';
import { Settings, Share2, Image as ImageIcon, Lock, Trash2, Plus, AlertTriangle, ShieldCheck, ShieldAlert, Heart, Globe, Crown, Camera, Gift, CreditCard, QrCode, Star, Info, CheckCircle2, X, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { user } = useUser();
    const router = useTransitionRouter();
    const { openRechargeModal } = usePayment();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const privateGalleryInputRef = useRef<HTMLInputElement>(null);

    const { data: userData, isLoading: loadingProfile, refetch: refetchProfile } = useMyProfile();
    const { data: galleryData, refetch: refetchGallery } = useMyGallery();
    const uploadPhotoMutation = useUploadPhoto();
    const uploadCoverMutation = useUploadCover();
    const uploadGalleryMutation = useUploadToGallery();
    const deleteGalleryMutation = useDeleteFromGallery();
    const updateGalleryItemVisibilityMutation = useUpdateGalleryItemVisibility();
    const { data: depositHistory, isLoading: loadingHistory, refetch: refetchHistory } = useDepositHistory();
    const { data: rooms = [], refetch: refetchRooms } = useChatRooms();

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
            refetchHistory()
        ]);
    }, [refetchProfile, refetchHistory]);

    const [localPhotoUrl, setLocalPhotoUrl] = useState<string | undefined>(undefined);
    const [localCoverUrl, setLocalCoverUrl] = useState<string | undefined>(undefined);
    const [activeGalleryTab, setActiveGalleryTab] = useState<'public' | 'private'>('public');
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [selectedVisibility, setSelectedVisibility] = useState<'public' | 'subscribers'>('public');
    const [visibilityModal, setVisibilityModal] = useState<{ open: boolean, file?: File }>({ open: false });
    const [cropperState, setCropperState] = useState<{ open: boolean; imageSrc: string; type: 'photo' | 'cover' } | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [showItemOptionsMenu, setShowItemOptionsMenu] = useState(false);

    useEffect(() => {
        if (userData) {
            if (userData.photoUrl) setLocalPhotoUrl(userData.photoUrl);
            if (userData.coverUrl) setLocalCoverUrl(userData.coverUrl);
        }
    }, [userData]);

    const handleShare = async () => {
        if (typeof window === 'undefined' || !userData?.username) return;

        const profileUrl = `${window.location.origin}/${userData.username}`;
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

    // ─── LAYOUT CREATOR (PROFISSIONAL) ───────────────────────────────────────
    if (isProfessional) {
        return (
            <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden max-w-full">
                <PullToRefresh onRefresh={onRefreshCreator} className="pb-28 no-scrollbar">
                {/* Efeitos de Fundo Aurora */}
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

                
                {/* Capa e Avatar */}
                <div className="relative shrink-0 z-10">
                    <div className="relative h-44 w-full overflow-hidden bg-purple-50 shadow-inner">
                        {localCoverUrl ? (
                            <img src={localCoverUrl} alt="Foto de capa" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-fuchsia-500" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                        
                        {/* Botão de Alterar Capa */}
                        <button
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadCoverMutation.isPending}
                            className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/40 hover:bg-black/60 active:scale-90 active:bg-black/70 text-white text-[10px] font-bold rounded-xl border border-white/20 backdrop-blur-md transition-all duration-75 flex items-center gap-1.5"
                        >
                            <Camera className="w-3.5 h-3.5 text-white" />
                            Alterar Capa
                        </button>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                    </div>

                    {/* Compartilhar — canto superior esquerdo da capa */}
                    <button
                        onClick={handleShare}
                        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/35 transition-all duration-75 active:scale-75 active:bg-black/40 z-20"
                        title="Compartilhar perfil"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>

                    {/* Configurações — canto superior direito da capa */}
                    <button
                        onClick={() => router.push('/settings')}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/35 transition-all duration-75 active:scale-75 active:bg-black/40 z-20"
                        title="Configurações"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    
                    {/* Avatar Centralizado e Upload */}
                    <div className="px-6 -mt-14 flex flex-col items-center relative z-10 w-fit mx-auto pointer-events-none">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadPhotoMutation.isPending}
                            className="relative group p-1 bg-white rounded-full shadow-2xl transition-transform duration-75 active:scale-90 border-2 border-purple-100 pointer-events-auto"
                        >
                            <Avatar uri={localPhotoUrl} size={100} />
                            <div className="absolute inset-1 rounded-full bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </div>
                </div>

                {/* Conteúdo do Perfil */}
                <div className="px-6 mt-4 flex flex-col items-center relative z-10">
                    <div className="flex items-center gap-1.5">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">
                            {userData?.name || `@${userData?.username}`}
                        </h1>
                        <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                    </div>
                    <p className="text-purple-600 font-bold text-sm tracking-wide mt-0.5">
                        @{userData?.username}
                    </p>

                    {/* Biografia */}
                    {userData?.bio && (
                        <p className="mt-4 px-4 text-center text-xs text-slate-600 leading-relaxed max-w-sm italic font-medium">
                            "{userData.bio}"
                        </p>
                    )}

                    {/* Botão de Edição de Perfil */}
                    <button
                        onClick={() => router.push('/settings')}
                        className="mt-5 w-full max-w-xs h-9 bg-purple-50 hover:bg-purple-100/80 border border-purple-100/80 font-bold text-xs text-purple-700 rounded-xl transition-all duration-75 active:scale-95 active:bg-purple-200/50 flex items-center justify-center gap-2"
                    >
                        <Settings className="w-3.5 h-3.5 text-purple-400" />
                        Editar Perfil
                    </button>

                    {/* Painel de Estatísticas de Credibilidade */}
                    <div className="w-full max-w-sm mt-6 grid grid-cols-3 gap-2 border-y border-slate-200/50 py-3.5 px-4 mb-2 bg-white/40 backdrop-blur-sm rounded-xl">
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-800 tabular-nums">
                                {userData?.subscribers?.length ?? 0}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Assinantes
                            </span>
                        </div>
                        <div className="flex flex-col items-center text-center border-x border-slate-200/50">
                            <span className="text-sm font-bold text-slate-800 tabular-nums">
                                {publicItemsCount}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Mídias Públicas
                            </span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <span className="text-sm font-bold text-slate-800 tabular-nums">
                                {galleryData?.privateItems?.length ?? 0}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Mídias Privadas
                            </span>
                        </div>
                    </div>
                </div>

                {/* Seção da Galeria */}
                <div className="px-4 mt-4 max-w-md w-full mx-auto flex flex-col gap-3 relative z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-800">Minha Galeria</h2>
                        
                        {activeGalleryTab === 'public' ? (
                            <button
                                onClick={() => galleryInputRef.current?.click()}
                                className="h-7 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-75 flex items-center gap-1 active:scale-90 active:bg-slate-100"
                            >
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                                Adicionar Foto
                            </button>
                        ) : (
                            <button
                                onClick={() => privateGalleryInputRef.current?.click()}
                                className="h-7 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-75 flex items-center gap-1 active:scale-90 active:bg-slate-100"
                            >
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                                Adicionar Mídia
                            </button>
                        )}
                        
                        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryFileChange} />
                        <input ref={privateGalleryInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePrivateGalleryFileChange} />
                    </div>

                    {/* Seletor de Abas */}
                    <div className="flex border-b border-gray-150">
                        <button
                            onClick={() => setActiveGalleryTab('public')}
                            className={`flex-1 pb-2.5 text-xs font-bold transition-all duration-75 border-b-2 text-center active:scale-95 active:bg-slate-100/50 ${
                                activeGalleryTab === 'public'
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-400'
                            }`}
                        >
                            Pública ({publicItemsCount})
                        </button>
                        <button
                            onClick={() => setActiveGalleryTab('private')}
                            className={`flex-1 pb-2.5 text-xs font-bold transition-all duration-75 border-b-2 text-center active:scale-95 active:bg-slate-100/50 ${
                                activeGalleryTab === 'private'
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-400'
                            }`}
                        >
                            Privada ({galleryData?.privateItems?.length ?? 0})
                        </button>
                    </div>

                    {/* Avisos/Alertas de Validação */}
                    {activeGalleryTab === 'private' && (
                        <div className="bg-purple-50/50 border border-purple-100/60 rounded-2xl p-3 flex items-start gap-2.5">
                            <Lock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-purple-800 font-medium leading-snug">
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
                            <div className="py-8 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl gap-1.5 bg-white/50">
                                <ImageIcon className="w-6 h-6 text-gray-300" />
                                <p className="text-xs text-gray-400">Nenhuma foto pública ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                                {(galleryData?.publicItems ?? galleryData?.items ?? []).map((item: any) => (
                                    <div 
                                        key={item._id} 
                                        onClick={() => setSelectedItem(item)}
                                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform duration-75"
                                    >
                                        <img src={item.imageUrl} alt="Gallery" className="w-full h-full object-cover" />
                                        <div className="absolute top-1.5 left-1.5 p-1 rounded-lg bg-black/50 text-white backdrop-blur-md flex items-center justify-center border border-white/10" title={item.visibility === 'public' ? 'Pública' : 'Exclusiva para Assinantes'}>
                                            {item.visibility === 'public' ? (
                                                <Globe className="w-3 h-3 text-slate-200" />
                                            ) : (
                                                <Crown className="w-3 h-3 text-amber-300" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        (galleryData?.privateItems?.length ?? 0) === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-2xl gap-1.5 bg-white/50">
                                <Lock className="w-6 h-6 text-gray-300" />
                                <p className="text-xs text-gray-400">Nenhuma mídia privada ainda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1.5">
                                {galleryData?.privateItems?.map((item: any) => (
                                    <div 
                                        key={item._id} 
                                        onClick={() => setSelectedItem(item)}
                                        className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform duration-75"
                                    >
                                        {item.mediaType === 'video' ? (
                                            <div className="w-full h-full relative">
                                                <video src={item.imageUrl} preload="metadata" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                    <span className="text-white text-lg">▶</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={item.imageUrl} alt="Private Gallery" className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute top-1.5 left-1.5 p-1 rounded-lg bg-black/50 text-white backdrop-blur-md flex items-center justify-center border border-white/10" title="Privada">
                                            <Lock className="w-3 h-3 text-purple-300" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

            {/* Modais de Visibilidade e Corte */}
            {visibilityModal.open && visibilityModal.file && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-gray-900">Visibilidade da Foto</h2>
                            <p className="text-xs text-gray-400 mt-1">Escolha quem pode ver esta foto na sua galeria.</p>
                        </div>
                        
                        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-150 border border-gray-100">
                            <img src={URL.createObjectURL(visibilityModal.file)} className="w-full h-full object-cover" alt="Preview" />
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => setSelectedVisibility('public')}
                                className={`w-full p-3 rounded-2xl border-2 transition-all duration-75 active:scale-95 flex items-center gap-3 text-left ${
                                    selectedVisibility === 'public' 
                                        ? 'border-purple-600 bg-purple-50/20 text-purple-900' 
                                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100/50'
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg flex items-center justify-center ${selectedVisibility === 'public' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/60 text-slate-500'}`}>
                                    <Globe className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">Pública</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Visível para qualquer visitante do seu perfil</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setSelectedVisibility('subscribers')}
                                className={`w-full p-3 rounded-2xl border-2 transition-all duration-75 active:scale-95 flex items-center gap-3 text-left ${
                                    selectedVisibility === 'subscribers' 
                                        ? 'border-purple-600 bg-purple-50/20 text-purple-900' 
                                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100/50'
                                }`}
                            >
                                <div className={`p-1.5 rounded-lg flex items-center justify-center ${selectedVisibility === 'subscribers' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200/60 text-slate-500'}`}>
                                    <Crown className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">Somente Assinantes</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Apenas assinantes do seu canal</p>
                                </div>
                            </button>
                        </div>

                        <div className="flex gap-2.5 mt-1">
                            <button
                                onClick={() => setVisibilityModal({ open: false })}
                                className="flex-1 h-9 rounded-xl border border-gray-250 font-bold text-xs text-gray-600 transition-all duration-75 active:scale-95 active:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => confirmGalleryUpload(selectedVisibility)}
                                disabled={uploadingGallery}
                                className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center transition-all duration-75 active:scale-95 active:bg-purple-800"
                            >
                                {uploadingGallery ? 'Enviando...' : 'Confirmar'}
                            </button>
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

            {/* Modal de Imagem em Tela Cheia */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black animate-in fade-in duration-200">
                    {/* Cabeçalho do Modal */}
                    <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-md z-10 shrink-0">
                        <button
                            onClick={() => {
                                setSelectedItem(null);
                                setShowItemOptionsMenu(false);
                            }}
                            className="w-10 h-10 rounded-full hover:bg-white/10 active:scale-75 flex items-center justify-center text-white transition-all duration-75"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                {selectedItem.galleryType === 'public' ? 'Galeria Pública' : 'Galeria Privada'}
                            </span>
                            <span className="text-xs font-bold text-white flex items-center justify-center gap-1">
                                {selectedItem.galleryType === 'public' ? (
                                    selectedItem.visibility === 'public' ? (
                                        <>
                                            <Globe className="w-3.5 h-3.5 text-slate-300" />
                                            Pública
                                        </>
                                    ) : (
                                        <>
                                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                                            Assinantes
                                        </>
                                    )
                                ) : (
                                    <>
                                        <Lock className="w-3.5 h-3.5 text-purple-400" />
                                        Privada (Assinantes)
                                    </>
                                )}
                            </span>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowItemOptionsMenu(!showItemOptionsMenu)}
                                className="w-10 h-10 rounded-full hover:bg-white/10 active:scale-75 flex items-center justify-center text-white transition-all duration-75"
                            >
                                <MoreVertical className="w-6 h-6" />
                            </button>

                            {/* Dropdown de Opções */}
                            {showItemOptionsMenu && (
                                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                                    {selectedItem.galleryType === 'public' && (
                                        <button
                                            onClick={async () => {
                                                const newVisibility = selectedItem.visibility === 'public' ? 'subscribers' : 'public';
                                                try {
                                                    await updateGalleryItemVisibilityMutation.mutateAsync({
                                                        itemId: selectedItem._id,
                                                        visibility: newVisibility,
                                                    });
                                                    setSelectedItem({
                                                        ...selectedItem,
                                                        visibility: newVisibility,
                                                    });
                                                    toast.success(`Visibilidade alterada para ${newVisibility === 'public' ? 'Pública' : 'Assinantes'}`);
                                                } catch (err: any) {
                                                    toast.error(err.message || 'Erro ao alterar visibilidade');
                                                } finally {
                                                    setShowItemOptionsMenu(false);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 active:scale-95 transition-all duration-75 flex items-center gap-2.5"
                                        >
                                            {selectedItem.visibility === 'public' ? (
                                                <>
                                                    <Crown className="w-4 h-4 text-amber-500" />
                                                    Mudar para Assinantes
                                                </>
                                            ) : (
                                                <>
                                                    <Globe className="w-4 h-4 text-slate-500" />
                                                    Mudar para Pública
                                                </>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        onClick={async () => {
                                            if (confirm('Tem certeza que deseja excluir esta foto da sua galeria?')) {
                                                try {
                                                    await deleteGalleryMutation.mutateAsync(selectedItem._id);
                                                    toast.success('Item excluído com sucesso');
                                                    setSelectedItem(null);
                                                } catch (err: any) {
                                                    toast.error(err.message || 'Erro ao excluir item');
                                                } finally {
                                                    setShowItemOptionsMenu(false);
                                                }
                                            }
                                        }}
                                        disabled={deleteGalleryMutation.isPending}
                                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50/50 active:bg-red-100/50 active:scale-95 transition-all duration-75 flex items-center gap-2.5"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir Foto
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Visualização Central */}
                    <div className="flex-1 flex items-center justify-center bg-black">
                        {selectedItem.mediaType === 'video' ? (
                            <video
                                src={selectedItem.imageUrl}
                                controls
                                autoPlay
                                className="w-full h-full max-h-[80vh] object-contain bg-black"
                            />
                        ) : (
                            <img
                                src={selectedItem.imageUrl}
                                alt="Gallery item in fullscreen"
                                className="w-full h-full max-h-[80vh] object-contain"
                            />
                        )}
                    </div>
                    
                    {/* Rodapé Vazio para Balanço Visual */}
                    <div className="h-16 bg-black shrink-0" />
                </div>
            )}
                </PullToRefresh>
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

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between sticky top-0 z-20 shadow-md">
                <div className="flex items-center gap-3">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-8 h-8 object-contain shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Perfil</span>
                </div>
                <div className="flex items-center gap-1">
                    {userData?.isAdmin && (
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-white/10 active:bg-white/20 active:scale-75 rounded-full transition-all duration-75 text-white flex items-center justify-center"
                            title="Painel Admin"
                        >
                            <ShieldAlert className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/settings')}
                        className="p-2 hover:bg-white/10 active:bg-white/20 active:scale-75 rounded-full transition-all duration-75 text-white flex items-center justify-center"
                        title="Configurações"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <PullToRefresh onRefresh={onRefreshClient} className="px-4 pt-5 pb-24 max-w-md w-full mx-auto relative z-10">
                {/* Informações Básicas */}
                <div className="bg-white rounded-3xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm shadow-purple-100/40">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadPhotoMutation.isPending}
                        className="relative shrink-0 block p-0.5 bg-purple-50 rounded-full border border-purple-100 shadow-sm transition-all duration-75 active:scale-90"
                    >
                        <Avatar uri={localPhotoUrl} size={64} />
                        {/* Ícone indicador de edição de foto */}
                        <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-purple-600 border border-white flex items-center justify-center shadow-md">
                            <Camera className="w-3 h-3 text-white" />
                        </div>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-gray-900 truncate">
                            {userData?.name || userData?.username || user?.username || ''}
                        </h2>
                        <p className="text-xs text-purple-600 font-medium">@{userData?.username || ''}</p>
                        <p className="text-[10px] text-gray-400 mt-1">Conta Ativa</p>
                    </div>
                </div>

                {/* Card de Saldo */}
                <div className="mt-3 bg-white rounded-3xl border border-gray-100 p-5 shadow-sm shadow-purple-100/40 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Meu Saldo</span>
                            <span className="text-2xl font-black text-gray-900 tracking-tight mt-0.5 block">
                                {((userData?.balance ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                        <button
                            onClick={openRechargeModal}
                            className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all duration-75 active:scale-95 active:bg-purple-800 shadow-sm shadow-purple-600/10 flex items-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Recarregar
                        </button>
                    </div>
                </div>

                {/* Histórico de Depósitos */}
                <div className="mt-3 bg-white rounded-3xl border border-gray-100 p-5 shadow-sm shadow-purple-100/40 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-50 pb-2.5">Histórico de Recargas</h3>
                    
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
                                <div key={tx.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-xl bg-slate-100/70 flex items-center justify-center text-slate-600">
                                            {tx.type === 'gift' && <Gift className="w-4 h-4" />}
                                            {tx.type === 'card' && <CreditCard className="w-4 h-4" />}
                                            {tx.type === 'pix' && <QrCode className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-700">{tx.label}</p>
                                            <p className="text-[10px] text-gray-400">
                                                {new Date(tx.createdAt).toLocaleDateString('pt-BR')} às {new Date(tx.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-green-600">+{tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 text-center py-4">Nenhuma recarga efetuada ainda.</p>
                    )}
                </div>

            </PullToRefresh>

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
