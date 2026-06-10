'use client';

import { ContactRound, HeartHandshake, MessageCircleOff, Sparkles, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState, LoadingState, PageIntro, Panel, StatusBadge } from '@/components/marketing/MarketingUI';
import { marketingFetch } from '@/lib/marketing/client';

type CompatibilityLevel = 'excellent' | 'very_promising' | 'promising' | 'low_fit' | 'incompatible';

interface DashboardData {
    metrics: {
        total: number;
        notContacted: number;
        noReply: number;
        interested: number;
        notInterested: number;
        becameUser: number;
    };
    compatibilityCounts: Record<CompatibilityLevel, number>;
    topPending: Array<{
        _id: string;
        username: string;
        displayName: string;
        aiCompatibility: CompatibilityLevel;
    }>;
}

const compatibilityLabels: Record<CompatibilityLevel, string> = {
    excellent: 'Excelente',
    very_promising: 'Muito promissor',
    promising: 'Promissor',
    low_fit: 'Pouco compatível',
    incompatible: 'Incompatível',
};

const cards = [
    { key: 'total', label: 'Total de leads', icon: UsersRound, color: 'text-purple-600 bg-purple-50' },
    { key: 'notContacted', label: 'Ainda não falamos', icon: UserPlus, color: 'text-blue-600 bg-blue-50' },
    { key: 'noReply', label: 'Sem resposta', icon: MessageCircleOff, color: 'text-indigo-600 bg-indigo-50' },
    { key: 'interested', label: 'Com interesse', icon: HeartHandshake, color: 'text-emerald-600 bg-emerald-50' },
    { key: 'notInterested', label: 'Sem interesse', icon: ContactRound, color: 'text-rose-600 bg-rose-50' },
    { key: 'becameUser', label: 'Viraram usuárias', icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
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
            <PageIntro title="Visão geral da prospecção" description="Acompanhe a qualidade dos perfis e o resultado dos contatos." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {cards.map(card => {
                    const Icon = card.icon;
                    return (
                        <Panel key={card.key} className="p-4">
                            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}><Icon className="h-5 w-5" /></div>
                            <p className="text-2xl font-black">{data.metrics[card.key]}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{card.label}</p>
                        </Panel>
                    );
                })}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
                <Panel className="p-6">
                    <h3 className="font-black">Compatibilidade dos leads</h3>
                    <div className="mt-5 space-y-3">
                        {(Object.keys(compatibilityLabels) as CompatibilityLevel[]).map(level => (
                            <div key={level} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                <span className="text-sm font-bold text-slate-600">{compatibilityLabels[level]}</span>
                                <strong className="text-lg text-purple-700">{data.compatibilityCounts[level] || 0}</strong>
                            </div>
                        ))}
                    </div>
                </Panel>
                <Panel>
                    <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-black">Melhores leads ainda não contatadas</h3></div>
                    {data.topPending.length === 0 ? (
                        <EmptyState title="Nenhuma lead pendente" description="As leads qualificadas aparecerão aqui." />
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {data.topPending.map(lead => (
                                <a key={lead._id} href={`/marketing/leads?lead=${lead._id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-purple-50/50">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 font-black text-purple-700">{lead.username.slice(0, 1).toUpperCase()}</div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black">@{lead.username}</p>
                                        <p className="truncate text-xs text-slate-500">{lead.displayName || 'Sem nome público'}</p>
                                    </div>
                                    <StatusBadge tone={lead.aiCompatibility === 'excellent' || lead.aiCompatibility === 'very_promising' ? 'green' : 'amber'}>
                                        {compatibilityLabels[lead.aiCompatibility]}
                                    </StatusBadge>
                                </a>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>
        </div>
    );
}
