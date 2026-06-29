'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile, useUpdateProfile, useMyGallery } from '@/hooks/useQueries';
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

const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return '';
    }
};

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
    const [subscriptionPrice, setSubscriptionPrice] = useState('');
    const [isSubscriptionEnabled, setIsSubscriptionEnabled] = useState(false);
    const [bio, setBio] = useState('');
    const [chargePerCharSubscribers, setChargePerCharSubscribers] = useState('');
    const [chargePerCharNonSubscribers, setChargePerCharNonSubscribers] = useState('');
    const [hideFromExplore, setHideFromExplore] = useState(false);

    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
    const [savingEmailPref, setSavingEmailPref] = useState(false);
    const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
    const [accountAction, setAccountAction] = useState<'suspend' | 'delete' | null>(null);
    const [accountActionLoading, setAccountActionLoading] = useState(false);
    const [accountActionError, setAccountActionError] = useState('');

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
            setSubscriptionPrice(userData.subscriptionPrice?.toString() ?? '0');
            setIsSubscriptionEnabled(userData.isSubscriptionEnabled ?? false);
            setBio(userData.bio || '');
            setEmailNotificationsEnabled(userData.emailNotificationsEnabled ?? false);
            setChargePerCharSubscribers(userData.chargePerCharSubscribers?.toString() ?? '0.002');
            setChargePerCharNonSubscribers(userData.chargePerCharNonSubscribers?.toString() ?? '0.005');
            setHideFromExplore(userData.hideFromExplore ?? false);
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
                const limitMaxPrice = userData?.maxPricePerChar ?? 0.2;
                const charPrice = Number(chargePerCharNonSubscribers) || 0;
                if (charPrice > limitMaxPrice) {
                    setSaveError(`O preço máximo por caractere é R$ ${limitMaxPrice.toFixed(2)}`);
                    setLoading(false);
                    return;
                }

                updateData.isSubscriptionEnabled = isSubscriptionEnabled;
                updateData.subscriptionPrice = price;
                updateData.bio = bio;
                updateData.chargePerCharNonSubscribers = charPrice;
                updateData.chargePerCharSubscribers = Number(chargePerCharSubscribers) || 0;
                updateData.hideFromExplore = hideFromExplore;
            } else {
                updateData.bio = '';
                updateData.hideFromExplore = false;
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

    const closeAccountActionModal = () => {
        if (accountActionLoading) return;
        setAccountAction(null);
        setAccountActionError('');
    };

    const handleAccountActionConfirm = async () => {
        if (!accountAction) return;

        setAccountActionLoading(true);
        setAccountActionError('');

        try {
            const response = await fetch('/api/users/me/account', {
                method: accountAction === 'suspend' ? 'PATCH' : 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Não foi possível concluir a ação.');
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem('mimo_profile');
            }

            await signOut(() => router.replace('/login'));
        } catch (error: any) {
            setAccountActionError(error.message || 'Não foi possível concluir a ação.');
        } finally {
            setAccountActionLoading(false);
        }
    };

    const { data: galleryData } = useMyGallery();

    const handleAdjustPrice = (delta: number) => {
        const limitMax = userData?.maxPricePerChar ?? 0.2;
        const discountFactor = 1 - (userData?.subscriberDiscountPercentage ?? 20) / 100;
        const currentPrice = Number(chargePerCharNonSubscribers) || 0;
        let newPrice = currentPrice + delta;

        if (newPrice > limitMax) {
            newPrice = limitMax;
        } else if (newPrice < 0) {
            newPrice = 0;
        }

        const newPriceStr = parseFloat(newPrice.toFixed(4)).toString();
        const subscriberPriceStr = parseFloat((newPrice * discountFactor).toFixed(4)).toString();

        setChargePerCharNonSubscribers(newPriceStr);
        setChargePerCharSubscribers(subscriberPriceStr);
    };

    const handleInputBlur = () => {
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
            nonSubPrice = limitMax;
        }

        const subPrice = parseFloat((nonSubPrice * discountFactor).toFixed(4));

        setChargePerCharNonSubscribers(nonSubPrice.toString());
        setChargePerCharSubscribers(subPrice.toString());
    };

    const profileIsProfessional = !!userData?.isProfessional;

    const initialName = userData?.name || '';
    const initialUsername = userData?.username || '';
    const initialPhone = userData?.phone ? formatPhone(userData?.phone) : '';
    const initialBio = userData?.bio || '';

    const hasPersonalChanges =
        name !== initialName ||
        username !== initialUsername ||
        phone !== initialPhone ||
        (profileIsProfessional && (bio !== initialBio || hideFromExplore !== (userData?.hideFromExplore ?? false)));

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

            <div className="p-4 flex flex-col gap-4 max-w-md w-full mx-auto pb-12">
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
                                {/* E-mail */}
                                <div className="px-4 py-3.5 border-b border-gray-50 bg-gray-50/50">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">E-mail</label>
                                    <input
                                        className="w-full text-sm text-gray-500 font-medium bg-transparent focus:outline-none cursor-not-allowed"
                                        value={userData?.email || ''}
                                        readOnly
                                        disabled
                                    />
                                </div>
                                {/* CPF */}
                                <div className="px-4 py-3.5 border-b border-gray-50 bg-gray-50/50">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">CPF</label>
                                    <input
                                        id="settings-cpf-input"
                                        className="w-full text-sm text-gray-500 font-medium bg-transparent focus:outline-none cursor-not-allowed"
                                        placeholder="Não informado"
                                        value={taxId}
                                        readOnly
                                        disabled
                                    />
                                </div>
                                {/* Data de Nascimento */}
                                <div className="px-4 py-3.5 border-b border-gray-50 bg-gray-50/50">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Data de Nascimento</label>
                                    <input
                                        className="w-full text-sm text-gray-500 font-medium bg-transparent focus:outline-none cursor-not-allowed"
                                        placeholder="Não informada"
                                        value={userData?.birthDate ? formatDate(userData.birthDate) : ''}
                                        readOnly
                                        disabled
                                    />
                                </div>
                                {/* Telefone */}
                                <div className="px-4 py-3.5 border-b border-gray-50">
                                    <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Telefone / WhatsApp</label>
                                    <input
                                        id="settings-phone-input"
                                        className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                        placeholder="(00) 00000-0000"
                                        value={phone}
                                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                                        maxLength={15}
                                        type="tel"
                                    />
                                </div>
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

                                {/* Botão Salvar (e alertas) */}
                                <div className="px-4 pb-5 pt-2 flex flex-col gap-2">
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
                                        disabled={loading || !hasPersonalChanges}
                                        className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                        )}
                                        Salvar Alterações
                                    </button>
                                </div>
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

                                    {/* Preço por Caractere */}
                                    <div className="px-4 py-3.5 bg-slate-50/20 border-t border-gray-50 flex flex-col gap-3">
                                        <div>
                                            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block">Preço por Caractere (Mensagens)</label>
                                            <p className="text-[9px] text-gray-400 leading-snug mt-0.5">
                                                Defina o preço base por caractere digitado no chat. Assinantes têm {userData?.subscriberDiscountPercentage ?? 20}% de desconto automaticamente.
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-2.5 border border-gray-100 mt-1">
                                            <span className="text-xs font-semibold text-gray-500">Valor Base</span>
                                            
                                            <div className="flex items-center gap-2">
                                                {/* Botão Decrementar */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleAdjustPrice(-0.001)}
                                                    disabled={Number(chargePerCharNonSubscribers) <= 0}
                                                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                                                    title="Diminuir preço"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                    </svg>
                                                </button>

                                                {/* Input de Valor */}
                                                <div className="relative flex items-center">
                                                    <span className="absolute left-2 text-xs font-bold text-gray-400">R$</span>
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        min="0"
                                                        className="w-20 h-7 pl-6 pr-1 text-center text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                    type="button"
                                                    onClick={() => handleAdjustPrice(0.001)}
                                                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                                                    title="Aumentar preço"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Detalhes de cálculo dinâmico */}
                                        <div className="grid grid-cols-2 gap-2 bg-purple-50/40 rounded-xl p-2.5 border border-purple-50 text-[10px] mt-0.5">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-gray-400 uppercase tracking-wider text-[8px]">Não Assinantes</span>
                                                <span className="font-bold text-gray-800">
                                                    {Number(chargePerCharNonSubscribers).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}
                                                </span>
                                                <span className="text-[8.5px] text-gray-500 font-medium">
                                                    100 chars = {((Number(chargePerCharNonSubscribers) || 0) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-col gap-0.5 border-l border-purple-100/50 pl-2.5">
                                                <span className="font-semibold text-purple-600 uppercase tracking-wider text-[8px] flex items-center gap-0.5">
                                                    Assinantes
                                                    <span className="bg-purple-100 text-purple-700 text-[7px] font-extrabold px-1 rounded">-{userData?.subscriberDiscountPercentage ?? 20}%</span>
                                                </span>
                                                <span className="font-bold text-purple-700">
                                                    {(Number(chargePerCharNonSubscribers) * (1 - (userData?.subscriberDiscountPercentage ?? 20) / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}
                                                </span>
                                                <span className="text-[8.5px] text-purple-500 font-medium">
                                                    100 chars = {((Number(chargePerCharNonSubscribers) || 0) * (1 - (userData?.subscriberDiscountPercentage ?? 20) / 100) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
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
                                                    Receba um e-mail quando iniciarem uma nova conversa com você
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

                        {/* ── SEÇÃO: PRIVACIDADE (Profissionais) ── */}
                        {profileIsProfessional && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Privacidade</p>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3.5 flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                                    <line x1="1" y1="1" x2="23" y2="23"/>
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800">Ocultar do explorar</p>
                                                <p className="text-[10px] text-gray-400 leading-snug">
                                                    Não exibir seu perfil na aba Explorar (sugestões de criadores)
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            id="hide-from-explore-toggle"
                                            type="button"
                                            onClick={() => setHideFromExplore(!hideFromExplore)}
                                            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                                                hideFromExplore ? 'bg-purple-600' : 'bg-gray-200'
                                            }`}
                                            aria-label="Ocultar perfil do explorar"
                                            role="switch"
                                            aria-checked={hideFromExplore}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                                                hideFromExplore ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}



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
                                    {isInstallable && (
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
                                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                                <circle cx="12" cy="12" r="10"/>
                                                <line x1="12" y1="16" x2="12" y2="12"/>
                                                <line x1="12" y1="8" x2="12.01" y2="8"/>
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
                                    <div className="border-t border-gray-100 bg-gray-50/30 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
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
                                <div className="border-t border-gray-100 flex flex-col">
                                    <Link
                                        href="/ajuda"
                                        className="px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-800">Central de Ajuda & Suporte</span>
                                        </div>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    </Link>
                                    <Link
                                        href="/termos-de-uso"
                                        target="_blank"
                                        className="px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                    <polyline points="14 2 14 8 20 8"/>
                                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                                    <polyline points="10 9 9 9 8 9"/>
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-800">Termos de Uso</span>
                                        </div>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    </Link>
                                    <Link
                                        href="/politica-de-privacidade"
                                        target="_blank"
                                        className="px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-gray-800">Política de Privacidade</span>
                                        </div>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* ── SEÇÃO: CONTA ── */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Conta</p>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium text-gray-800">Sair da conta</span>
                                </button>
                                <button
                                    onClick={() => setIsSecurityExpanded(!isSecurityExpanded)}
                                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">Segurança da conta</span>
                                    </div>
                                    <svg
                                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                        className={`text-gray-400 transition-transform duration-200 ${isSecurityExpanded ? 'rotate-180' : ''}`}
                                    >
                                        <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                </button>
                                {isSecurityExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/50 animate-in fade-in slide-in-from-top-1 duration-150">
                                        <button
                                            onClick={() => setAccountAction('suspend')}
                                            className="w-full pl-12 pr-4 py-2.5 flex items-center gap-3 hover:bg-amber-50/60 active:bg-amber-100 transition-colors border-b border-gray-100"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                                                    <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                                                </svg>
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <span className="block text-[13px] font-medium text-gray-700">Suspender conta</span>
                                                <span className="block text-[9.5px] text-gray-400">Desativa o acesso até reativação manual</span>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setAccountAction('delete')}
                                            className="w-full pl-12 pr-4 py-2.5 flex items-center gap-3 hover:bg-red-50/60 active:bg-red-100 transition-colors"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                                                </svg>
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <span className="block text-[13px] font-medium text-red-500">Excluir conta</span>
                                                <span className="block text-[9.5px] text-red-400">Remove seu usuário do banco de dados</span>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── FOOTER FORMAL ── */}
                        <div className="mt-7 mb-2 flex flex-col items-center justify-center gap-2 text-center px-4">
                            <a
                                href="https://www.instagram.com/mimochat.oficial/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-gray-500 hover:text-pink-600 transition-colors"
                            >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-pink-500 transition-colors">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                                </svg>
                                <span className="text-xs font-semibold">@mimochat.oficial</span>
                            </a>
                            <div className="flex flex-col gap-1 text-[10px] text-gray-400">
                                <p>© {new Date().getFullYear()} MimoChat. Todos os direitos reservados.</p>
                                <p>LEAD CONTEUDOS DIGITAIS LTDA | CNPJ: 60.312.273/0001-01</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {accountAction && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
                        <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full ${accountAction === 'delete' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>
                            {accountAction === 'delete' ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                            )}
                        </div>
                        <h2 className="text-center text-base font-bold text-gray-900">
                            {accountAction === 'delete' ? 'Excluir conta?' : 'Suspender conta?'}
                        </h2>
                        <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
                            {accountAction === 'delete'
                                ? 'Seu usuário será removido do banco de dados do Mimo. Esta ação não pode ser desfeita por você.'
                                : 'Sua conta será marcada como suspensa e você será desconectado agora.'}
                        </p>
                        {accountActionError && (
                            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                                {accountActionError}
                            </p>
                        )}
                        <div className="mt-5 flex gap-2">
                            <button
                                onClick={closeAccountActionModal}
                                disabled={accountActionLoading}
                                className="h-10 flex-1 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAccountActionConfirm}
                                disabled={accountActionLoading}
                                className={`h-10 flex-1 rounded-xl text-xs font-bold text-white disabled:opacity-60 ${accountAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                            >
                                {accountActionLoading ? 'Aguarde...' : accountAction === 'delete' ? 'Excluir' : 'Suspender'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
