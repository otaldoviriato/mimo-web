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
import { SettingsAlertsPage } from '@/components/admin/settings/SettingsAlertsPage';
import { SettingsChatPage } from '@/components/admin/settings/SettingsChatPage';
import { SettingsPricingPage } from '@/components/admin/settings/SettingsPricingPage';
import { SettingsProfilesPage } from '@/components/admin/settings/SettingsProfilesPage';
import { SettingsPaymentsPage } from '@/components/admin/settings/SettingsPaymentsPage';
import { SettingsAppPage } from '@/components/admin/settings/SettingsAppPage';
import { SettingsAdminsPage } from '@/components/admin/settings/SettingsAdminsPage';
import { SettingsExplorePage } from '@/components/admin/settings/SettingsExplorePage';
import { SettingsLevelsPage } from '@/components/admin/settings/SettingsLevelsPage';
import { useSettings } from '@/hooks/admin/useSettings';
import {
    Users, UserCheck, UserX, UserPlus, MessageSquare, MessageCircle, Coins, TrendingUp,
    Lock, ArrowLeft, CheckCircle2, Clock, AlertCircle, Sliders, Trash2, Award, Medal, Crown, Star, Search, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const TAB_TITLES: Record<string, string> = {
    dashboard: 'Painel Geral',
    clients: 'Gerenciamento de Clientes',
    professionals: 'Gerenciamento de Profissionais',
    rooms: 'Auditoria de Conversas',
    financial: 'Movimentações Financeiras',
    'help-tickets': 'Tickets de Ajuda',
    'institutional-emails': 'E-mails Institucionais',
    'identity-verifications': 'Verificações de Selos de Autenticidade',
    'settings-platform': 'Configurações — Plataforma & Operação',
    'settings-alerts': 'Configurações — Alertas do Admin',
    'settings-chat': 'Configurações — Chat & Sessões',
    'settings-explore': 'Configurações — Explorar & Desempate',
    'settings-pricing': 'Configurações — Precificação & Assinaturas',
    'settings-profiles': 'Configurações — Perfis & Galeria',
    'settings-payments': 'Configurações — Meios de Pagamento',
    'settings-app': 'Configurações — App & Experiência',
    'settings-admins': 'Configurações — Administradores',
    'settings-levels': 'Configurações — Faixas & Medalhas',
};

const VALID_TABS = Object.keys(TAB_TITLES);

function formatRelativeTime(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return 'Sem acesso recente';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Sem acesso recente';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Agora mesmo';

    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 60) return diffMin <= 1 ? 'Agora mesmo' : `Há ${diffMin} min`;
    if (diffHrs < 24) return `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 30) return `Há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR');
}

