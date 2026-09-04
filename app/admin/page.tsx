'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminContext } from '@/context/AdminSettingsContext';
import { StatsCard } from '@/components/admin/StatsCard';
import {
    MessageSquareCheck, TrendingUp, Coins, ShieldCheck,
    Search, Clock, ExternalLink, Eye, Zap, Flame, Award,
    CheckCircle2, AlertTriangle, MessageCircle, ArrowRight, RefreshCw
} from 'lucide-react';

const TAB_MAPPINGS: Record<string, string> = {
    dashboard: '/admin',
    clients: '/admin/clients',
    professionals: '/admin/professionals',
    rooms: '/admin/rooms',
    financial: '/admin/financial',
    'help-tickets': '/admin/help-tickets',
    'institutional-emails': '/admin/institutional-emails',
    'identity-verifications': '/admin/identity-verifications',
    'settings-platform': '/admin/settings/platform',
    'settings-alerts': '/admin/settings/alerts',
    'settings-chat': '/admin/settings/chat',
    'settings-explore': '/admin/settings/explore',
    'settings-pricing': '/admin/settings/pricing',
    'settings-profiles': '/admin/settings/profiles',
    'settings-payments': '/admin/settings/payments',
    'settings-app': '/admin/settings/app',
    'settings-admins': '/admin/settings/admins',
    'settings-levels': '/admin/settings/levels',
};

function formatRelativeTime(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Agora';

    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 60) return diffMin <= 1 ? 'Agora mesmo' : `Há ${diffMin} min`;
    if (diffHrs < 24) return `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 30) return `Há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR');
}

