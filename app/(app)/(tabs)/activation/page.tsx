'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Activity,
    BanknoteArrowDown,
    BarChart3,
    CalendarDays,
    ChevronDown,
    ExternalLink,
    MessageSquare,
    MousePointerClick,
    Radio,
    Search,
    UserCheck,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyProfile } from '@/hooks/useQueries';

type FilterStatus = 'all' | 'unviewed' | 'pending' | 'contacted' | 'activated' | 'my_assigned';
type ActivationStatus = 'pending' | 'contacted' | 'activated' | 'not_interested';
type FunnelKey = 'registered' | 'share_attempted' | 'brought_user' | 'first_client' | 'frequent';
type EngagementStatusKey = 'recent' | 'active' | 'inactive';

type ProfessionalActivationItem = {
    clerkId: string;
    username?: string;
    name?: string;
    photoUrl?: string;
    createdAt: string;
    isOnline?: boolean;
    lastSeen?: string | null;
    isUnviewed?: boolean;
    activation?: {
        assignedTeamMemberId?: string | null;
        assignedTeamMemberName?: string | null;
        status?: ActivationStatus;
        stage?: string;
        notes?: string;
    };
    activationFunnel?: {
        key?: FunnelKey;
        label?: string;
        rank?: number;
    };
    activationMetrics?: {
        totalConversationsCount?: number;
        activeConversationsCount?: number;
        ownClientConversationsCount?: number;
        activeOwnClientConversationsCount?: number;
        broughtUsersCount?: number;
        shareClickCount?: number;
        balance?: number;
        withdrawalsCount?: number;
        lastWithdrawalAmount?: number | null;
        lastWithdrawalNetAmount?: number | null;
        lastWithdrawalStatus?: string | null;
        lastWithdrawalAt?: string | null;
        lastConversationAt?: string | null;
        activeThresholdDays?: number;
    };
    engagementStatus?: {
        key?: EngagementStatusKey;
        label?: string;
    };
};

const FUNNEL_STEPS = [
    { key: 'registered', label: 'Cadastro', description: 'Perfil criado e pronto para o primeiro contato.' },
    { key: 'share_attempted', label: 'Compartilhou', description: 'Tentou divulgar o proprio perfil.' },
    { key: 'brought_user', label: 'Trouxe usuario', description: 'Conseguiu trazer alguem para a plataforma.' },
    { key: 'first_client', label: '1o cliente', description: 'Ja iniciou conversa com cliente proprio.' },
    { key: 'frequent', label: 'Frequente', description: 'Mantem atividade e recorrencia de conversas.' },
];

const FILTERS: Array<{ key: FilterStatus; label: string }> = [
    { key: 'all', label: 'Todas' },
    { key: 'unviewed', label: 'Novas' },
    { key: 'pending', label: 'Nao contatadas' },
    { key: 'contacted', label: 'Em ativacao' },
    { key: 'activated', label: 'Ativadas' },
    { key: 'my_assigned', label: 'Meus atendimentos' },
];