export default function AdminPage() {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);

    const [profTab, setProfTab] = useState<'active_absent' | 'inactive'>('active_absent');
    const [profSearch, setProfSearch] = useState('');

    const settings = useSettings(isLoaded, isSignedIn, userId);
    const { isAuthorized, loadingSettings } = settings;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab && VALID_TABS.includes(tab)) setActiveTab(tab);
        }
    }, []);

    const fetchDashboard = async () => {
        setLoadingDashboard(true);
        try {
            const res = await fetch('/api/admin/dashboard');
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
                fetchDashboard();
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
        if (activeTab === 'dashboard') {
            fetchDashboard();
        }
    }, [activeTab, isAuthorized]);

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

                </DashboardHeader>

                <main className={`flex-1 overflow-y-auto max-w-7xl w-full mx-auto ${isSettingsTab ? 'p-4 md:p-8' : 'p-4 md:p-8 space-y-4 md:space-y-8'}`}>
                    {/* Dashboard */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            {/* Cards de Métricas Estratégicas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatsCard title="Profissionais Ativas" value={loadingDashboard ? '...' : dashboardData?.metrics?.active24h?.value || '0'} icon={UserCheck} color="green" />
                                <StatsCard title="Profissionais Ausentes" value={loadingDashboard ? '...' : dashboardData?.metrics?.absent?.value || '0'} icon={Clock} color="amber" />
                                <StatsCard title="Profissionais Inativas" value={loadingDashboard ? '...' : dashboardData?.metrics?.inactive?.value || '0'} icon={UserX} color="rose" />
                                <StatsCard title="Clientes Trazidos" value={loadingDashboard ? '...' : dashboardData?.metrics?.totalBroughtClients?.value || '0'} icon={UserPlus} color="purple" />
                            </div>

                            {/* Tabela Principal de Profissionais (Largura Total) */}
                            <div className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                                {/* Header do Painel */}
                                <div className="p-5 border-b border-slate-100 bg-white space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                                <UserCheck size={18} className="text-purple-600" />
                                                Acompanhamento de Profissionais
                                            </h3>
                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                Atividade recente e métricas de atribuição de novos clientes masculinos.
                                            </p>
                                        </div>
                                        {/* Campo de Busca */}
                                        <div className="relative w-full sm:w-64">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar profissional..."
                                                value={profSearch}
                                                onChange={(e) => setProfSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Seleção de Abas */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                        <button
                                            onClick={() => setProfTab('active_absent')}
                                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                profTab === 'active_absent'
                                                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                            }`}
                                        >
                                            <span>Ativas & Ausentes</span>
                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                                                profTab === 'active_absent' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {dashboardData?.activeAndAbsentProfessionals?.length || 0}
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => setProfTab('inactive')}
                                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                profTab === 'inactive'
                                                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                            }`}
                                        >
                                            <span>Inativas (&gt; 7 dias)</span>
                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                                                profTab === 'inactive' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {dashboardData?.inactiveProfessionals?.length || 0}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Tabela de Dados */}
                                <div className="flex-1 overflow-x-auto">
                                    {loadingDashboard ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-2">
                                            <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                            <span className="text-xs text-slate-400 font-semibold">Carregando profissionais...</span>
                                        </div>
                                    ) : (() => {
                                        const rawList = profTab === 'active_absent'
                                            ? (dashboardData?.activeAndAbsentProfessionals || [])
                                            : (dashboardData?.inactiveProfessionals || []);

                                        const filtered = rawList.filter((prof: any) => {
                                            if (!profSearch.trim()) return true;
                                            const q = profSearch.toLowerCase().trim().replace('@', '');
                                            return (
                                                prof.name?.toLowerCase().includes(q) ||
                                                prof.username?.toLowerCase().includes(q) ||
                                                prof.email?.toLowerCase().includes(q)
                                            );
                                        });

                                        if (filtered.length === 0) {
                                            return (
                                                <div className="py-20 text-center space-y-2">
                                                    <UserX size={32} className="mx-auto text-slate-300 stroke-[1.5]" />
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        {profSearch ? 'Nenhuma profissional encontrada para esta busca.' : 'Nenhuma profissional cadastrada nesta aba.'}
                                                    </p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                        <th className="py-3 px-4">Profissional</th>
                                                        <th className="py-3 px-3">Status</th>
                                                        <th className="py-3 px-3 text-center">Total Acessos</th>
                                                        <th className="py-3 px-3 text-center">Frequência Média</th>
                                                        <th className="py-3 px-3 text-center">Clientes Trazidos</th>
                                                        <th className="py-3 px-3">Última Atração</th>
                                                        <th className="py-3 px-3">Último Acesso</th>
                                                        <th className="py-3 px-4 text-right">Faturamento</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-xs">
                                                    {filtered.map((prof: any) => (
                                                        <tr key={prof.clerkId} className="hover:bg-slate-50/80 transition-colors group">
                                                            {/* Profissional Info */}
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    {prof.photoUrl ? (
                                                                        <img src={prof.photoUrl} alt={prof.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0" />
                                                                    ) : (
                                                                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                                            {prof.name[0]?.toUpperCase() || 'P'}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-col min-w-0">
                                                                        <Link href={`/admin/users/${prof.clerkId}`} className="font-bold text-slate-800 hover:text-purple-600 transition-colors truncate flex items-center gap-1">
                                                                            {prof.name}
                                                                            <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 shrink-0" />
                                                                        </Link>
                                                                        <span className="text-[10px] text-slate-400 font-semibold truncate">@{prof.username}</span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Status Badge */}
                                                            <td className="py-3 px-3 whitespace-nowrap">
                                                                {prof.status === 'active' && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold text-[10px]">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                        Ativa ({formatRelativeTime(prof.lastAccessAt)})
                                                                    </span>
                                                                )}
                                                                {prof.status === 'absent' && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-bold text-[10px]">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                        Ausente ({formatRelativeTime(prof.lastAccessAt)})
                                                                    </span>
                                                                )}
                                                                {prof.status === 'inactive' && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[10px]">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                                        Inativa ({formatRelativeTime(prof.lastAccessAt)})
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {/* Total Acessos */}
                                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                                                                    {prof.accessCount || 0} {prof.accessCount === 1 ? 'acesso' : 'acessos'}
                                                                </span>
                                                            </td>

                                                            {/* Frequência Média */}
                                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-bold text-[11px]">
                                                                    {prof.avgFrequencyLabel || 'Nenhum acesso'}
                                                                </span>
                                                            </td>

                                                            {/* Clientes Trazidos */}
                                                            <td className="py-3 px-3 text-center whitespace-nowrap">
                                                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black ${
                                                                    prof.broughtClientsCount > 0
                                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                                                                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                                                                }`}>
                                                                    {prof.broughtClientsCount} {prof.broughtClientsCount === 1 ? 'cliente' : 'clientes'}
                                                                </span>
                                                            </td>

                                                            {/* Última Atração */}
                                                            <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium text-[11px]">
                                                                {prof.lastClientBroughtAt ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-700">{formatRelativeTime(prof.lastClientBroughtAt)}</span>
                                                                        <span className="text-[9px] text-slate-400">
                                                                            {new Date(prof.lastClientBroughtAt).toLocaleDateString('pt-BR')} às {new Date(prof.lastClientBroughtAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 italic text-[11px]">Nenhum ainda</span>
                                                                )}
                                                            </td>

                                                            {/* Último Acesso */}
                                                            <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium text-[11px]">
                                                                {prof.lastAccessAt ? (
                                                                    <div className="flex flex-col">
                                                                        <span>{new Date(prof.lastAccessAt).toLocaleDateString('pt-BR')}</span>
                                                                        <span className="text-[9px] text-slate-400">
                                                                            {new Date(prof.lastAccessAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 italic text-[11px]">N/D</span>
                                                                )}
                                                            </td>

                                                            {/* Faturamento */}
                                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                                <span className="font-extrabold text-slate-800 text-xs">
                                                                    {(prof.totalEarned || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
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
                    {activeTab === 'settings-alerts' && <SettingsAlertsPage />}
                    {activeTab === 'settings-chat' && (
                        <SettingsChatPage
                            chatSessionTimeoutMinutes={settings.chatSessionTimeoutMinutes} setChatSessionTimeoutMinutes={settings.setChatSessionTimeoutMinutes}
                            lowBalanceThresholdInCents={settings.lowBalanceThresholdInCents} setLowBalanceThresholdInCents={settings.setLowBalanceThresholdInCents}
                            onlineDelayMinutes={settings.onlineDelayMinutes} setOnlineDelayMinutes={settings.setOnlineDelayMinutes}
                            activeUserThresholdDays={settings.activeUserThresholdDays} setActiveUserThresholdDays={settings.setActiveUserThresholdDays}
                            isDirtyChat={settings.isDirtyChat}
                            saving={settings.saving} saveSettings={settings.saveSettings}
                        />
                    )}
                    {activeTab === 'settings-explore' && (
                        <SettingsExplorePage
                            exploreSortingCriteria={settings.exploreSortingCriteria} setExploreSortingCriteria={settings.setExploreSortingCriteria}
                            isDirtyExplore={settings.isDirtyExplore}
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
                            newClientHoursThreshold={settings.newClientHoursThreshold} setNewClientHoursThreshold={settings.setNewClientHoursThreshold}
                            activeRechargedClientDaysThreshold={settings.activeRechargedClientDaysThreshold} setActiveRechargedClientDaysThreshold={settings.setActiveRechargedClientDaysThreshold}
                            activeUnrechargedClientHoursThreshold={settings.activeUnrechargedClientHoursThreshold} setActiveUnrechargedClientHoursThreshold={settings.setActiveUnrechargedClientHoursThreshold}
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
                            creatorEngagementEmailsEnabled={settings.creatorEngagementEmailsEnabled} setCreatorEngagementEmailsEnabled={settings.setCreatorEngagementEmailsEnabled}
                            creatorEngagementStep1Enabled={settings.creatorEngagementStep1Enabled} setCreatorEngagementStep1Enabled={settings.setCreatorEngagementStep1Enabled}
                            creatorEngagementStep1Hours={settings.creatorEngagementStep1Hours} setCreatorEngagementStep1Hours={settings.setCreatorEngagementStep1Hours}
                            creatorEngagementStep2Enabled={settings.creatorEngagementStep2Enabled} setCreatorEngagementStep2Enabled={settings.setCreatorEngagementStep2Enabled}
                            creatorEngagementStep2Hours={settings.creatorEngagementStep2Hours} setCreatorEngagementStep2Hours={settings.setCreatorEngagementStep2Hours}
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
                    {activeTab === 'settings-levels' && (
                        <SettingsLevelsPage
                            clientLevels={settings.clientLevels}
                            setClientLevels={settings.setClientLevels}
                            isDirtyLevels={settings.isDirtyLevels}
                            saving={settings.saving}
                            saveSettings={settings.saveSettings}
                        />
                    )}

                </main>
            </div>
        </div>
    );
}
