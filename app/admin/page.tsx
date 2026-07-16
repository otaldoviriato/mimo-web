'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/admin/Sidebar';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { StatsCard } from '@/components/admin/StatsCard';
import { ActivityChart } from '@/components/admin/ActivityChart';
import { ClientsTable } from '@/components/admin/ClientsTable';
import { ProfessionalsTable } from '@/components/admin/ProfessionalsTable';
import { IdentityVerifications } from '@/components/admin/IdentityVerifications';
import { RoomsTab } from '@/components/admin/RoomsTab';
import { FinancialTab } from '@/components/admin/FinancialTab';
import { HelpTicketsTab } from '@/components/admin/HelpTicketsTab';
import { InstitutionalEmailsTab } from '@/components/admin/InstitutionalEmailsTab';
import { SettingsPlatformPage } from '@/components/admin/settings/SettingsPlatformPage';
import { SettingsChatPage } from '@/components/admin/settings/SettingsChatPage';
import { SettingsPricingPage } from '@/components/admin/settings/SettingsPricingPage';
import { SettingsProfilesPage } from '@/components/admin/settings/SettingsProfilesPage';
import { SettingsPaymentsPage } from '@/components/admin/settings/SettingsPaymentsPage';
import { SettingsAppPage } from '@/components/admin/settings/SettingsAppPage';
import { SettingsAdminsPage } from '@/components/admin/settings/SettingsAdminsPage';
import { useSettings } from '@/hooks/admin/useSettings';
import {
    Users, MessageSquare, MessageCircle, Coins, TrendingUp,
    Lock, ArrowLeft, CheckCircle2, Clock, AlertCircle, Sliders, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const TAB_TITLES: Record<string, string> = {
    dashboard: 'Painel Geral',
    clients: 'Gerenciamento de Usuários',
    professionals: 'Gerenciamento de Perfis Monetizados',
    rooms: 'Auditoria de Conversas',
    financial: 'Movimentações Financeiras',
    'help-tickets': 'Tickets de Ajuda',
    'institutional-emails': 'E-mails Institucionais',
    'identity-verifications': 'Verificações de Selos de Autenticidade',
    'settings-platform': 'Configurações — Plataforma & Operação',
    'settings-chat': 'Configurações — Chat & Sessões',
    'settings-pricing': 'Configurações — Precificação & Assinaturas',
    'settings-profiles': 'Configurações — Perfis & Galeria',
    'settings-payments': 'Configurações — Meios de Pagamento',
    'settings-app': 'Configurações — App & Experiência',
    'settings-admins': 'Configurações — Administradores',
};

const VALID_TABS = Object.keys(TAB_TITLES);

export default function AdminPage() {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<'none' | 'week' | 'month'>('none');
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);

    const settings = useSettings(isLoaded, isSignedIn, userId);
    const { isAuthorized, loadingSettings, comparisonPeriod } = settings;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab && VALID_TABS.includes(tab)) setActiveTab(tab);
        }
    }, []);

    const fetchDashboard = async (period: string) => {
        setLoadingDashboard(true);
        try {
            const res = await fetch(`/api/admin/dashboard?period=${period}`);
            if (res.ok) setDashboardData(await res.json());
            else toast.error('Erro ao carregar métricas do dashboard.');
        } catch {
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingDashboard(false);
        }
    };

    const handleDeleteTransaction = async (id: string, displayId: string) => {
        if (!window.confirm(`ATENÇÃO: Deseja realmente excluir permanentemente a transação "${displayId}"?\nEsta ação removerá de forma definitiva o registro contábil e não pode ser desfeita.`)) return;
        try {
            const res = await fetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Transação excluída com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                fetchDashboard(selectedPeriod);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao excluir transação.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    };

    useEffect(() => {
        if (!isAuthorized) return;
        if (activeTab === 'dashboard' || activeTab === 'financial') {
            fetchDashboard(selectedPeriod);
        }
    }, [activeTab, selectedPeriod, isAuthorized]);

    useEffect(() => {
        if (isAuthorized && comparisonPeriod) {
            setSelectedPeriod(comparisonPeriod);
        }
    }, [isAuthorized, comparisonPeriod]);

    if (!isLoaded || loadingSettings) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-linear-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6]">
                <div className="flex flex-col items-center animate-pulse">
                    <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20 shadow-2xl mb-4">
                        <Sliders size={40} className="text-white animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <h2 className="text-white text-xl font-bold tracking-wide">MimoAdmin</h2>
                    <p className="text-purple-200 text-xs mt-1 font-medium">Validando credenciais do painel...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6">
                <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6 animate-fade-in-up">
                    <div className="w-20 h-20 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shadow-xl shadow-rose-950/10">
                        <Lock size={38} className="stroke-[1.8]" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-white text-2xl font-black tracking-tight">Acesso Restrito</h2>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Esta é uma área restrita exclusiva para administradores do MimoChat. Sua conta atual não possui permissões administrativas.
                        </p>
                    </div>
                    {userId && (
                        <div className="bg-slate-900/60 border border-slate-800/80 px-4 py-3 rounded-xl w-full text-left space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Seu Clerk ID</span>
                            <code className="text-xs text-purple-400 font-mono font-bold break-all block">{userId}</code>
                        </div>
                    )}
                    <div className="w-full pt-2 flex flex-col gap-3">
                        <button onClick={() => router.replace('/')} className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-600/10 cursor-pointer">
                            <ArrowLeft size={16} />
                            Voltar ao MimoChat
                        </button>
                        {!isSignedIn && (
                            <button onClick={() => router.push('/login')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition-all border border-slate-700 cursor-pointer">
                                Entrar com outra conta
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const isSettingsTab = activeTab.startsWith('settings-');

    return (
        <div className="flex bg-slate-50 min-h-screen font-sans selection:bg-purple-100 selection:text-purple-900 relative">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                <DashboardHeader title={TAB_TITLES[activeTab] ?? 'MimoAdmin'} onMenuToggle={() => setIsSidebarOpen(true)}>
                    {(activeTab === 'dashboard' || activeTab === 'financial') && (
                        <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-1.5 rounded-xl transition-all h-fit shrink-0 ml-2 md:ml-4 select-none">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Período:</span>
                            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value as any)} className="text-xs font-bold bg-transparent focus:outline-none text-slate-700 cursor-pointer pr-1">
                                <option value="none">Sem Comparação</option>
                                <option value="week">Última Semana</option>
                                <option value="month">Último Mês</option>
                            </select>
                        </div>
                    )}
                </DashboardHeader>

                <main className={`flex-1 overflow-y-auto max-w-7xl w-full mx-auto ${isSettingsTab ? 'p-4 md:p-8' : 'p-4 md:p-8 space-y-4 md:space-y-8'}`}>

                    {/* Dashboard */}
                    {activeTab === 'dashboard' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatsCard title="Total de Usuários" value={loadingDashboard ? '...' : dashboardData?.metrics?.users?.value || '0'} change={loadingDashboard ? undefined : dashboardData?.metrics?.users?.change || undefined} isPositive={loadingDashboard ? true : dashboardData?.metrics?.users?.isPositive} icon={Users} color="purple" />
                                <StatsCard title="Conversas Ativas" value={loadingDashboard ? '...' : dashboardData?.metrics?.activeChats?.value || '0'} change={loadingDashboard ? undefined : dashboardData?.metrics?.activeChats?.change || undefined} isPositive={loadingDashboard ? true : dashboardData?.metrics?.activeChats?.isPositive} icon={MessageSquare} color="blue" />
                                <StatsCard title="Mensagens Enviadas" value={loadingDashboard ? '...' : dashboardData?.metrics?.messages?.value || '0'} change={loadingDashboard ? undefined : dashboardData?.metrics?.messages?.change || undefined} isPositive={loadingDashboard ? true : dashboardData?.metrics?.messages?.isPositive} icon={MessageCircle} color="green" />
                                <StatsCard title="Total Recarregado" value={loadingDashboard ? '...' : dashboardData?.metrics?.revenue?.value || 'R$ 0,00'} change={loadingDashboard ? undefined : dashboardData?.metrics?.revenue?.change || undefined} isPositive={loadingDashboard ? true : dashboardData?.metrics?.revenue?.isPositive} icon={Coins} color="amber" />
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    {loadingDashboard ? (
                                        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm h-full flex flex-col items-center justify-center min-h-55">
                                            <div className="animate-spin h-8 w-8 text-purple-600 rounded-full border-4 border-slate-200 border-t-purple-600" />
                                            <span className="text-sm font-semibold text-slate-500 mt-2">Buscando dados de atividade...</span>
                                        </div>
                                    ) : <ActivityChart data={dashboardData?.activityData} />}
                                </div>
                                <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                            <TrendingUp size={20} className="text-purple-600" />
                                            Últimas Transações
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">Logs de recarga e saques via AbacatePay.</p>
                                    </div>
                                    <div className="space-y-4 flex-1">
                                        {loadingDashboard ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-2">
                                                <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                                <span className="text-[10px] text-slate-400 font-semibold">Carregando logs...</span>
                                            </div>
                                        ) : dashboardData?.recentTransactions?.length > 0 ? (
                                            dashboardData.recentTransactions.map((tx: any) => (
                                                <div key={tx.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${tx.status === 'Aprovado' || tx.status === 'Débito' ? 'bg-emerald-50 text-emerald-600' : tx.status === 'Pendente' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                                            {(tx.status === 'Aprovado' || tx.status === 'Débito') && <CheckCircle2 size={16} />}
                                                            {tx.status === 'Pendente' && <Clock size={16} />}
                                                            {tx.status === 'Cancelado' && <AlertCircle size={16} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            {tx.userId && tx.userId !== 'platform' ? (
                                                                <Link href={`/admin/users/${tx.userId}`} className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline transition-colors text-left">
                                                                    {tx.user}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-800">{tx.user}</span>
                                                            )}
                                                            <span className="text-[10px] text-slate-400 font-semibold">{tx.type} • {tx.time}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-2">
                                                        <div className="flex flex-col text-right">
                                                            <span className="text-xs font-bold text-slate-700 block">{tx.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                            {tx.fee > 0 && (
                                                                <span className="text-[9px] text-emerald-600 font-bold block">
                                                                    = {tx.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </span>
                                                            )}
                                                            <span className="text-[9px] text-slate-400 font-semibold uppercase">{tx.displayId || tx.id}</span>
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id, tx.displayId || tx.id); }} className="p-1 hover:text-rose-600 rounded-lg text-slate-350 hover:bg-rose-50 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir Transação">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-20 text-center text-xs font-semibold text-slate-400">Nenhuma transação recente cadastrada.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="w-full"><ClientsTable /></div>
                        </>
                    )}

                    {activeTab === 'clients' && <div className="w-full"><ClientsTable /></div>}
                    {activeTab === 'professionals' && <div className="w-full"><ProfessionalsTable /></div>}
                    {activeTab === 'rooms' && <RoomsTab />}
                    {activeTab === 'financial' && <FinancialTab dashboardData={dashboardData} loadingDashboard={loadingDashboard} handleDeleteTransaction={handleDeleteTransaction} />}
                    {activeTab === 'help-tickets' && <HelpTicketsTab />}
                    {activeTab === 'institutional-emails' && <InstitutionalEmailsTab />}
                    {activeTab === 'identity-verifications' && <IdentityVerifications />}
                    {/* Settings sub-pages */}
                    {activeTab === 'settings-platform' && (
                        <SettingsPlatformPage
                            platformFee={settings.platformFee} setPlatformFee={settings.setPlatformFee}
                            uploadLimit={settings.uploadLimit} setUploadLimit={settings.setUploadLimit}
                            comparisonPeriod={settings.comparisonPeriod} setComparisonPeriod={settings.setComparisonPeriod}
                            isDirtyPlatform={settings.isDirtyPlatform}
                            saving={settings.saving} saveSettings={settings.saveSettings}
                        />
                    )}
                    {activeTab === 'settings-chat' && (
                        <SettingsChatPage
                            chatSessionTimeoutMinutes={settings.chatSessionTimeoutMinutes} setChatSessionTimeoutMinutes={settings.setChatSessionTimeoutMinutes}
                            onlineDelayMinutes={settings.onlineDelayMinutes} setOnlineDelayMinutes={settings.setOnlineDelayMinutes}
                            chatInactivityHours={settings.chatInactivityHours} setChatInactivityHours={settings.setChatInactivityHours}
                            isDirtyChat={settings.isDirtyChat}
                            saving={settings.saving} saveSettings={settings.saveSettings}
                        />
                    )}
                    {activeTab === 'settings-pricing' && (
                        <SettingsPricingPage
                            maxPricePerChar={settings.maxPricePerChar} setMaxPricePerChar={settings.setMaxPricePerChar}
                            defaultPricePerCharNonSubscribers={settings.defaultPricePerCharNonSubscribers} setDefaultPricePerCharNonSubscribers={settings.setDefaultPricePerCharNonSubscribers}
                            defaultPricePerCharSubscribers={settings.defaultPricePerCharSubscribers} setDefaultPricePerCharSubscribers={settings.setDefaultPricePerCharSubscribers}
                            minSubscriptionPrice={settings.minSubscriptionPrice} setMinSubscriptionPrice={settings.setMinSubscriptionPrice}
                            maxSubscriptionPrice={settings.maxSubscriptionPrice} setMaxSubscriptionPrice={settings.setMaxSubscriptionPrice}
                            subscriberDiscountPercentage={settings.subscriberDiscountPercentage} setSubscriberDiscountPercentage={settings.setSubscriberDiscountPercentage}
                            audioPriceMultiplier={settings.audioPriceMultiplier} setAudioPriceMultiplier={settings.setAudioPriceMultiplier}
                            isDirtyPricing={settings.isDirtyPricing}
                            saving={settings.saving} saveSettings={settings.saveSettings}
                        />
                    )}
                    {activeTab === 'settings-profiles' && (
                        <SettingsProfilesPage
                            minPublicPhotos={settings.minPublicPhotos} setMinPublicPhotos={settings.setMinPublicPhotos}
                            maxPublicPhotos={settings.maxPublicPhotos} setMaxPublicPhotos={settings.setMaxPublicPhotos}
                            minExclusivePhotos={settings.minExclusivePhotos} setMinExclusivePhotos={settings.setMinExclusivePhotos}
                            maxExclusivePhotos={settings.maxExclusivePhotos} setMaxExclusivePhotos={settings.setMaxExclusivePhotos}
                            newProfileDaysThreshold={settings.newProfileDaysThreshold} setNewProfileDaysThreshold={settings.setNewProfileDaysThreshold}
                            isDirtyProfiles={settings.isDirtyProfiles}
                            saving={settings.saving} saveSettings={settings.saveSettings}
                        />
                    )}
                    {activeTab === 'settings-payments' && (
                        <SettingsPaymentsPage
                            pixEnabled={settings.pixEnabled} setPixEnabled={settings.setPixEnabled}
                            creditCardEnabled={settings.creditCardEnabled} setCreditCardEnabled={settings.setCreditCardEnabled}
                            couponsEnabled={settings.couponsEnabled} setCouponsEnabled={settings.setCouponsEnabled}
                            isDirtyPayments={settings.isDirtyPayments}
                            saving={settings.saving} saveSettings={settings.saveSettings}
                        />
                    )}
                    {activeTab === 'settings-app' && (
                        <SettingsAppPage
                            pwaShowAgainIntervalDays={settings.pwaShowAgainIntervalDays} setPwaShowAgainIntervalDays={settings.setPwaShowAgainIntervalDays}
                            identityVerificationPromptIntervalDays={settings.identityVerificationPromptIntervalDays} setIdentityVerificationPromptIntervalDays={settings.setIdentityVerificationPromptIntervalDays}
                            isDirtyApp={settings.isDirtyApp}
                            saving={settings.saving} saveSettings={settings.saveSettings}
                        />
                    )}
                    {activeTab === 'settings-admins' && (
                        <SettingsAdminsPage
                            adminListRich={settings.adminListRich}
                            adminSearch={settings.adminSearch} setAdminSearch={settings.setAdminSearch}
                            adminSearchResults={settings.adminSearchResults}
                            showAdminDropdown={settings.showAdminDropdown} setShowAdminDropdown={settings.setShowAdminDropdown}
                            searchingAdmin={settings.searchingAdmin}
                            handleSelectAdmin={settings.handleSelectAdmin}
                            handleRemoveAdmin={settings.handleRemoveAdmin}
                            isDirtyAdmins={settings.isDirtyAdmins}
                            saving={settings.saving} saveSettings={settings.saveSettings}
                            userId={userId}
                        />
                    )}

                </main>
            </div>
        </div>
    );
}
