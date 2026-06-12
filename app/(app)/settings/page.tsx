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
    const [chargePerCharSubscribers, setChargePerCharSubscribers] = useState('');
    const [chargePerCharNonSubscribers, setChargePerCharNonSubscribers] = useState('');

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
            setChargePerCharSubscribers(userData.chargePerCharSubscribers?.toString() ?? '0.002');
            setChargePerCharNonSubscribers(userData.chargePerCharNonSubscribers?.toString() ?? '0.005');
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
                updateData.pixKey = pixKey;
                updateData.chargePerCharNonSubscribers = charPrice;
                updateData.chargePerCharSubscribers = Number(chargePerCharSubscribers) || 0;
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
                        {/* ── INTEGRIDADE DA CONTA (Apenas para Profissionais) ── */}
                        {profileIsProfessional && (
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

                                        const checks = [!!userData?.photoUrl, !!taxId, !!pixKey, !!phone, publicGalleryIsComplete];
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

                                        return [
                                            { label: 'Foto de perfil cadastrada', done: !!userData?.photoUrl, action: () => router.push('/profile') },
                                            { label: 'CPF informado', done: !!taxId, action: () => document.getElementById('settings-cpf-input')?.focus() },
                                            { label: 'Chave Pix cadastrada', done: !!pixKey, action: () => document.getElementById('settings-pix-input')?.focus() },
                                            { label: 'Telefone cadastrado', done: !!phone, action: () => document.getElementById('settings-phone-input')?.focus() },
                                            { label: `Galeria pública completa (${publicItemsCount} fotos, ${publicExclusiveCount} exclusivas)`, done: publicGalleryIsComplete, action: () => router.push('/profile') },
                                        ].map((item, i) => (
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
                                                    <span className={`text-xs ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                                                </div>
                                                {!item.done && (
                                                    <button type="button" onClick={item.action} className="text-[10px] font-semibold text-purple-600 hover:text-purple-700">
                                                        Completar
                                                    </button>
                                                )}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}

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
                                        id="settings-cpf-input"
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
                                        id="settings-phone-input"
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
                                            id="settings-pix-input"
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

                                    {/* Preço por Caractere */}
                                    <div className="px-4 py-3.5 bg-slate-50/20 border-t border-gray-50 flex flex-col gap-3">
                                        <div>
                                            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block">Preço por Caractere (Mensagens)</label>
                                            <p className="text-[9px] text-gray-400 leading-snug mt-0.5">
                                                Defina o preço base por caractere digitado no chat. Assinantes têm {userData?.subscriberDiscountPercentage ?? 20}% de desconto automaticamente.
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-2.5 border border-gray-150 mt-1">
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
                                        href="/ajuda"
                                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 flex items-center justify-center text-xs">
                                                💬
                                            </div>
                                            <span className="text-xs text-gray-700 font-medium">Central de Ajuda & Suporte</span>
                                        </div>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    </Link>
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
                                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100"
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
                                    <a
                                        href="https://www.instagram.com/mimochat.oficial/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-3 flex items-center justify-between hover:bg-pink-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-5 flex items-center justify-center">
                                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
                                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                                                </svg>
                                            </div>
                                            <span className="text-xs text-pink-600 font-semibold">@mimochat.oficial</span>
                                        </div>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    </a>
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
