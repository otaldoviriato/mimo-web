'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminContext } from '@/context/AdminSettingsContext';
import { StatsCard } from '@/components/admin/StatsCard';
import { SortableColumnHeader } from '@/components/admin/SortableColumnHeader';
import {
    UserCheck, UserX, UserPlus, Clock, Search, ExternalLink
} from 'lucide-react';

type SortKey =
    | 'name'
    | 'status'
    | 'accessCount'
    | 'avgFrequency'
    | 'broughtClientsCount'
    | 'lastClientBroughtAt'
    | 'lastAccessAt'
    | 'totalEarned';

type SortDir = 'asc' | 'desc';

const STATUS_WEIGHT: Record<string, number> = {
    active: 3,
    absent: 2,
    inactive: 1,
};

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

export default function AdminDashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { dashboardData, loadingDashboard } = useAdminContext();

    const [profTab, setProfTab] = useState<'active_absent' | 'inactive'>('active_absent');
    const [profSearch, setProfSearch] = useState('');

    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
        } else {
            setSortKey(key);
            setSortDir(key === 'name' || key === 'status' ? 'asc' : 'desc');
        }
    };

    // Suporte a links antigos com ?tab=... para redirecionamento transparente
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && TAB_MAPPINGS[tab]) {
            router.replace(TAB_MAPPINGS[tab]);
        }
    }, [searchParams, router]);

    return (
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

                    {/* Seleção de Abas Internas */}
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

                        const displayList = (() => {
                            if (!sortKey) return filtered;

                            return [...filtered].sort((a: any, b: any) => {
                                let valA: any = 0;
                                let valB: any = 0;

                                switch (sortKey) {
                                    case 'name':
                                        valA = a.name || a.username || '';
                                        valB = b.name || b.username || '';
                                        break;
                                    case 'status':
                                        valA = STATUS_WEIGHT[a.status] || 0;
                                        valB = STATUS_WEIGHT[b.status] || 0;
                                        break;
                                    case 'accessCount':
                                        valA = a.accessCount || 0;
                                        valB = b.accessCount || 0;
                                        break;
                                    case 'avgFrequency':
                                        valA = a.avgFrequencyValue || 0;
                                        valB = b.avgFrequencyValue || 0;
                                        break;
                                    case 'broughtClientsCount':
                                        valA = a.broughtClientsCount || 0;
                                        valB = b.broughtClientsCount || 0;
                                        break;
                                    case 'lastClientBroughtAt':
                                        valA = a.lastClientBroughtAt ? new Date(a.lastClientBroughtAt).getTime() : 0;
                                        valB = b.lastClientBroughtAt ? new Date(b.lastClientBroughtAt).getTime() : 0;
                                        break;
                                    case 'lastAccessAt':
                                        valA = a.lastAccessAt ? new Date(a.lastAccessAt).getTime() : 0;
                                        valB = b.lastAccessAt ? new Date(b.lastAccessAt).getTime() : 0;
                                        break;
                                    case 'totalEarned':
                                        valA = a.totalEarned || 0;
                                        valB = b.totalEarned || 0;
                                        break;
                                }

                                if (typeof valA === 'string' && typeof valB === 'string') {
                                    const cmp = valA.localeCompare(valB, 'pt-BR');
                                    return sortDir === 'asc' ? cmp : -cmp;
                                }

                                const numA = Number(valA);
                                const numB = Number(valB);
                                return sortDir === 'asc' ? numA - numB : numB - numA;
                            });
                        })();

                        if (displayList.length === 0) {
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
                                        <th className="py-3 px-4">
                                            <SortableColumnHeader
                                                label="Profissional"
                                                active={sortKey === 'name'}
                                                direction={sortDir}
                                                onClick={() => handleSort('name')}
                                            />
                                        </th>
                                        <th className="py-3 px-3">
                                            <SortableColumnHeader
                                                label="Status"
                                                active={sortKey === 'status'}
                                                direction={sortDir}
                                                onClick={() => handleSort('status')}
                                            />
                                        </th>
                                        <th className="py-3 px-3 text-center">
                                            <SortableColumnHeader
                                                label="Total Acessos"
                                                active={sortKey === 'accessCount'}
                                                direction={sortDir}
                                                onClick={() => handleSort('accessCount')}
                                                align="center"
                                            />
                                        </th>
                                        <th className="py-3 px-3 text-center">
                                            <SortableColumnHeader
                                                label="Frequência Média"
                                                active={sortKey === 'avgFrequency'}
                                                direction={sortDir}
                                                onClick={() => handleSort('avgFrequency')}
                                                align="center"
                                            />
                                        </th>
                                        <th className="py-3 px-3 text-center">
                                            <SortableColumnHeader
                                                label="Clientes Trazidos"
                                                active={sortKey === 'broughtClientsCount'}
                                                direction={sortDir}
                                                onClick={() => handleSort('broughtClientsCount')}
                                                align="center"
                                            />
                                        </th>
                                        <th className="py-3 px-3">
                                            <SortableColumnHeader
                                                label="Última Atração"
                                                active={sortKey === 'lastClientBroughtAt'}
                                                direction={sortDir}
                                                onClick={() => handleSort('lastClientBroughtAt')}
                                            />
                                        </th>
                                        <th className="py-3 px-3">
                                            <SortableColumnHeader
                                                label="Último Acesso"
                                                active={sortKey === 'lastAccessAt'}
                                                direction={sortDir}
                                                onClick={() => handleSort('lastAccessAt')}
                                            />
                                        </th>
                                        <th className="py-3 px-4 text-right">
                                            <SortableColumnHeader
                                                label="Faturamento"
                                                active={sortKey === 'totalEarned'}
                                                direction={sortDir}
                                                onClick={() => handleSort('totalEarned')}
                                                align="right"
                                            />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {displayList.map((prof: any) => (
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
    );
}
