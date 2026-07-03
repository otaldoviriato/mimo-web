'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile, useUpdateProfile } from '@/hooks/useQueries';
import { usePWA } from '@/context/PWAContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { formatCPF, formatPhone } from '@/components/RechargeModal';
import { PricingGuideModal, PRICE_PER_CHAR_OPTIONS } from '@/components/PricingGuideModal';
import Link from 'next/link';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

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

const formatPriceBRL = (value: string | number) => {
    let valStr = '';
    if (typeof value === 'number') {
        valStr = value.toFixed(2).replace(/\D/g, '');
    } else {
        valStr = value.replace(/\D/g, '');
    }
    if (!valStr || valStr === '00') return 'R$ 0,00';
    valStr = valStr.replace(/^0+/, '');
    if (valStr.length < 3) {
        valStr = valStr.padStart(3, '0');
    }
    const cents = valStr.slice(-2);
    const whole = valStr.slice(0, -2);
    const formattedWhole = parseInt(whole, 10).toLocaleString('pt-BR');
    return `R$ ${formattedWhole},${cents}`;
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
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const usernameCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [name, setName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [phone, setPhone] = useState('');
    const [subscriptionPrice, setSubscriptionPrice] = useState('');
    const [isSubscriptionEnabled, setIsSubscriptionEnabled] = useState(false);
    const [bio, setBio] = useState('');
    const [chargePerCharSubscribers, setChargePerCharSubscribers] = useState('');
    const [chargePerCharNonSubscribers, setChargePerCharNonSubscribers] = useState('');
    const [hideFromExplore, setHideFromExplore] = useState(false);
    const [subscriberDiscountPercentage, setSubscriberDiscountPercentage] = useState('20');
    
    const [loading, setLoading] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [saveSubscriptionError, setSaveSubscriptionError] = useState('');
    const [saveSubscriptionSuccess, setSaveSubscriptionSuccess] = useState(false);
    const [loadingPricing, setLoadingPricing] = useState(false);
    const [savePricingError, setSavePricingError] = useState('');
    const [savePricingSuccess, setSavePricingSuccess] = useState(false);
    const [isAboutExpanded, setIsAboutExpanded] = useState(false);
    const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
    const [savingEmailPref, setSavingEmailPref] = useState(false);
    const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
    const [accountAction, setAccountAction] = useState<'suspend' | 'delete' | null>(null);
    const [accountActionLoading, setAccountActionLoading] = useState(false);
    const [accountActionError, setAccountActionError] = useState('');
    const [showPricingGuideModal, setShowPricingGuideModal] = useState(false);

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
            setSubscriptionPrice(userData.subscriptionPrice ? formatPriceBRL(userData.subscriptionPrice) : 'R$ 0,00');
            setIsSubscriptionEnabled(userData.isSubscriptionEnabled ?? false);
            setBio(userData.bio || '');
            setEmailNotificationsEnabled(userData.emailNotificationsEnabled ?? false);
            setChargePerCharSubscribers(userData.chargePerCharSubscribers?.toString() ?? '0.002');
            setChargePerCharNonSubscribers(userData.chargePerCharNonSubscribers?.toString() ?? '0.005');
            setSubscriberDiscountPercentage((userData.subscriberDiscountPercentage ?? 20).toString());
            setHideFromExplore(userData.hideFromExplore === true);
                        hasPopulated.current = true;
        }
    }, [userData]);

    useEffect(() => {
        const discount = Number(subscriberDiscountPercentage) || 20;
        const nonSubPrice = Number(chargePerCharNonSubscribers) || 0;
        const subPrice = parseFloat((nonSubPrice * (1 - discount / 100)).toFixed(4));
        setChargePerCharSubscribers(subPrice.toString());
    }, [subscriberDiscountPercentage, chargePerCharNonSubscribers]);

    const handleSaveAll = async () => {
        if (usernameStatus === 'checking') {
            setSaveError('Aguarde a verificação do nome de usuário.');
            return;
        }
        if (usernameStatus === 'taken') {
            setSaveError('Este nome de usuário já está em uso. Escolha outro.');
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
                phone: phone.replace(/\D/g, '')
            };

            if (userData?.isProfessional) {
                const limitMax = userData?.maxSubscriptionPrice ?? 200;
                const limitMin = userData?.minSubscriptionPrice ?? 10;
                const price = Number(subscriptionPrice.replace(/\D/g, '')) / 100;
                const discount = Number(subscriberDiscountPercentage) || 20;

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
                    if (discount < 20 || discount > 80) {
                        setSaveError('O desconto da assinatura deve ser entre 20% e 80%');
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
                updateData.subscriberDiscountPercentage = discount;
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

    const handleSaveSubscription = async () => {
        setLoadingSubscription(true);
        setSaveSubscriptionError('');
        setSaveSubscriptionSuccess(false);

        try {
            const limitMax = userData?.maxSubscriptionPrice ?? 200;
            const limitMin = userData?.minSubscriptionPrice ?? 10;
            const price = Number(subscriptionPrice.replace(/\D/g, '')) / 100;
            const discount = Number(subscriberDiscountPercentage) || 20;

            if (isSubscriptionEnabled) {
                if (price <= 0) {
                    setSaveSubscriptionError('O preço da assinatura deve ser maior que zero');
                    setLoadingSubscription(false);
                    return;
                }
                if (price < limitMin) {
                    setSaveSubscriptionError(`O preço da assinatura não pode ser menor que o valor mínimo de R$ ${limitMin.toFixed(2)}`);
                    setLoadingSubscription(false);
                    return;
                }
                if (discount < 20 || discount > 80) {
                    setSaveSubscriptionError('O desconto da assinatura deve ser entre 20% e 80%');
                    setLoadingSubscription(false);
                    return;
                }
            }

            if (price > limitMax) {
                setSaveSubscriptionError(`O preço da assinatura não pode ser maior que R$ ${limitMax.toFixed(2)}`);
                setLoadingSubscription(false);
                return;
            }

            const updateData: any = {
                isSubscriptionEnabled,
                subscriptionPrice: price,
                subscriberDiscountPercentage: discount,
                chargePerCharSubscribers: Number(chargePerCharSubscribers) || 0
            };

            await updateProfileMutation.mutateAsync(updateData);
            setSaveSubscriptionSuccess(true);
            setTimeout(() => setSaveSubscriptionSuccess(false), 3000);
        } catch (error: any) {
            setSaveSubscriptionError('Erro ao salvar alterações de assinatura');
        } finally {
            setLoadingSubscription(false);
        }
    };

    const handleSavePricing = async () => {
        setLoadingPricing(true);
        setSavePricingError('');
        setSavePricingSuccess(false);

        try {
            const limitMaxPrice = userData?.maxPricePerChar ?? 0.2;
            const charPrice = Number(chargePerCharNonSubscribers) || 0;

            if (charPrice < 0) {
                setSavePricingError('O preço por caractere não pode ser negativo');
                setLoadingPricing(false);
                return;
            }
            if (charPrice > limitMaxPrice) {
                setSavePricingError(`O preço máximo por caractere é R$ ${limitMaxPrice.toFixed(2)}`);
                setLoadingPricing(false);
                return;
            }

            const updateData: any = {
                chargePerCharNonSubscribers: charPrice,
                chargePerCharSubscribers: Number(chargePerCharSubscribers) || 0
            };

            await updateProfileMutation.mutateAsync(updateData);
            setSavePricingSuccess(true);
            setTimeout(() => setSavePricingSuccess(false), 3000);
        } catch (error: any) {
            setSavePricingError('Erro ao salvar preço por caractere');
        } finally {
            setLoadingPricing(false);
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


    const handleSelectPricePerChar = (option: number) => {
        const discountFactor = 1 - (Number(subscriberDiscountPercentage) || 20) / 100;
        setChargePerCharNonSubscribers(option.toString());
        setChargePerCharSubscribers(parseFloat((option * discountFactor).toFixed(4)).toString());
    };

    const initialUsername = userData?.username || '';

    const checkUsernameAvailability = useCallback(async (val: string) => {
        if (!val || val === initialUsername || val.length < 2 || !/^[a-z0-9._-]+$/.test(val)) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus('checking');
        try {
            const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(val)}`);
            if (!res.ok) {
                setUsernameStatus('idle');
                return;
            }
            const data = await res.json();
            setUsernameStatus(data.available ? 'available' : 'taken');
        } catch {
            setUsernameStatus('idle');
        }
    }, [initialUsername]);

    const handleUsernameChange = (value: string) => {
        const clean = value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
        setUsername(clean);
        setUsernameStatus('idle');
        if (usernameCheckTimerRef.current) clearTimeout(usernameCheckTimerRef.current);
        usernameCheckTimerRef.current = setTimeout(() => checkUsernameAvailability(clean), 450);
    };

    const profileIsProfessional = !!userData?.isProfessional;

    const initialName = userData?.name || '';
    const initialPhone = userData?.phone ? formatPhone(userData?.phone) : '';
    const initialBio = userData?.bio || '';

    const hasPersonalChanges =
        name !== initialName ||
        username !== initialUsername ||
        phone !== initialPhone ||
        (profileIsProfessional && (bio !== initialBio || hideFromExplore !== (userData?.hideFromExplore === true)));

    const initialSubscriptionPrice = userData?.subscriptionPrice ?? 0;
    const initialIsSubscriptionEnabled = userData?.isSubscriptionEnabled ?? false;
    const initialChargePerCharNonSubscribers = userData?.chargePerCharNonSubscribers?.toString() ?? '0.005';
    const initialDiscount = userData?.subscriberDiscountPercentage ?? 20;

    const currentSubscriptionPriceClean = Number(subscriptionPrice.replace(/\D/g, '')) / 100;
    const currentDiscount = Number(subscriberDiscountPercentage) || 20;

    const hasSubscriptionChanges =
        profileIsProfessional && (
            currentSubscriptionPriceClean !== initialSubscriptionPrice ||
            isSubscriptionEnabled !== initialIsSubscriptionEnabled ||
            currentDiscount !== initialDiscount
        );

    
    const hasPricingChanges =
        profileIsProfessional && (
            chargePerCharNonSubscribers !== initialChargePerCharNonSubscribers
        );

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
                                            onChange={(e) => handleUsernameChange(e.target.value)}
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                        />
                                        {usernameStatus === 'checking' && (
                                            <svg className="animate-spin h-3.5 w-3.5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                        )}
                                        {usernameStatus === 'available' && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                                        )}
                                        {usernameStatus === 'taken' && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500 shrink-0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        )}
                                    </div>
                                    {usernameStatus === 'taken' && (
                                        <p className="text-[10px] font-semibold text-red-500 mt-1">Este nome de usuário já está em uso</p>
                                    )}
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
                                {(hasPersonalChanges || loading || saveSuccess || saveError) && (
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
                                        {(hasPersonalChanges || loading) && (
                                            <button
                                                onClick={handleSaveAll}
                                                disabled={loading || !hasPersonalChanges || usernameStatus === 'checking' || usernameStatus === 'taken'}
                                                className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                                ) : (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                                )}
                                                Salvar Alterações
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── SEÇÃO: VERIFICAÇÃO DE IDENTIDADE ── */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Verificação de Identidade (Selo de Verificado)</p>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 space-y-3.5">
                                {userData?.identityStatus === 'approved' ? (
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                Identidade Verificada
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                Parabéns! Seu perfil foi verificado com sucesso e você possui o selo de autenticidade ao lado do seu nome.
                                            </p>
                                        </div>
                                    </div>
                                ) : userData?.identityStatus === 'pending' ? (
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">Sob Análise</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                Seus documentos foram enviados e estão sendo analisados pela nossa equipe. Esse processo costuma levar até 48 horas.
                                            </p>
                                        </div>
                                    </div>
                                ) : userData?.identityStatus === 'rejected' ? (
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-red-600">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-gray-900">Verificação Rejeitada</h4>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                    Infelizmente não foi possível validar seus documentos.
                                                </p>
                                                {userData?.notes && (
                                                    <div className="mt-2 bg-red-50/55 border border-red-100 rounded-xl p-3">
                                                        <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Motivo:</p>
                                                        <p className="text-xs text-red-700 mt-0.5 leading-relaxed italic">"{userData.notes}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push('/verificacao-identidade')}
                                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-purple-600/10"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Reenviar Documentos
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">Verifique seu Perfil</h4>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                    Envie seus documentos de identificação para obter o selo de verificado ao lado do seu nome, mostrando a todos que seu perfil é autêntico.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push('/verificacao-identidade')}
                                            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-extrabold rounded-xl text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/10"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Verificar Identidade
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── SEÇÃO: PREÇOS E GANHOS (Profissionais) ── */}
                        {/* ── CARD 1: OFERECER ASSINATURA ── */}
                        {profileIsProfessional && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Oferecer Assinatura</p>
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

                                    {/* Preço da Assinatura e Desconto (Exibe apenas se habilitado) */}
                                    {isSubscriptionEnabled && (
                                        <>
                                            <div className="px-4 py-3.5 bg-slate-50/30 transition-all">
                                                <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Preço da Assinatura Mensal</label>
                                                <input
                                                    className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                                    placeholder="R$ 0,00"
                                                    value={subscriptionPrice}
                                                    onChange={(e) => setSubscriptionPrice(formatPriceBRL(e.target.value))}
                                                    type="text"
                                                    inputMode="numeric"
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

                                            <div className="px-4 py-3.5 bg-slate-50/30 transition-all">
                                                <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Desconto para Assinantes (%)</label>
                                                <input
                                                    className="w-full text-sm text-gray-900 font-medium placeholder-gray-300 bg-transparent focus:outline-none"
                                                    placeholder="20"
                                                    value={subscriberDiscountPercentage}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        setSubscriberDiscountPercentage(val);
                                                    }}
                                                    type="text"
                                                    inputMode="numeric"
                                                />
                                                <p className="text-[9px] text-gray-400 mt-1">
                                                    Defina a porcentagem de desconto (de 20% a 80%) para assinantes sobre o preço do caractere.
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    {/* Botão Salvar Assinatura */}
                                    {(hasSubscriptionChanges || loadingSubscription || saveSubscriptionSuccess || saveSubscriptionError) && (
                                        <div className="px-4 pb-5 pt-3.5 flex flex-col gap-2 bg-white">
                                            {saveSubscriptionError && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                                    <p className="text-xs text-red-600 font-medium">{saveSubscriptionError}</p>
                                                </div>
                                            )}
                                            {saveSubscriptionSuccess && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                                                    <p className="text-xs text-green-700 font-medium">Assinatura atualizada com sucesso</p>
                                                </div>
                                            )}
                                            {(hasSubscriptionChanges || loadingSubscription) && (
                                                <button
                                                    onClick={handleSaveSubscription}
                                                    disabled={loadingSubscription || !hasSubscriptionChanges}
                                                    className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                    {loadingSubscription ? (
                                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                                    ) : (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                                    )}
                                                    Salvar Assinatura
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── CARD 2: PRECIFICAÇÃO POR CARACTERE ── */}
                        {profileIsProfessional && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Precificação por Caractere</p>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                                    
                                    {/* Preço por Caractere */}
                                    <div className="px-4 py-3.5 bg-slate-50/20 border-t border-gray-50 flex flex-col gap-3">
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block">Preço por Caractere (Mensagens)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPricingGuideModal(true)}
                                                    className="shrink-0 text-[10px] font-bold text-purple-600 hover:text-purple-700 transition-colors underline underline-offset-2 decoration-purple-200"
                                                >
                                                    Como saber quanto cobrar?
                                                </button>
                                            </div>
                                            <p className="text-[9px] text-gray-400 leading-snug mt-0.5">
                                                Escolha o preço base por caractere digitado no chat.
                                                {isSubscriptionEnabled ? ` Assinantes têm ${Number(subscriberDiscountPercentage) || 20}% de desconto automaticamente.` : ' Habilite a assinatura para oferecer desconto aos assinantes.'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2 mt-1">
                                            {PRICE_PER_CHAR_OPTIONS.map((option) => {
                                                const limitMaxPrice = userData?.maxPricePerChar ?? 0.2;
                                                const disabled = option > limitMaxPrice;
                                                const active = Number(chargePerCharNonSubscribers) === option;
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => handleSelectPricePerChar(option)}
                                                        className={`h-10 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                                            active
                                                                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-200'
                                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        R$ {option.toFixed(2).replace('.', ',')}
                                                    </button>
                                                );
                                            })}
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
                                            
                                            <div className={`flex flex-col gap-0.5 border-l border-purple-100/50 pl-2.5 ${!isSubscriptionEnabled ? 'opacity-40' : ''}`}>
                                                <span className="font-semibold text-purple-600 uppercase tracking-wider text-[8px] flex items-center gap-0.5">
                                                    Assinantes
                                                    <span className="bg-purple-100 text-purple-700 text-[7px] font-extrabold px-1 rounded">-{Number(subscriberDiscountPercentage) || 20}%</span>
                                                </span>
                                                <span className="font-bold text-purple-700">
                                                    {(Number(chargePerCharNonSubscribers) * (1 - (Number(subscriberDiscountPercentage) || 20) / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}
                                                </span>
                                                <span className="text-[8.5px] text-purple-500 font-medium">
                                                    100 chars = {((Number(chargePerCharNonSubscribers) || 0) * (1 - (Number(subscriberDiscountPercentage) || 20) / 100) * 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                                                </span>
                                                {!isSubscriptionEnabled && (
                                                    <span className="text-[7.5px] text-gray-400 font-medium mt-0.5 italic block">
                                                        Inativo (Sem assinatura ativa)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Preço do Áudio (derivado do preço por caractere) */}
                                        <div className="bg-purple-50/40 rounded-xl p-2.5 border border-purple-50 text-[10px]">
                                            <span className="font-semibold text-gray-400 uppercase tracking-wider text-[8px] block mb-1">
                                                Preço do Áudio (por segundo)
                                            </span>
                                            <p className="text-[9px] text-gray-400 leading-snug mb-1.5">
                                                Calculado automaticamente como o preço por caractere × {userData?.audioPriceMultiplier ?? 5}.
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-semibold text-gray-400 uppercase tracking-wider text-[8px]">Não Assinantes</span>
                                                    <span className="font-bold text-gray-800">
                                                        {((Number(chargePerCharNonSubscribers) || 0) * (userData?.audioPriceMultiplier ?? 5)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })} / seg
                                                    </span>
                                                </div>
                                                <div className={`flex flex-col gap-0.5 border-l border-purple-100/50 pl-2.5 ${!isSubscriptionEnabled ? 'opacity-40' : ''}`}>
                                                    <span className="font-semibold text-purple-600 uppercase tracking-wider text-[8px]">Assinantes</span>
                                                    <span className="font-bold text-purple-700">
                                                        {((Number(chargePerCharNonSubscribers) || 0) * (1 - (Number(subscriberDiscountPercentage) || 20) / 100) * (userData?.audioPriceMultiplier ?? 5)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })} / seg
                                                    </span>
                                                    {!isSubscriptionEnabled && (
                                                        <span className="text-[7.5px] text-gray-400 font-medium mt-0.5 italic block">
                                                            Inativo
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        
                                    </div>

                                    {/* Botão Salvar Preço por Caractere */}
                                    {(hasPricingChanges || loadingPricing || savePricingSuccess || savePricingError) && (
                                        <div className="px-4 pb-5 pt-3.5 flex flex-col gap-2 bg-white">
                                            {savePricingError && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                                    <p className="text-xs text-red-600 font-medium">{savePricingError}</p>
                                                </div>
                                            )}
                                            {savePricingSuccess && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                                                    <p className="text-xs text-green-700 font-medium">Preço por caractere atualizado com sucesso</p>
                                                </div>
                                            )}
                                            {(hasPricingChanges || loadingPricing) && (
                                                <button
                                                    onClick={handleSavePricing}
                                                    disabled={loadingPricing || !hasPricingChanges}
                                                    className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                    {loadingPricing ? (
                                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                                    ) : (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                                    )}
                                                    Salvar Preço por Caractere
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── SEÇÃO: NOTIFICAÇÕES POR E-MAIL ── */}
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
                                            <p className="text-sm font-medium text-gray-800">Alertas de novas mensagens</p>
                                            <p className="text-[10px] text-gray-400 leading-snug">
                                                Receba um e-mail quando iniciarem uma nova conversa ou te responderem offline
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

                        {/* ── SEÇÃO: PRIVACIDADE (Profissionais) ── */}
                        {profileIsProfessional && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">Privacidade</p>
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col divide-y divide-gray-50">
                                    
                                    {/* Toggle Exibir no Explorar */}
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
                                                    Ocultar seu perfil das sugestões do explorar (seu perfil continuará acessível por busca direta)
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            id="show-in-explore-toggle"
                                            type="button"
                                            onClick={() => {
                                                setHideFromExplore(!hideFromExplore);
                                            }}
                                            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                                                hideFromExplore ? 'bg-purple-600' : 'bg-gray-200'
                                            }`}
                                            aria-label="Ocultar perfil no explorar"
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
            <PricingGuideModal
                visible={showPricingGuideModal}
                onClose={() => setShowPricingGuideModal(false)}
                selectedRate={Number(chargePerCharNonSubscribers) || PRICE_PER_CHAR_OPTIONS[0]}
                maxPricePerChar={userData?.maxPricePerChar ?? 0.2}
                onApply={handleSelectPricePerChar}
            />
        </div>
    );
}
