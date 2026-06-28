import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { SettingsData, RichAdmin } from '@/types/admin';

interface SettingsSnapshot {
    platformFee: number;
    uploadLimit: number;
    comparisonPeriod: 'none' | 'week' | 'month';
    maxPricePerChar: number;
    maxSubscriptionPrice: number;
    minSubscriptionPrice: number;
    subscriberDiscountPercentage: number;
    minPublicPhotos: number;
    maxPublicPhotos: number;
    minExclusivePhotos: number;
    maxExclusivePhotos: number;
    pixEnabled: boolean;
    creditCardEnabled: boolean;
    couponsEnabled: boolean;
    chatSessionTimeoutMinutes: number;
    defaultPricePerCharSubscribers: number;
    defaultPricePerCharNonSubscribers: number;
    pwaShowAgainIntervalDays: number;
    newProfileDaysThreshold: number;
    adminClerkIds: string[];
}

export function useSettings(isLoaded: boolean, isSignedIn: boolean | undefined, userId: string | null | undefined) {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedSnapshot, setSavedSnapshot] = useState<SettingsSnapshot | null>(null);

    // Campos do formulário
    const [platformFee, setPlatformFee] = useState(10);
    const [uploadLimit, setUploadLimit] = useState(50);
    const [comparisonPeriod, setComparisonPeriod] = useState<'none' | 'week' | 'month'>('none');
    const [maxPricePerChar, setMaxPricePerChar] = useState(0.2);
    const [maxSubscriptionPrice, setMaxSubscriptionPrice] = useState(200);
    const [minSubscriptionPrice, setMinSubscriptionPrice] = useState(10);
    const [subscriberDiscountPercentage, setSubscriberDiscountPercentage] = useState(20);
    const [minPublicPhotos, setMinPublicPhotos] = useState(6);
    const [maxPublicPhotos, setMaxPublicPhotos] = useState(12);
    const [minExclusivePhotos, setMinExclusivePhotos] = useState(2);
    const [maxExclusivePhotos, setMaxExclusivePhotos] = useState(4);
    const [pixEnabled, setPixEnabled] = useState(true);
    const [creditCardEnabled, setCreditCardEnabled] = useState(true);
    const [couponsEnabled, setCouponsEnabled] = useState(true);
    const [chatSessionTimeoutMinutes, setChatSessionTimeoutMinutes] = useState(30);
    const [defaultPricePerCharSubscribers, setDefaultPricePerCharSubscribers] = useState(0.002);
    const [defaultPricePerCharNonSubscribers, setDefaultPricePerCharNonSubscribers] = useState(0.005);
    const [pwaShowAgainIntervalDays, setPwaShowAgainIntervalDays] = useState(7);
    const [newProfileDaysThreshold, setNewProfileDaysThreshold] = useState(15);

    // Gerenciamento de administradores
    const [adminListRich, setAdminListRich] = useState<RichAdmin[]>([]);
    const [adminSearch, setAdminSearch] = useState('');
    const [adminSearchResults, setAdminSearchResults] = useState<RichAdmin[]>([]);
    const [showAdminDropdown, setShowAdminDropdown] = useState(false);
    const [searchingAdmin, setSearchingAdmin] = useState(false);

    const buildSnapshot = (s: SettingsData, richAdmins: RichAdmin[]): SettingsSnapshot => ({
        platformFee: s.platformFeePercentage,
        uploadLimit: s.uploadLimitMB,
        comparisonPeriod: s.comparisonPeriod || 'none',
        maxPricePerChar: s.maxPricePerChar ?? 0.2,
        maxSubscriptionPrice: s.maxSubscriptionPrice ?? 200,
        minSubscriptionPrice: s.minSubscriptionPrice ?? 10,
        subscriberDiscountPercentage: s.subscriberDiscountPercentage ?? 20,
        minPublicPhotos: s.minPublicPhotos ?? 6,
        maxPublicPhotos: s.maxPublicPhotos ?? 12,
        minExclusivePhotos: s.minExclusivePhotos ?? 2,
        maxExclusivePhotos: s.maxExclusivePhotos ?? 4,
        pixEnabled: s.pixEnabled ?? true,
        creditCardEnabled: s.creditCardEnabled ?? true,
        couponsEnabled: s.couponsEnabled ?? true,
        chatSessionTimeoutMinutes: s.chatSessionTimeoutMinutes ?? 30,
        defaultPricePerCharSubscribers: s.defaultPricePerCharSubscribers ?? 0.002,
        defaultPricePerCharNonSubscribers: s.defaultPricePerCharNonSubscribers ?? 0.005,
        pwaShowAgainIntervalDays: s.pwaShowAgainIntervalDays ?? 7,
        newProfileDaysThreshold: s.newProfileDaysThreshold ?? 15,
        adminClerkIds: richAdmins.map(a => a.clerkId),
    });

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            setLoadingSettings(false);
            setIsAuthorized(false);
            return;
        }

        async function fetchSettings() {
            try {
                const response = await fetch('/api/admin/settings');
                if (response.ok) {
                    const data = await response.json();
                    const s = data.settings;
                    const richAdmins: RichAdmin[] = data.richAdmins || [];

                    setSettings(s);
                    setPlatformFee(s.platformFeePercentage);
                    setUploadLimit(s.uploadLimitMB);
                    setComparisonPeriod(s.comparisonPeriod || 'none');
                    setAdminListRich(richAdmins);
                    setMaxPricePerChar(s.maxPricePerChar ?? 0.2);
                    setMaxSubscriptionPrice(s.maxSubscriptionPrice ?? 200);
                    setMinSubscriptionPrice(s.minSubscriptionPrice ?? 10);
                    setSubscriberDiscountPercentage(s.subscriberDiscountPercentage ?? 20);
                    setMinPublicPhotos(s.minPublicPhotos ?? 6);
                    setMaxPublicPhotos(s.maxPublicPhotos ?? 12);
                    setMinExclusivePhotos(s.minExclusivePhotos ?? 2);
                    setMaxExclusivePhotos(s.maxExclusivePhotos ?? 4);
                    setPixEnabled(s.pixEnabled ?? true);
                    setCreditCardEnabled(s.creditCardEnabled ?? true);
                    setCouponsEnabled(s.couponsEnabled ?? true);
                    setChatSessionTimeoutMinutes(s.chatSessionTimeoutMinutes ?? 30);
                    setDefaultPricePerCharSubscribers(s.defaultPricePerCharSubscribers ?? 0.002);
                    setDefaultPricePerCharNonSubscribers(s.defaultPricePerCharNonSubscribers ?? 0.005);
                    setPwaShowAgainIntervalDays(s.pwaShowAgainIntervalDays ?? 7);
                    setNewProfileDaysThreshold(s.newProfileDaysThreshold ?? 15);
                    setSavedSnapshot(buildSnapshot(s, richAdmins));
                    setIsAuthorized(true);
                } else if (response.status === 403) {
                    setIsAuthorized(false);
                } else {
                    toast.error('Erro ao carregar as configurações do sistema.');
                }
            } catch {
                toast.error('Não foi possível conectar ao servidor.');
            } finally {
                setLoadingSettings(false);
            }
        }

        fetchSettings();
    }, [isLoaded, isSignedIn]);

    // Debounce de busca de administradores
    useEffect(() => {
        const query = adminSearch.trim();
        if (query.length < 2) {
            setAdminSearchResults([]);
            setShowAdminDropdown(false);
            return;
        }
        const delay = setTimeout(async () => {
            setSearchingAdmin(true);
            try {
                const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setAdminSearchResults(data.users || []);
                    setShowAdminDropdown(true);
                }
            } catch {
                // silently fail
            } finally {
                setSearchingAdmin(false);
            }
        }, 350);
        return () => clearTimeout(delay);
    }, [adminSearch]);

    const saveSettings = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platformFeePercentage: platformFee,
                    uploadLimitMB: uploadLimit,
                    autoModeration: false,
                    professionalsOnlyCreateRooms: false,
                    adminClerkIds: adminListRich.map(a => a.clerkId),
                    comparisonPeriod,
                    maxPricePerChar,
                    maxSubscriptionPrice,
                    minSubscriptionPrice,
                    subscriberDiscountPercentage,
                    minPublicPhotos,
                    maxPublicPhotos,
                    minExclusivePhotos,
                    maxExclusivePhotos,
                    pixEnabled,
                    creditCardEnabled,
                    couponsEnabled,
                    chatSessionTimeoutMinutes,
                    defaultPricePerCharSubscribers,
                    defaultPricePerCharNonSubscribers,
                    pwaShowAgainIntervalDays,
                    newProfileDaysThreshold,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                toast.success('Configurações salvas com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                setSettings(data.settings);
                setAdminListRich(data.richAdmins || []);
                setSavedSnapshot(buildSnapshot(data.settings, data.richAdmins || []));
                // Sync state com valores retornados
                const s = data.settings;
                setMaxPricePerChar(s.maxPricePerChar);
                setMaxSubscriptionPrice(s.maxSubscriptionPrice);
                setMinSubscriptionPrice(s.minSubscriptionPrice ?? 10);
                setSubscriberDiscountPercentage(s.subscriberDiscountPercentage);
                setMinPublicPhotos(s.minPublicPhotos);
                setMaxPublicPhotos(s.maxPublicPhotos);
                setMinExclusivePhotos(s.minExclusivePhotos);
                setMaxExclusivePhotos(s.maxExclusivePhotos);
                setDefaultPricePerCharSubscribers(s.defaultPricePerCharSubscribers ?? 0.002);
                setDefaultPricePerCharNonSubscribers(s.defaultPricePerCharNonSubscribers ?? 0.005);
                setPwaShowAgainIntervalDays(s.pwaShowAgainIntervalDays ?? 7);
                setNewProfileDaysThreshold(s.newProfileDaysThreshold ?? 15);
            } else {
                const errData = await response.json();
                toast.error(errData.error || 'Erro ao salvar configurações.');
            }
        } catch {
            toast.error('Erro de conexão ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAdmin = (selectedUser: RichAdmin) => {
        if (adminListRich.some(a => a.clerkId === selectedUser.clerkId)) {
            toast.error('Este usuário já é administrador.');
            return;
        }
        setAdminListRich(prev => [...prev, selectedUser]);
        setAdminSearch('');
        setShowAdminDropdown(false);
        toast.success(`${selectedUser.name} adicionado. Clique em "Salvar" para confirmar.`);
    };

    const handleRemoveAdmin = (idToRemove: string) => {
        if (idToRemove === userId) {
            toast.error('Você não pode se remover da lista de administradores.');
            return;
        }
        setAdminListRich(prev => prev.filter(a => a.clerkId !== idToRemove));
        toast.success('Admin removido. Clique em "Salvar" para confirmar.');
    };

    // --- Dirty detection por grupo ---
    const isDirtyPlatform = savedSnapshot !== null && (
        platformFee !== savedSnapshot.platformFee ||
        uploadLimit !== savedSnapshot.uploadLimit ||
        comparisonPeriod !== savedSnapshot.comparisonPeriod
    );
    const isDirtyChat = savedSnapshot !== null &&
        chatSessionTimeoutMinutes !== savedSnapshot.chatSessionTimeoutMinutes;
    const isDirtyPricing = savedSnapshot !== null && (
        maxPricePerChar !== savedSnapshot.maxPricePerChar ||
        maxSubscriptionPrice !== savedSnapshot.maxSubscriptionPrice ||
        minSubscriptionPrice !== savedSnapshot.minSubscriptionPrice ||
        subscriberDiscountPercentage !== savedSnapshot.subscriberDiscountPercentage ||
        defaultPricePerCharSubscribers !== savedSnapshot.defaultPricePerCharSubscribers ||
        defaultPricePerCharNonSubscribers !== savedSnapshot.defaultPricePerCharNonSubscribers
    );
    const isDirtyProfiles = savedSnapshot !== null && (
        minPublicPhotos !== savedSnapshot.minPublicPhotos ||
        maxPublicPhotos !== savedSnapshot.maxPublicPhotos ||
        minExclusivePhotos !== savedSnapshot.minExclusivePhotos ||
        maxExclusivePhotos !== savedSnapshot.maxExclusivePhotos ||
        newProfileDaysThreshold !== savedSnapshot.newProfileDaysThreshold
    );
    const isDirtyPayments = savedSnapshot !== null && (
        pixEnabled !== savedSnapshot.pixEnabled ||
        creditCardEnabled !== savedSnapshot.creditCardEnabled ||
        couponsEnabled !== savedSnapshot.couponsEnabled
    );
    const isDirtyApp = savedSnapshot !== null &&
        pwaShowAgainIntervalDays !== savedSnapshot.pwaShowAgainIntervalDays;
    const isDirtyAdmins = savedSnapshot !== null && (
        adminListRich.length !== savedSnapshot.adminClerkIds.length ||
        adminListRich.some(a => !savedSnapshot.adminClerkIds.includes(a.clerkId))
    );

    return {
        settings, loadingSettings, isAuthorized, saving, savedSnapshot,
        isDirtyPlatform, isDirtyChat, isDirtyPricing, isDirtyProfiles,
        isDirtyPayments, isDirtyApp, isDirtyAdmins,
        platformFee, setPlatformFee,
        uploadLimit, setUploadLimit,
        comparisonPeriod, setComparisonPeriod,
        maxPricePerChar, setMaxPricePerChar,
        maxSubscriptionPrice, setMaxSubscriptionPrice,
        minSubscriptionPrice, setMinSubscriptionPrice,
        subscriberDiscountPercentage, setSubscriberDiscountPercentage,
        minPublicPhotos, setMinPublicPhotos,
        maxPublicPhotos, setMaxPublicPhotos,
        minExclusivePhotos, setMinExclusivePhotos,
        maxExclusivePhotos, setMaxExclusivePhotos,
        pixEnabled, setPixEnabled,
        creditCardEnabled, setCreditCardEnabled,
        couponsEnabled, setCouponsEnabled,
        chatSessionTimeoutMinutes, setChatSessionTimeoutMinutes,
        defaultPricePerCharSubscribers, setDefaultPricePerCharSubscribers,
        defaultPricePerCharNonSubscribers, setDefaultPricePerCharNonSubscribers,
        pwaShowAgainIntervalDays, setPwaShowAgainIntervalDays,
        newProfileDaysThreshold, setNewProfileDaysThreshold,
        adminListRich,
        adminSearch, setAdminSearch,
        adminSearchResults,
        showAdminDropdown, setShowAdminDropdown,
        searchingAdmin,
        saveSettings,
        handleSelectAdmin,
        handleRemoveAdmin,
    };
}

export type UseSettingsReturn = ReturnType<typeof useSettings>;
