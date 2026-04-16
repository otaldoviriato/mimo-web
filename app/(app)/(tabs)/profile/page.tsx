'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useAuth, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { Avatar } from '@/components/Avatar';
import { useMyProfile, useUpdateProfile, useUploadPhoto } from '@/hooks/useQueries';
import { usePayment } from '@/context/PaymentContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePWA } from '@/context/PWAContext';

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
    const [chargeMode, setChargeMode] = useState(false);
    const [chargePerChar, setChargePerChar] = useState('0.002');
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);

    const hasPopulatedFromCache = useRef(false);
    const lastSavedChargePerChar = useRef('0.002');

    useEffect(() => {
        if (userData && !hasPopulatedFromCache.current) {
            setUsername(userData.username || '');
            setName(userData.name || '');
            setTaxId(userData.taxId || '');
            setPhone(userData.phone || '');
            setChargeMode(!!userData.chargeMode);
            const formattedCharge = (userData.chargePerChar || 0.002).toString();
            setChargePerChar(formattedCharge);
            lastSavedChargePerChar.current = formattedCharge;
            if (userData.photoUrl) setLocalPhotoUrl(userData.photoUrl);
            hasPopulatedFromCache.current = true;
        } else if (userData) {
            if (userData.photoUrl && !uploadPhotoMutation.isPending) {
                setLocalPhotoUrl(userData.photoUrl);
            }
            if (userData.taxId && !taxId) setTaxId(userData.taxId);
            if (userData.phone && !phone) setPhone(userData.phone);
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
        const parsedCharge = parseFloat(chargePerChar);
        if (chargeMode && (isNaN(parsedCharge) || parsedCharge < 0)) {
            setSaveError('Insira um valor válido para cobrança por caractere.');
            return;
        }

        setLoading(true);
        setSaveError('');
        setSaveSuccess(false);

        try {
            const updateData: any = { name, username, taxId, phone };
            if (chargeMode) {
                updateData.chargePerChar = parsedCharge;
                lastSavedChargePerChar.current = parsedCharge.toString();
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

    const handleChargeModeToggle = async () => {
        const newValue = !chargeMode;
        setChargeMode(newValue);
        try {
            await updateProfileMutation.mutateAsync({ chargeMode: newValue });
        } catch {
            setChargeMode(!newValue);
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
        try {
            // Primeiro garante que temos o token e permissão
            await handleRequestPermission();

            const response = await fetch('/api/notifications/test', {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Falha ao enviar notificação');
            
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error(error);
            setSaveError('Erro ao testar notificação. Verifique se as permissões estão ativas.');
            setTimeout(() => setSaveError(''), 3000);
        } finally {
            setTestingNotification(false);
        }
    };

    const onRefresh = useCallback(() => refetchProfile(), [refetchProfile]);

    if (loadingProfile && !userData) {
        return (
            <div className="flex flex-col h-full overflow-y-auto pb-16 md:pb-0">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-4">
                    <div className="h-7 w-24 bg-purple-400/50 rounded-lg" />
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
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-4 flex items-center justify-between shrink-0">
                <h1 className="text-xl font-bold text-white">Meu Perfil</h1>
                {isFetching && !loadingProfile && (
                    <div className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs text-white/70">Atualizando...</span>
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

                {/* Balance */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <BalanceDisplay balance={userData?.balance ?? 0} size="lg" />
                    <Button
                        title="Recarregar Saldo"
                        onPress={openRechargeModal}
                        variant="outline"
                        size="md"
                        className="mt-3 w-full"
                    />
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
                        onChange={(e) => setTaxId(e.target.value)}
                        type="text"
                    />

                    <Input
                        label="WhatsApp / Telefone"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        type="tel"
                    />

                    {/* Charge toggle */}
                    <div className="flex items-center justify-between py-3 border-t border-gray-100">
                        <div className="flex-1 mr-4">
                            <p className="text-sm font-medium text-gray-900">Cobrar por Conversa</p>
                            <p className="text-xs text-gray-500 mt-0.5">Ative para receber pagamentos por mensagens</p>
                        </div>
                        <button
                            onClick={handleChargeModeToggle}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${chargeMode ? 'bg-purple-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${chargeMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {chargeMode && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex flex-col gap-2">
                            <Input
                                label="Valor por Caractere (R$)"
                                placeholder="0.002"
                                value={chargePerChar}
                                onChange={(e) => setChargePerChar(e.target.value)}
                                type="number"
                                step="0.001"
                            />
                            <p className="text-xs text-purple-700">
                                💡 Recomendado: R$ 0,001 a R$ 0,005 por caractere
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
                    <Button
                        title="Enviar Notificação de Teste"
                        onPress={handleTestNotification}
                        loading={testingNotification}
                        variant="outline"
                        size="md"
                        className="w-full"
                    />
                </div>

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
        </div>
    );
}
