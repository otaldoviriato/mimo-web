'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { Avatar } from '@/components/Avatar';
import { useMyProfile, useUpdateProfile, useUploadPhoto, useMyGallery, useUploadToGallery } from '@/hooks/useQueries';
import { usePayment } from '@/context/PaymentContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePWA } from '@/context/PWAContext';
import { api } from '@/services/api';
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
    const { handleRequestPermission, fcmToken } = usePushNotifications();
    const { isInstallable, promptInstall, mounted, isStandalone } = usePWA();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const { data: galleryData } = useMyGallery();
    const uploadGalleryMutation = useUploadToGallery();

    useEffect(() => {
        console.log('ProfilePage: isInstallable =', isInstallable);
    }, [isInstallable]);

    const { data: userData, isLoading: loadingProfile, isFetching, refetch: refetchProfile } = useMyProfile();
    const updateProfileMutation = useUpdateProfile();
    const uploadPhotoMutation = useUploadPhoto();

    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [phone, setPhone] = useState('');
    const [localPhotoUrl, setLocalPhotoUrl] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [isProfessional, setIsProfessional] = useState(false);
    const [subscriptionPrice, setSubscriptionPrice] = useState('0');
    const [chargePerCharSubscribers, setChargePerCharSubscribers] = useState('0.002');
    const [chargePerCharNonSubscribers, setChargePerCharNonSubscribers] = useState('0.005');
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [notificationSuccess, setNotificationSuccess] = useState(false);
    const [notificationError, setNotificationError] = useState('');
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [visibilityModal, setVisibilityModal] = useState<{ open: boolean, file?: File }>({ open: false });
    const [testingNotification, setTestingNotification] = useState(false);

    const hasPopulatedFromCache = useRef(false);

    useEffect(() => {
        if (userData && !hasPopulatedFromCache.current) {
            setUsername(userData.username || '');
            setName(userData.name || '');
            setTaxId(userData.taxId ? formatCPF(userData.taxId) : '');
            setPhone(userData.phone ? formatPhone(userData.phone) : '');
            setIsProfessional(!!userData.isProfessional);
            setSubscriptionPrice((userData.subscriptionPrice || 0).toString());
            setChargePerCharSubscribers((userData.chargePerCharSubscribers || 0.002).toString());
            setChargePerCharNonSubscribers((userData.chargePerCharNonSubscribers || 0.005).toString());
            if (userData.photoUrl) setLocalPhotoUrl(userData.photoUrl);
            hasPopulatedFromCache.current = true;
        } else if (userData) {
            if (userData.photoUrl && !uploadPhotoMutation.isPending) {
                setLocalPhotoUrl(userData.photoUrl);
            }
            if (userData.taxId && !taxId) setTaxId(formatCPF(userData.taxId));
            if (userData.phone && !phone) setPhone(formatPhone(userData.phone));
        }
    }, [userData]);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const previewUrl = URL.createObjectURL(file);
        setLocalPhotoUrl(previewUrl);

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const uploadResponse = await uploadPhotoMutation.mutateAsync(formData);
            if (uploadResponse.photoUrl) setLocalPhotoUrl(uploadResponse.photoUrl);
        } catch {
            if (userData?.photoUrl) setLocalPhotoUrl(userData.photoUrl);
        }
    };

    const handleSaveAll = async () => {
        const parsedSubRate = parseFloat(chargePerCharSubscribers);
        const parsedNonSubRate = parseFloat(chargePerCharNonSubscribers);
        
        if (isProfessional && (isNaN(parsedSubRate) || parsedSubRate < 0 || isNaN(parsedNonSubRate) || parsedNonSubRate < 0)) {
            setSaveError('Insira valores válidos para as tarifas por caractere.');
            return;
        }

        setLoading(true);
        setSaveError('');
        setSaveSuccess(false);

        try {
            const updateData: any = { 
                name, 
                username, 
                taxId: taxId.replace(/\D/g, ''), 
                phone: phone.replace(/\D/g, ''),
                subscriptionPrice: parseFloat(subscriptionPrice) || 0,
                chargePerCharSubscribers: parsedSubRate,
                chargePerCharNonSubscribers: parsedNonSubRate
            };
            
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

    const handleIsProfessionalToggle = async () => {
        const newValue = !isProfessional;
        if (confirm(`Ao tornar seu perfil ${newValue ? 'profissional' : 'comum'}, todas as suas conversas atuais serão excluídas para garantir a integridade da cobrança. Deseja continuar?`)) {
            setLoading(true);
            try {
                await updateProfileMutation.mutateAsync({ isProfessional: newValue });
                setIsProfessional(newValue);
            } catch (error: any) {
                setSaveError(error.response?.data?.error || 'Erro ao alterar status profissional');
            } finally {
                setLoading(false);
            }
        }
    };


    const handleLogout = async () => {
        if (confirm('Tem certeza que deseja sair da sua conta?')) {
            console.log("Iniciando logout...");
            await signOut(() => router.replace('/login'));
        }
    };

    const handleTestNotification = async () => {
        setTestingNotification(true);
        setNotificationError('');
        console.log('[TestNotification] Iniciando teste...');
        
        try {
            await handleRequestPermission();

            if (Notification.permission !== 'granted') {
                setNotificationError('Permissão de notificação negada. Ative as notificações no navegador.');
                setTestingNotification(false);
                return;
            }

            console.log('[TestNotification] Chamando API de teste...');
            const response = await api.post('/api/notifications/test');

            console.log('[TestNotification] Resposta da API:', response.data);
            
            setNotificationSuccess(true);
            setTimeout(() => setNotificationSuccess(false), 5000);
        } catch (error: any) {
            console.error('[TestNotification] Erro ao testar notificação:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Erro ao testar notificação';
            setNotificationError(`Erro ao disparar notificação: ${errorMsg}. Verifique as permissões.`);
            setTimeout(() => setNotificationError(''), 5000);
        } finally {
            setTestingNotification(false);
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
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Perfil</span>
                </div>
                {isFetching && !loadingProfile && (
                    <div className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs text-white/70 font-medium">Atualizando...</span>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 flex flex-col gap-4">
                {/* Avatar card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadPhotoMutation.isPending}
                        className="relative group"
                    >
                        <Avatar uri={localPhotoUrl} size={96} />
                        {uploadPhotoMutation.isPending && (
                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center">
                            <span className="text-sm">✏️</span>
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                    />
                    <p className="mt-3 text-base font-bold text-gray-900">
                        {userData?.name || userData?.username || user?.username || ''}
                    </p>
                    <p className="text-sm text-gray-400">@{userData?.username || ''}</p>
                </div>

                {/* Balance Card - Discreet */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 shrink-0 flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">Saldo na Carteira</span>
                        <div className="text-2xl font-black text-gray-900 tracking-tight">
                            {((userData?.balance ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>

                    <button
                        onClick={isProfessional ? () => alert('Configuração de PIX para retirada disponível em breve!') : openRechargeModal}
                        className="h-10 px-4 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl text-purple-700 font-bold text-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
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

                {/* Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
                    <h2 className="text-base font-bold text-gray-900">Configurações</h2>

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

                    {/* Professional toggle */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-100">
                        <div className="flex-1 mr-4">
                            <p className="text-sm font-medium text-gray-900">Perfil Profissional</p>
                            <p className="text-xs text-gray-500 mt-0.5">Ative para aceitar assinantes e conteúdos exclusivos</p>
                        </div>
                        <button
                            onClick={handleIsProfessionalToggle}
                            disabled={loading}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isProfessional ? 'bg-purple-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isProfessional ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {isProfessional && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-col gap-4">
                             <Input
                                label="Valor da Assinatura Mensal (R$)"
                                placeholder="49.90"
                                value={subscriptionPrice}
                                onChange={(e) => setSubscriptionPrice(e.target.value)}
                                type="number"
                                step="0.01"
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Tarifa Assinantes"
                                    placeholder="0.002"
                                    value={chargePerCharSubscribers}
                                    onChange={(e) => setChargePerCharSubscribers(e.target.value)}
                                    type="number"
                                    step="0.001"
                                />
                                <Input
                                    label="Tarifa Público"
                                    placeholder="0.005"
                                    value={chargePerCharNonSubscribers}
                                    onChange={(e) => setChargePerCharNonSubscribers(e.target.value)}
                                    type="number"
                                    step="0.001"
                                />
                            </div>
                            
                            <p className="text-[10px] text-purple-700 leading-tight">
                                💡 Tarifa por caractere. Recomendado: Público R$ 0,005 / Assinantes R$ 0,002.
                            </p>
                        </div>
                    )}


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
                        className="w-full"
                    />
                </div>

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

                {/* Notifications Test */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl shadow-sm">
                            🔔
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Notificações Push</h2>
                            <p className="text-xs text-gray-500">Teste se o seu dispositivo está recebendo avisos</p>
                        </div>
                    </div>
                    {notificationError && (
                        <p className="text-sm text-red-500">{notificationError}</p>
                    )}
                    {notificationSuccess && !testingNotification && (
                        <p className="text-sm text-green-600 font-medium">✓ Notificação enviada! Verifique seu dispositivo.</p>
                    )}
                    <Button
                        title="Enviar Notificação de Teste"
                        onPress={handleTestNotification}
                        loading={testingNotification}
                        variant="outline"
                        size="md"
                        className="w-full"
                    />
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* About */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
                    <h2 className="text-base font-bold text-gray-900">Sobre</h2>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Versão</span>
                        <span className="text-sm font-medium text-gray-800">1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">ID do Usuário</span>
                        <span className="text-sm font-medium text-gray-800 font-mono">{user?.id?.substring(0, 12)}...</span>
                    </div>
                    <Button
                        title="Sair da Conta"
                        onPress={handleLogout}
                        variant="outline"
                        size="md"
                        className="w-full mt-1 !border-red-400 !text-red-500 hover:!bg-red-50"
                    />
                </div>
            </div>

            {/* Visibility Selection Modal */}
            {visibilityModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-5 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-3xl shadow-inner">
                                🔒
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
                                className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-600 hover:bg-purple-50 transition-all flex items-center gap-3 group text-left"
                            >
                                <span className="text-2xl group-hover:scale-110 transition-transform">🌍</span>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 leading-tight">Público</p>
                                    <p className="text-xs text-gray-500">Qualquer pessoa pode ver</p>
                                </div>
                            </button>

                            {isProfessional && (
                                <button
                                    onClick={() => confirmGalleryUpload('subscribers')}
                                    disabled={uploadingGallery}
                                    className="w-full p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-600 hover:bg-purple-50 transition-all flex items-center gap-3 group text-left"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform">💎</span>
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
        </div>
    );
}