export default function ActivationPage() {
    const router = useRouter();
    const { data: myProfile } = useMyProfile();

    const [professionals, setProfessionals] = useState<ProfessionalActivationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('pending');
    const [unviewedCount, setUnviewedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [activationStats, setActivationStats] = useState({ recent: 0, active: 0, inactive: 0 });
    const [showSearch, setShowSearch] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
    const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

    const fetchActivationData = useCallback(async (query: string = '', filter: FilterStatus = 'pending') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/team/activation/professionals?q=${encodeURIComponent(query)}&status=${filter}`);
            if (!res.ok) {
                toast.error('Erro ao carregar fila de ativacao.');
                return;
            }

            const data: {
                professionals?: ProfessionalActivationItem[];
                unviewedCount?: number;
                totalProfessionals?: number;
                activationStats?: { recent?: number; active?: number; inactive?: number };
            } = await res.json();

            setProfessionals(data.professionals || []);
            setUnviewedCount(data.unviewedCount || 0);
            setTotalCount(data.totalProfessionals || 0);
            setActivationStats({
                recent: data.activationStats?.recent || 0,
                active: data.activationStats?.active || 0,
                inactive: data.activationStats?.inactive || 0,
            });
        } catch (err) {
            console.error('Erro ao carregar ativacao:', err);
            toast.error('Falha de conexao com o servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch('/api/team/activation/view', { method: 'POST' }).catch(console.error);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchActivationData(searchQuery, activeFilter);
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery, activeFilter, fetchActivationData]);

    useEffect(() => {
        const toggleSearch = () => {
            setShowSearch(current => !current);
            setViewMode('list');
        };
        const showStats = () => {
            if (viewMode === 'stats') {
                setViewMode('list');
                return;
            }

            setActiveFilter('all');
            setViewMode('stats');
        };

        window.addEventListener('mimo:activation-toggle-search', toggleSearch);
        window.addEventListener('mimo:activation-toggle-stats', showStats);
        return () => {
            window.removeEventListener('mimo:activation-toggle-search', toggleSearch);
            window.removeEventListener('mimo:activation-toggle-stats', showStats);
        };
    }, [viewMode]);

    const formatRelativeTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
            if (diffMin < 1) return 'Agora mesmo';
            if (diffMin < 60) return `ha ${diffMin} min`;
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) return `ha ${diffHours} h`;
            return `ha ${Math.floor(diffHours / 24)} dias`;
        } catch {
            return 'N/A';
        }
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return 'Sem registro';
        try {
            return new Date(dateStr).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Sem registro';
        }
    };

    const formatCurrency = (amountInCents?: number | null) => {
        return ((amountInCents || 0) / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    };

    const getProfessionalDisplayName = (prof: ProfessionalActivationItem) => {
        return prof.name || prof.username || 'profissional';
    };

    const getCurrentFunnelStep = (rank: number) => {
        return FUNNEL_STEPS[Math.min(Math.max(rank, 1), FUNNEL_STEPS.length) - 1] || FUNNEL_STEPS[0];
    };

    const getLastAccessLabel = (prof: ProfessionalActivationItem) => {
        if (prof.isOnline) return 'Online agora';
        if (prof.lastSeen) return `Ultimo acesso ${formatRelativeTime(prof.lastSeen)}`;
        return `Criada ${formatRelativeTime(prof.createdAt)}`;
    };

    const getWithdrawalStatusLabel = (status?: string | null) => {
        if (status === 'concluido') return 'Pago';
        if (status === 'processando') return 'Processando';
        if (status === 'pendente') return 'Pendente';
        if (status === 'rejeitado') return 'Rejeitado';
        return 'Sem saque';
    };

    const getEngagementBadgeClass = (key?: EngagementStatusKey) => {
        if (key === 'recent') return 'border-sky-200 bg-sky-50 text-sky-700';
        if (key === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        return 'border-slate-200 bg-slate-50 text-slate-500';
    };

    const getStatusBadge = (status?: ActivationStatus) => {
        if (status === 'activated') return 'Ativada';
        if (status === 'contacted') return 'Em ativacao';
        if (status === 'not_interested') return 'Sem interesse';
        return '1o contato';
    };

    const toggleSteps = (clerkId: string) => {
        setExpandedSteps(current => {
            const next = new Set(current);
            if (next.has(clerkId)) {
                next.delete(clerkId);
            } else {
                next.add(clerkId);
            }
            return next;
        });
    };

    const toggleDetails = (clerkId: string) => {
        setExpandedDetails(current => {
            const next = new Set(current);
            if (next.has(clerkId)) {
                next.delete(clerkId);
            } else {
                next.add(clerkId);
            }
            return next;
        });
    };

    const statsCards = useMemo(() => [
        {
            key: 'recent' as const,
            title: 'Recentes',
            value: activationStats.recent,
            description: 'Cadastro nas ultimas 24 horas.',
            className: 'border-sky-200 bg-sky-50/60 text-sky-700',
        },
        {
            key: 'active' as const,
            title: 'Ativas',
            value: activationStats.active,
            description: 'Mensagem com clientes nos ultimos 7 dias.',
            className: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
        },
        {
            key: 'inactive' as const,
            title: 'Inativas',
            value: activationStats.inactive,
            description: 'Sem mensagem com clientes nos ultimos 7 dias.',
            className: 'border-slate-200 bg-white text-slate-600',
        },
    ], [activationStats]);

    const visibleByEngagement = useMemo(() => {
        return {
            recent: professionals.filter(prof => prof.engagementStatus?.key === 'recent'),
            active: professionals.filter(prof => prof.engagementStatus?.key === 'active'),
            inactive: professionals.filter(prof => prof.engagementStatus?.key === 'inactive'),
        };
    }, [professionals]);

    return (
        <div className="flex-1 min-h-screen bg-slate-50 pb-24 md:pb-10 p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {FILTERS.map(filter => (
                            <button
                                key={filter.key}
                                onClick={() => {
                                    setActiveFilter(filter.key);
                                    setViewMode('list');
                                }}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                                    activeFilter === filter.key
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {filter.label}
                                {filter.key === 'unviewed' && unviewedCount > 0 ? ` (${unviewedCount})` : ''}
                                {filter.key === 'all' ? ` (${totalCount})` : ''}
                            </button>
                        ))}
                    </div>

                    {showSearch && (
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar por nome, @username ou e-mail..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    title="Limpar busca"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {viewMode === 'stats' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {statsCards.map(card => (
                                <div key={card.key} className={`rounded-xl border p-4 ${card.className}`}>
                                    <p className="text-xs font-bold uppercase tracking-wide opacity-80">{card.title}</p>
                                    <p className="mt-2 text-3xl font-black text-slate-900">{card.value}</p>
                                    <p className="mt-1 text-xs font-semibold opacity-80">{card.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            {statsCards.map(card => (
                                <section key={card.key} className="rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <h2 className="text-sm font-black text-slate-900">{card.title}</h2>
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getEngagementBadgeClass(card.key)}`}>
                                            {card.value}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {visibleByEngagement[card.key].slice(0, 8).map(prof => (
                                            <button
                                                key={prof.clerkId}
                                                onClick={() => prof.username && router.push(`/${prof.username}`)}
                                                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-50"
                                            >
                                                <AvatarImage prof={prof} size="sm" />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-xs font-bold text-slate-800">{getProfessionalDisplayName(prof)}</span>
                                                    <span className="block truncate text-[10px] font-semibold text-slate-400">@{prof.username || 'sem-username'}</span>
                                                </span>
                                            </button>
                                        ))}
                                        {visibleByEngagement[card.key].length === 0 && (
                                            <p className="py-6 text-center text-xs font-semibold text-slate-400">Nenhuma profissional nesta categoria.</p>
                                        )}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
                        <span className="text-sm font-semibold text-slate-500">Carregando profissionais...</span>
                    </div>
                ) : professionals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200/80 bg-white p-6 py-16 text-center">
                        <UserCheck className="h-12 w-12 text-slate-300" />
                        <h3 className="text-base font-bold text-slate-800">Nenhuma profissional encontrada</h3>
                        <p className="max-w-md text-xs text-slate-400">Nao ha profissionais correspondentes aos filtros selecionados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {professionals.map((prof) => {
                            const act = prof.activation || {};
                            const funnel = prof.activationFunnel || {};
                            const metrics = prof.activationMetrics || {};
                            const engagement = prof.engagementStatus || {};
                            const isAssignedToMe = act.assignedTeamMemberId === myProfile?.clerkId;
                            const currentFunnelRank = Number(funnel.rank || 1);
                            const currentFunnelStep = getCurrentFunnelStep(currentFunnelRank);
                            const isStepsExpanded = expandedSteps.has(prof.clerkId);
                            const isDetailsExpanded = expandedDetails.has(prof.clerkId);

                            return (
                                <article
                                    key={prof.clerkId}
                                    className={`rounded-xl border bg-white p-3.5 shadow-xs transition-colors ${
                                        prof.isUnviewed ? 'border-slate-300 ring-1 ring-slate-200' : 'border-slate-200/80 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => prof.username && router.push(`/${prof.username}`)}
                                                className="relative shrink-0 group"
                                                title="Abrir perfil"
                                            >
                                                <AvatarImage prof={prof} />
                                                {prof.isOnline && (
                                                    <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                                                )}
                                            </button>
                                            <div className="min-w-0">
                                                <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-black leading-tight text-slate-900">
                                                    <span className="truncate">{getProfessionalDisplayName(prof)}</span>
                                                    {prof.isUnviewed && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" title="Novo" />}
                                                </h2>
                                                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">@{prof.username || 'sem-username'} · {getLastAccessLabel(prof)}</p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => prof.username && router.push(`/${prof.username}`)}
                                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                            title="Abrir perfil"
                                        >
                                            <ExternalLink size={15} />
                                        </button>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getEngagementBadgeClass(engagement.key)}`}>
                                            {engagement.label || 'Inativa'}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                            {getStatusBadge(act.status)}
                                        </span>
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                            isAssignedToMe ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                                        }`}>
                                            {act.assignedTeamMemberName || 'Sem responsavel'}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2 border-y border-slate-100 py-3">
                                        <Metric icon={<Activity size={13} />} label="Etapa" value={currentFunnelStep.label} />
                                        <Metric icon={<MessageSquare size={13} />} label="Conversas" value={String(metrics.totalConversationsCount || 0)} detail={`${metrics.activeConversationsCount || 0} ativas`} />
                                        <Metric icon={<Wallet size={13} />} label="Saldo" value={formatCurrency(metrics.balance)} />
                                    </div>

                                    <div className="mt-2 space-y-2">
                                        <button
                                            onClick={() => toggleSteps(prof.clerkId)}
                                            className="flex h-8 w-full items-center justify-between rounded-lg px-1 text-[11px] font-black text-slate-600 hover:bg-slate-50"
                                        >
                                            <span>Etapas</span>
                                            <span className="flex items-center gap-1 text-slate-400">
                                                {currentFunnelRank}/5
                                                <ChevronDown size={14} className={`transition-transform ${isStepsExpanded ? 'rotate-180' : ''}`} />
                                            </span>
                                        </button>

                                        {isStepsExpanded && (
                                            <div className="space-y-1.5 border-t border-slate-100 pt-2">
                                                {FUNNEL_STEPS.map((step, index) => {
                                                    const stepNumber = index + 1;
                                                    const isDone = currentFunnelRank >= stepNumber;
                                                    return (
                                                        <div key={step.key} className="flex gap-2.5">
                                                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isDone ? 'bg-slate-700' : 'bg-slate-200'}`} />
                                                            <span className="min-w-0 pb-1">
                                                                <span className={`block text-[12px] font-bold leading-5 ${isDone ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
                                                                <span className="block text-[10px] font-semibold leading-snug text-slate-400">{step.description}</span>
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => toggleDetails(prof.clerkId)}
                                            className="flex h-8 w-full items-center justify-between rounded-lg px-1 text-[11px] font-black text-slate-600 hover:bg-slate-50"
                                        >
                                            <span>Ver mais</span>
                                            <span className="flex items-center gap-2 text-slate-400">
                                                {formatCurrency(metrics.balance)} · {metrics.withdrawalsCount || 0} saques
                                                <ChevronDown size={14} className={`transition-transform ${isDetailsExpanded ? 'rotate-180' : ''}`} />
                                            </span>
                                        </button>

                                        {isDetailsExpanded && (
                                            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-500">
                                                <Detail icon={<MessageSquare size={12} />} label="Conversas totais" value={String(metrics.totalConversationsCount || 0)} />
                                                <Detail icon={<Users size={12} />} label="Clientes proprios" value={String(metrics.ownClientConversationsCount || 0)} />
                                                <Detail icon={<BanknoteArrowDown size={12} />} label="Saques" value={`${metrics.withdrawalsCount || 0} · ${getWithdrawalStatusLabel(metrics.lastWithdrawalStatus)}`} />
                                                <Detail icon={<BanknoteArrowDown size={12} />} label="Ultimo saque" value={metrics.lastWithdrawalAmount != null ? formatCurrency(metrics.lastWithdrawalAmount) : 'Sem saque'} />
                                                <Detail icon={<MousePointerClick size={12} />} label="Compartilhamentos" value={String(metrics.shareClickCount || 0)} />
                                                <Detail icon={<CalendarDays size={12} />} label="Cadastro" value={formatDateTime(prof.createdAt)} />
                                                <Detail icon={<Radio size={12} />} label="Ultima online" value={prof.isOnline ? 'Online agora' : formatDateTime(prof.lastSeen)} />
                                                <Detail icon={<BarChart3 size={12} />} label="Ultima conversa" value={formatDateTime(metrics.lastConversationAt)} />
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function AvatarImage({ prof, size = 'md' }: { prof: ProfessionalActivationItem; size?: 'sm' | 'md' }) {
    const className = size === 'sm'
        ? 'h-8 w-8 rounded-lg object-cover border border-slate-100'
        : 'h-12 w-12 rounded-lg object-cover border border-slate-100';

    if (prof.photoUrl) {
        return (
            <Image
                src={prof.photoUrl}
                alt={prof.name || prof.username || 'Profissional'}
                width={size === 'sm' ? 32 : 48}
                height={size === 'sm' ? 32 : 48}
                unoptimized
                className={className}
            />
        );
    }

    return (
        <div className={`${className} flex items-center justify-center bg-slate-100 text-xs font-bold text-slate-500`}>
            {prof.name ? prof.name.substring(0, 2).toUpperCase() : 'PR'}
        </div>
    );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {icon}
                <span className="truncate">{label}</span>
            </p>
            <p className="mt-1 truncate text-xs font-black text-slate-900">{value}</p>
            {detail && <p className="truncate text-[10px] font-semibold text-slate-400">{detail}</p>}
        </div>
    );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-lg border border-slate-100 px-2 py-1.5">
            <p className="flex items-center gap-1 text-slate-400">
                {icon}
                <span className="truncate">{label}</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-700">{value}</p>
        </div>
    );
}