function formatCentsToBRL(cents: number | undefined | null): string {
    return ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type ConversationFilterStatus = 'all' | 'open' | 'settlement_pending' | 'settled' | 'moderation';

const BONUS_LABELS: Record<string, { label: string; icon: React.ComponentType<any> }> = {
    quickReply: { label: '+10% Agilidade', icon: Zap },
    engagement: { label: '+15% Engajamento', icon: Flame },
    deepConversation: { label: '+15% Profundidade', icon: Award },
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { dashboardData, loadingDashboard, fetchDashboard } = useAdminContext();

    const [statusFilter, setStatusFilter] = useState<ConversationFilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Suporte a links antigos com ?tab=... para redirecionamento transparente
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && TAB_MAPPINGS[tab]) {
            router.replace(TAB_MAPPINGS[tab]);
        }
    }, [searchParams, router]);

    const marketplaceMetrics = dashboardData?.marketplaceMetrics || {};
    const qualifiedConversations: any[] = useMemo(() => {
        return dashboardData?.recentQualifiedConversations || [];
    }, [dashboardData]);

    const filteredConversations = useMemo(() => {
        return qualifiedConversations.filter((c: any) => {
            // Filtro por status
            if (statusFilter === 'open' && c.status !== 'open') return false;
            if (statusFilter === 'settlement_pending' && c.status !== 'settlement_pending') return false;
            if (statusFilter === 'settled' && c.status !== 'settled') return false;
            if (statusFilter === 'moderation') {
                const isFlagged = c.moderationStatus === 'pending_review' || c.moderationStatus === 'confirmed_violation';
                if (!isFlagged) return false;
            }

            // Filtro por busca
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase().trim();
            const profName = (c.professional?.name || '').toLowerCase();
            const profUsername = (c.professional?.username || '').toLowerCase();
            const clientName = (c.client?.name || '').toLowerCase();
            const roomId = (c.roomId || '').toLowerCase();

            return profName.includes(q) || profUsername.includes(q) || clientName.includes(q) || roomId.includes(q);
        });
    }, [qualifiedConversations, statusFilter, searchQuery]);

    const countOpen = useMemo(() => qualifiedConversations.filter(c => c.status === 'open').length, [qualifiedConversations]);
    const countPending = useMemo(() => qualifiedConversations.filter(c => c.status === 'settlement_pending').length, [qualifiedConversations]);
    const countSettled = useMemo(() => qualifiedConversations.filter(c => c.status === 'settled').length, [qualifiedConversations]);
    const countModeration = useMemo(() => qualifiedConversations.filter(c => c.moderationStatus === 'pending_review' || c.moderationStatus === 'confirmed_violation').length, [qualifiedConversations]);

    return (
        <div className="space-y-6">
            {/* Top Header com Título e Atualização */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <MessageSquareCheck className="text-purple-600" size={24} />
                        Dashboard Operacional do Marketplace
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Acompanhamento em tempo real das conversas qualificadas, metas e saúde financeira da plataforma.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => fetchDashboard()}
                        disabled={loadingDashboard}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loadingDashboard ? 'animate-spin' : ''} />
                        <span>Atualizar</span>
                    </button>
                    <Link
                        href="/admin/professionals"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200/60 transition-all cursor-pointer"
                    >
                        <span>Painel de Profissionais</span>
                        <ArrowRight size={13} />
                    </Link>
                </div>
            </div>

            {/* Alerta de Moderação Urgente (se houver) */}
            {(marketplaceMetrics.pendingModerationCount > 0 || countModeration > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900">
                                {marketplaceMetrics.pendingModerationCount || countModeration} conversa(s) aguardando moderação
                            </h4>
                            <p className="text-xs text-amber-700 mt-0.5">
                                Detectada suspeita de compartilhamento de contato externo durante o fluxo de conversa qualificada.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setStatusFilter('moderation')}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                        Ver na fila
                    </button>
                </div>
            )}

            {/* Cards de Métricas Estratégicas do Marketplace */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Conversas Qualificadas"
                    value={loadingDashboard ? '...' : (marketplaceMetrics.totalQualified ?? qualifiedConversations.length)}
                    change={`${marketplaceMetrics.openConversations ?? countOpen} abertas`}
                    isPositive={true}
                    icon={MessageSquareCheck}
                    color="purple"
                />
                <StatsCard
                    title="Taxa de Qualificação"
                    value={loadingDashboard ? '...' : (marketplaceMetrics.qualificationRate || '0%')}
                    change="Meta 500 chars"
                    isPositive={true}
                    icon={TrendingUp}
                    color="green"
                />
                <StatsCard
                    title="Receita Bruta Gerada"
                    value={loadingDashboard ? '...' : formatCentsToBRL(marketplaceMetrics.grossRevenueCents)}
                    icon={Coins}
                    color="blue"
                />
                <StatsCard
                    title="Margem da Plataforma"
                    value={loadingDashboard ? '...' : formatCentsToBRL(marketplaceMetrics.platformMarginCents)}
                    change={`Repasse: ${formatCentsToBRL(marketplaceMetrics.professionalPayoutCents)}`}
                    isPositive={true}
                    icon={ShieldCheck}
                    color="amber"
                />
            </div>

            {/* Tabela Principal — Feed Operacional de Conversas Qualificadas */}
            <div className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                {/* Header da Tabela com Filtros e Busca */}
                <div className="p-5 border-b border-slate-100 bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <MessageCircle size={18} className="text-purple-600" />
                                Feed de Conversas Qualificadas
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                Sessões que alcançaram pelo menos 500 caracteres equivalentes com resposta da profissional.
                            </p>
                        </div>

                        {/* Campo de Busca */}
                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar profissional, cliente ou sala..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    {/* Filtros de Status (Tabs) */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 overflow-x-auto">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                statusFilter === 'all'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                            }`}
                        >
                            <span>Todas</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {qualifiedConversations.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter('open')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                statusFilter === 'open'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                            }`}
                        >
                            <span>Abertas Agora</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                statusFilter === 'open' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                                {countOpen}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter('settlement_pending')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                statusFilter === 'settlement_pending'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                            }`}
                        >
                            <span>Liquidação Pendente</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                statusFilter === 'settlement_pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                            }`}>
                                {countPending}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter('settled')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                statusFilter === 'settled'
                                    ? 'bg-slate-700 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                            }`}
                        >
                            <span>Liquidadas</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                statusFilter === 'settled' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {countSettled}
                            </span>
                        </button>

                        {countModeration > 0 && (
                            <button
                                onClick={() => setStatusFilter('moderation')}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                    statusFilter === 'moderation'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                            >
                                <AlertTriangle size={12} />
                                <span>Com Suspeita</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                    statusFilter === 'moderation' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'
                                }`}>
                                    {countModeration}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabela de Dados das Conversas */}
                <div className="flex-1 overflow-x-auto">
                    {loadingDashboard ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-2">
                            <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                            <span className="text-xs text-slate-400 font-semibold">Carregando feed operacional...</span>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="py-20 px-4 text-center flex flex-col items-center justify-center">
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mb-3">
                                <MessageSquareCheck size={26} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">
                                Nenhuma conversa qualificada encontrada
                            </h4>
                            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                                {searchQuery.trim()
                                    ? 'Nenhum resultado corresponde aos termos da sua busca.'
                                    : 'Conversas remuneráveis aparecerão aqui em tempo real assim que o cliente e a profissional atingirem 500 caracteres equivalentes.'}
                            </p>
                            {searchQuery.trim() && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-3 text-xs text-purple-600 font-bold hover:underline cursor-pointer"
                                >
                                    Limpar busca
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                    <th className="py-3.5 px-5">Profissional</th>
                                    <th className="py-3.5 px-5">Cliente</th>
                                    <th className="py-3.5 px-5">Status</th>
                                    <th className="py-3.5 px-5">Carga (Chars)</th>
                                    <th className="py-3.5 px-5">Gasto Bruto</th>
                                    <th className="py-3.5 px-5">Repasse Profissional</th>
                                    <th className="py-3.5 px-5">Margem Mimo</th>
                                    <th className="py-3.5 px-5">Bônus</th>
                                    <th className="py-3.5 px-5">Moderação</th>
                                    <th className="py-3.5 px-5">Última Atividade</th>
                                    <th className="py-3.5 px-5 text-center">Auditoria</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredConversations.map((conv: any) => {
                                    const prof = conv.professional;
                                    const client = conv.client;

                                    // Badge de status
                                    let statusBadge = null;
                                    if (conv.status === 'open') {
                                        statusBadge = (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                Aberta
                                            </span>
                                        );
                                    } else if (conv.status === 'settlement_pending') {
                                        statusBadge = (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                                <Clock size={12} />
                                                Liquidação Pendente
                                            </span>
                                        );
                                    } else {
                                        statusBadge = (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                                                <CheckCircle2 size={12} className="text-slate-500" />
                                                Liquidada
                                            </span>
                                        );
                                    }

                                    // Badge de moderação
                                    const isSuspicious = conv.moderationStatus === 'pending_review' || conv.moderationStatus === 'confirmed_violation';

                                    return (
                                        <tr key={conv.id} className="hover:bg-slate-50/50 transition-colors group">
                                            {/* Profissional */}
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-2.5">
                                                    {prof.photoUrl ? (
                                                        <img
                                                            src={prof.photoUrl}
                                                            alt={prof.name}
                                                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black shrink-0">
                                                            {prof.name?.[0]?.toUpperCase() || 'P'}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-bold text-slate-900 block truncate">
                                                            {prof.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold block truncate">
                                                            @{prof.username || 'sem_username'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Cliente */}
                                            <td className="py-3.5 px-5">
                                                <span className="text-xs font-semibold text-slate-700 block truncate">
                                                    {client.name}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-5">
                                                {statusBadge}
                                            </td>

                                            {/* Carga Equivalente */}
                                            <td className="py-3.5 px-5">
                                                <span className="text-xs font-extrabold text-slate-800">
                                                    {conv.equivalentChars || 0}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium ml-1">equiv.</span>
                                            </td>

                                            {/* Gasto Bruto */}
                                            <td className="py-3.5 px-5">
                                                <span className="text-xs font-bold text-slate-900">
                                                    {formatCentsToBRL(conv.grossChargedCents)}
                                                </span>
                                            </td>

                                            {/* Repasse Profissional */}
                                            <td className="py-3.5 px-5">
                                                <span className="text-xs font-bold text-emerald-700">
                                                    {formatCentsToBRL(conv.payoutCents)}
                                                </span>
                                            </td>

                                            {/* Margem Mimo */}
                                            <td className="py-3.5 px-5">
                                                <span className="text-xs font-bold text-purple-700">
                                                    {formatCentsToBRL(conv.marginCents)}
                                                </span>
                                            </td>

                                            {/* Bônus Desbloqueados */}
                                            <td className="py-3.5 px-5">
                                                {conv.unlockedBonuses && conv.unlockedBonuses.length > 0 ? (
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {conv.unlockedBonuses.map((bKey: string) => {
                                                            const item = BONUS_LABELS[bKey] || { label: bKey, icon: Award };
                                                            const IconComp = item.icon;
                                                            return (
                                                                <span
                                                                    key={bKey}
                                                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60"
                                                                >
                                                                    <IconComp size={10} />
                                                                    {item.label}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 font-medium">-</span>
                                                )}
                                            </td>

                                            {/* Moderação */}
                                            <td className="py-3.5 px-5">
                                                {isSuspicious ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <AlertTriangle size={11} />
                                                        Suspeita
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                                                        <ShieldCheck size={11} className="text-emerald-500" />
                                                        Limpo
                                                    </span>
                                                )}
                                            </td>

                                            {/* Última Atividade */}
                                            <td className="py-3.5 px-5">
                                                <span className="text-xs text-slate-600 font-medium">
                                                    {formatRelativeTime(conv.lastParticipantActivityAt || conv.updatedAt)}
                                                </span>
                                            </td>

                                            {/* Ação / Auditoria */}
                                            <td className="py-3.5 px-5 text-center">
                                                <Link
                                                    href={`/admin/rooms`}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-500 hover:text-purple-600 transition-colors border border-slate-200/60"
                                                    title="Auditar conversa"
                                                >
                                                    <Eye size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Links rápidos para gestão detalhada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                    href="/admin/professionals"
                    className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-purple-300 transition-all flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            👩‍💼
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                Gestão de Profissionais
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                                Ver catálogo completo, taxas, status de verificação e atividades.
                            </p>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                    href="/admin/financial"
                    className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-purple-300 transition-all flex items-center justify-between group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            💳
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                Extrato Financeiro & Balanços
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                                Ver depósitos, saques solicitados e conciliação contábil.
                            </p>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </Link>
            </div>
        </div>
    );
}
