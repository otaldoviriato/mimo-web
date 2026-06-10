'use client';

import {
    CheckCircle2,
    Clock3,
    ContactRound,
    HeartHandshake,
    Sparkles,
    UserPlus,
    UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState, LoadingState, PageIntro, Panel, StatusBadge } from '@/components/marketing/MarketingUI';
import { marketingFetch } from '@/lib/marketing/client';

interface DashboardData {
    metrics: {
        total: number;
        new: number;
        approved: number;
        contacted: number;
        interested: number;
        onboarded: number;
        averageScore: number;
    };
    recentRuns: Array<{
        _id: string;
        status: string;
        leadsFound: number;
        createdAt: string;
        campaignId?: { name?: string };
    }>;
    topPending: Array<{
        _id: string;
        username: string;
        displayName: string;
        aiScore: number;
        aiRecommendation: string;
    }>;
    minScoreToHighlight: number;
}

const cards = [
    { key: 'total', label: 'Total de leads', icon: UsersRound, color: 'text-purple-600 bg-purple-50' },
    { key: 'new', label: 'Leads novos', icon: UserPlus, color: 'text-blue-600 bg-blue-50' },
    { key: 'approved', label: 'Aprovados', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'contacted', label: 'Contatados', icon: ContactRound, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'interested', label: 'Interessadas', icon: HeartHandshake, color: 'text-rose-600 bg-rose-50' },
    { key: 'onboarded', label: 'Onboarded', icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
] as const;

export default function MarketingDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        marketingFetch<DashboardData & { success: true }>('/api/marketing/dashboard')
            .then(setData)
            .catch(error => toast.error(error.message));
    }, []);

    if (!data) return <LoadingState text="Carregando indicadores..." />;

    return (
        <div className="mx-auto max-w-7xl">
            <PageIntro
                title="Visão geral da prospecção"
                description="Acompanhe o funil interno de criadoras, as rodadas recentes e os perfis com maior potencial."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {cards.map(card => {
                    const Icon = card.icon;
                    return (
                        <Panel key={card.key} className="p-4">
                            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <p className="text-2xl font-black">{data.metrics[card.key]}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{card.label}</p>
                        </Panel>
                    );
                })}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                <Panel className="p-6">
                    <p className="text-sm font-bold text-slate-500">Score médio</p>
                    <div className="mt-4 flex items-end gap-3">
                        <span className="text-5xl font-black text-purple-700">{Math.round(data.metrics.averageScore)}</span>
                        <span className="pb-1 text-sm font-bold text-slate-400">/ 100</span>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-linear-to-r from-purple-500 to-fuchsia-500" style={{ width: `${data.metrics.averageScore}%` }} />
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        Destaque configurado a partir de {data.minScoreToHighlight} pontos.
                    </p>
                </Panel>
                <Panel>
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h3 className="font-black">Melhores leads pendentes</h3>
                    </div>
                    {data.topPending.length === 0 ? (
                        <EmptyState title="Nenhuma lead pendente" description="As leads qualificadas aparecerão aqui." />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {data.topPending.map(lead => (
                                <a key={lead._id} href={`/marketing/leads?lead=${lead._id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-purple-50/50">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 font-black text-purple-700">
                                        {lead.username.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black">@{lead.username}</p>
                                        <p className="truncate text-xs text-slate-500">{lead.displayName || 'Sem nome público'}</p>
                                    </div>
                                    <StatusBadge tone={lead.aiScore >= data.minScoreToHighlight ? 'green' : 'amber'}>
                                        {Math.round(lead.aiScore)}
                                    </StatusBadge>
                                </a>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>

            <Panel className="mt-4">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                    <Clock3 className="h-4 w-4 text-purple-600" />
                    <h3 className="font-black">Últimas rodadas</h3>
                </div>
                {data.recentRuns.length === 0 ? (
                    <EmptyState title="Nenhuma rodada iniciada" description="Crie uma campanha e comece a primeira rodada." />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr><th className="px-5 py-3">Campanha</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Leads</th><th className="px-5 py-3">Data</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.recentRuns.map(run => (
                                    <tr key={run._id}>
                                        <td className="px-5 py-4 font-bold">{run.campaignId?.name || 'Campanha removida'}</td>
                                        <td className="px-5 py-4"><StatusBadge tone={run.status === 'completed' ? 'green' : run.status === 'failed' ? 'red' : 'purple'}>{run.status}</StatusBadge></td>
                                        <td className="px-5 py-4">{run.leadsFound}</td>
                                        <td className="px-5 py-4 text-slate-500">{new Date(run.createdAt).toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    );
}
