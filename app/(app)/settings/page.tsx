'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile, useUpdateProfile } from '@/hooks/useQueries';
import { usePWA } from '@/context/PWAContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { formatCPF, formatPhone } from '@/components/RechargeModal';
import Link from 'next/link';

function SkeletonField() {
    return (
        <div className="px-4 py-3.5 border-b border-gray-50 animate-pulse">
            <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-5 w-40 bg-gray-100 rounded" />
        </div>
    );
}

interface SettingsPageProps {
    isSubPage?: boolean;
    onBack?: () => void;
    isClosing?: boolean;
}

export default function SettingsPage({ isSubPage = false, onBack, isClosing = false }: SettingsPageProps) {
    const { user } = useUser();
    const { signOut } = useClerk();
    const router = useTransitionRouter();
    const { isInstallable, promptInstall, mounted, isStandalone } = usePWA();
    const { permission: notificationPermission, handleRequestPermission } = usePushNotifications();

    const { data: userData, isLoading: loadingProfile } = useMyProfile();
    const updateProfileMutation = useUpdateProfile();

    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [phone, setPhone] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [subscriptionPrice, setSubscriptionPrice] = useState('');
    const [isSubscriptionEnabled, setIsSubscriptionEnabled] = useState(false);
    const [bio, setBio] = useState('');

    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
    const [savingEmailPref, setSavingEmailPref] = useState(false);

    const hasPopulated = useRef(false);

    // Resolve a transição de visualização imediatamente para não travar a animação de slide-in
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__resolveTransition) {
            (window as any).__resolveTransition();
            (window as any).__resolveTransition = null;
        }
    }, []);

    useEffect(() => {
        if (userData && !hasPopulated.current) {
            setUsername(userData.username || '');
            setName(userData.name || '');
            setTaxId(userData.taxId ? formatCPF(userData.taxId) : '');
            setPhone(userData.phone ? formatPhone(userData.phone) : '');
            setPixKey(userData.pixKey || '');
            setSubscriptionPrice(userData.subscriptionPrice?.toString() ?? '0');
            setIsSubscriptionEnabled(userData.isSubscriptionEnabled ?? false);
            setBio(userData.bio || '');
            setEmailNotificationsEnabled(userData.emailNotificationsEnabled ?? false);
            hasPopulated.current = true;
        }
    }, [userData]);

    const handleSaveAll = async () => {
        setLoading(true);
        setSaveError('');
        setSaveSuccess(false);

        try {
            const updateData: any = {
                name,
                username,
                taxId: taxId.replace(/\D/g, ''),
                phone: phone.replace(/\D/g, '')
            };

            if (userData?.isProfessional) {
                const limitMax = userData?.maxSubscriptionPrice ?? 200;
                const limitMin = userData?.minSubscriptionPrice ?? 10;
                const price = Number(subscriptionPrice) || 0;

                if (isSubscriptionEnabled) {
                    if (price <= 0) {
                        setSaveError('O preço da assinatura deve ser maior que zero');
                        setLoading(false);
                        return;
                    }
                    if (price < limitMin) {
                        setSaveError(`O preço da assinatura não pode ser menor que o valor mínimo de R$ ${limitMin.toFixed(2)}`);
                        setLoading(false);
                        return;
                    }
                }

                if (price > limitMax) {
                    setSaveError(`O preço da assinatura não pode ser maior que R$ ${limitMax.toFixed(2)}`);
                    setLoading(false);
                    return;
                }
                updateData.isSubscriptionEnabled = isSubscriptionEnabled;
                updateData.subscriptionPrice = price;
                updateData.bio = bio;
                updateData.pixKey = pixKey;
            } else {
                updateData.bio = '';
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

    const handleLogout = async () => {
        if (confirm('Tem certeza que deseja sair da sua conta?')) {
            await signOut(() => router.replace('/login'));
        }
    };

    const profileIsProfessional = !!userData?.isProfessional;

    const layoutClass = isSubPage
        ? 'w-full h-full'
        : 'min-h-screen w-full';

    return (
        <div className={`bg-gray-50 flex flex-col overflow-y-auto ${layoutClass}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between sticky top-0 z-20 shadow-md">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (isSubPage && onBack) {
                                onBack();
                            } else {
                                router.back();
                            }
                        }}
                        className="text-white hover:bg-white/10 transition-colors p-2 -ml-2 rounded-full flex items-center justify-center"
                        title="Voltar"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Configurações</span>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-4 max-w-md w-full mx-auto pb-24">
                {loadingProfile && !userData ? (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Dados do Perfil</p>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <SkeletonField />
                            <SkeletonField />
                            <SkeletonField />
                            <SkeletonField />
                        </div>
                    </div>
                ) : (
                    <>
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
                                <div className="px-4 py-3.5 border-b border-gray-50">
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
                                {/* Chave Pix (apenas profissionais) */}
                                {profileIsProfessional && (
                                    <div className="px-4 py-3.5 border-b border-gray-50">
                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Chave Pix</label>
                                        <input
                                            className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                            placeholder="CPF, E-mail, Telefone ou Aleatória"
                                            value={pixKey}
                                            onChange={(e) => setPixKey(e.target.value)}
                                        />
                                    </div>
                                )}
                                {/* Biografia (apenas profissionais) */}
                                {profileIsProfessional && (
                                    <div className="px-4 py-3.5">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Biografia</label>
                                            <span className={`text-[9px] font-medium ${bio.length > 300 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {bio.length}/300
                                            </span>
                                        </div>
                                        <textarea
                                            className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none resize-none h-20"
                                            placeholder="Fale um pouco sobre você..."
                                            value={bio}
                                            onChange={(e) => {
                                                if (e.target.value.length <= 300) {
                                                    setBio(e.target.value);
                                                }
                                            }}
                                            maxLength={300}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── SEÇÃO: PREÇOS E GANHOS (Profissionais) ── */}
                        {profileIsProfessional && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Assinatura e Ganhos</p>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                                    {/* Toggle Habilitar Assinatura */}
                                    <div className="px-4 py-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
                                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800">Oferecer Assinatura</p>
                                                <p className="text-[10px] text-gray-400 leading-snug">
                                                    Permita que os usuários assinem seu perfil para acessar sua galeria privada
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            id="subscription-enabled-toggle"
                                            type="button"
                                            onClick={() => setIsSubscriptionEnabled(!isSubscriptionEnabled)}
                                            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                                                isSubscriptionEnabled ? 'bg-purple-600' : 'bg-gray-200'
                                            }`}
                                            aria-label="Habilitar assinatura no perfil"
                                            role="switch"
                                            aria-checked={isSubscriptionEnabled}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                                isSubscriptionEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Preço da Assinatura (Exibe apenas se habilitado) */}
                                    {isSubscriptionEnabled && (
                                        <div className="px-4 py-3.5 bg-slate-50/30 transition-all">
                                            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Preço da Assinatura Mensal (R$)</label>
                                            <input
                                                className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                                placeholder="0.00"
                                                value={subscriptionPrice}
                                                onChange={(e) => setSubscriptionPrice(e.target.value)}
                                                type="number"
                                                step="0.01"
                                                inputMode="decimal"
                                                max={userData?.maxSubscriptionPrice ?? 200}
                                            />
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                <span className="text-[9px] text-gray-400">
                                                    Valor mínimo permitido: R$ {(userData?.minSubscriptionPrice ?? 10).toFixed(2)}
                                                </span>
                                                <span className="text-[9px] text-gray-400">
                                                    Valor máximo permitido: R$ {(userData?.maxSubscriptionPrice ?? 200).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── SEÇÃO: NOTIFICAÇÕES POR E-MAIL (Profissionais) ── */}
                        {profileIsProfessional && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Notificações por E-mail</p>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
                                                    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,4 12,13 2,4"/>
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800">Alertas de nova conversa</p>
                                                <p className="text-[10px] text-gray-400 leading-snug">
                                                    Receba um e-mail quando um cliente iniciar uma nova sessão de chat com você
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            id="email-notifications-toggle"
                                            onClick={async () => {
                                                const newValue = !emailNotificationsEnabled;
                                                setEmailNotificationsEnabled(newValue);
                                                setSavingEmailPref(true);
                                                try {
                                                    await updateProfileMutation.mutateAsync({ emailNotificationsEnabled: newValue });
                                                } catch {
                                                    // Reverter em caso de erro
                                                    setEmailNotificationsEnabled(!newValue);
                                                } finally {
                                                    setSavingEmailPref(false);
                                                }
                                            }}
                                            disabled={savingEmailPref}
                                            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                                                emailNotificationsEnabled ? 'bg-purple-600' : 'bg-gray-200'
                                            }`}
                                            aria-label="Ativar notificações por e-mail"
                                            role="switch"
                                            aria-checked={emailNotificationsEnabled}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                                emailNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>
                                    {emailNotificationsEnabled && (
                                        <div className="px-4 pb-3 -mt-1">
                                            <p className="text-[10px] text-purple-600 font-medium flex items-center gap-1">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                                E-mails serão enviados para {userData?.email}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── BOTÃO SALVAR ── */}
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
                                    {notificationPermission !== 'granted' && (
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
                                                        {notificationPermission === 'denied'
                                                            ? 'Bloqueadas pelo navegador'
                                                            : 'Alertas de novas mensagens'}
                                                    </p>
                                                </div>
                                            </div>
                                            {notificationPermission === 'denied' ? (
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
                                    )}

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

                                {/* Links de Conformidade Legal */}
                                <div className="border-t border-gray-100 flex flex-col bg-gray-50/30">
                                    <Link
                                        href="/termos-de-uso"
                                        target="_blank"
                                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 flex items-center justify-center text-xs">
                                                📜
                                            </div>
                                            <span className="text-xs text-gray-700 font-medium">Termos de Uso</span>
                                        </div>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    </Link>
                                    <Link
                                        href="/politica-de-privacidade"
                                        target="_blank"
                                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 flex items-center justify-center text-xs">
                                                🔒
                                            </div>
                                            <span className="text-xs text-gray-700 font-medium">Política de Privacidade</span>
                                        </div>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    </Link>
                                </div>
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
                    </>
                )}
            </div>
        </div>
    );
}
