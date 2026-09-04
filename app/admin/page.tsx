'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Coins, MessageCircle, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { useAdminContext } from '@/context/AdminSettingsContext';

const TAB_MAPPINGS: Record<string, string> = {
    clients: '/admin/clients', professionals: '/admin/professionals', rooms: '/admin/rooms',
    financial: '/admin/financial', 'settings-pricing': '/admin/settings/pricing',
};

function money(cents?: number) {
    return ((cents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function relativeTime(value?: string) {
    if (!value) return '-';
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
    if (minutes < 2) return 'Agora';
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours}h`;
    return `Há ${Math.floor(hours / 24)} dias`;
}

export default function AdminDashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { dashboardData, loadingDashboard, fetchDashboard } = useAdminContext();
    const [query, setQuery] = useState('');
    const [onlyActive, setOnlyActive] = useState(false);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && TAB_MAPPINGS[tab]) router.replace(TAB_MAPPINGS[tab]);
    }, [router, searchParams]);

    const metrics = dashboardData?.marketplaceMetrics ?? {};
    const conversations = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return (dashboardData?.recentPaidConversations ?? []).filter((item: any) => {
            if (onlyActive && !item.isActiveNow) return false;
            if (!normalized) return true;
            return [item.professional?.name, item.professional?.username, item.client?.name, item.roomId]
                .some(value => String(value ?? '').toLowerCase().includes(normalized));
        });
    }, [dashboardData, onlyActive, query]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
                        <MessageCircle className="text-purple-600" size={24} /> Operação do marketplace
                    </h1>
                    <p className="mt-1 text-xs font-medium text-slate-500">Conversas pagas, repasses imediatos e atividade em tempo real.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchDashboard} disabled={loadingDashboard} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">
                        <RefreshCw size={14} className={loadingDashboard ? 'animate-spin' : ''} /> Atualizar
                    </button>
                    <Link href="/admin/campaigns" className="rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700">Campanhas</Link>
                </div>
            </div>

            {metrics.pendingModerationCount > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <AlertTriangle size={20} />
                    <p className="text-sm font-bold">{metrics.pendingModerationCount} conversa(s) aguardando revisão manual. A sinalização não altera saldos.</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Conversas pagas" value={loadingDashboard ? '...' : metrics.paidConversations ?? 0} change={`${metrics.activeNow ?? 0} ativas agora`} isPositive icon={Users} color="purple" />
                <StatsCard title="Mensagens pagas" value={loadingDashboard ? '...' : metrics.paidMessages ?? 0} icon={MessageCircle} color="green" />
                <StatsCard title="Volume cobrado" value={loadingDashboard ? '...' : money(metrics.grossRevenueCents)} change={`Repasse: ${money(metrics.professionalPayoutCents)}`} isPositive icon={Coins} color="blue" />
                <StatsCard title="Margem do Mimo" value={loadingDashboard ? '...' : money(metrics.platformMarginCents)} icon={ShieldCheck} color="amber" />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900">Conversas com movimentação financeira</h2>
                        <p className="text-xs text-slate-500">Ordenadas pela atividade mais recente; “ativa” significa atividade nos últimos 15 minutos.</p>
                    </div>
                    <div className="flex gap-2">
                        <label className="relative flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                            <input type="checkbox" checked={onlyActive} onChange={event => setOnlyActive(event.target.checked)} /> Só ativas
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar conversa..." className="rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs" />
                        </div>
                    </div>
                </div>

                {loadingDashboard ? (
                    <div className="p-16 text-center text-sm text-slate-500">Carregando...</div>
                ) : conversations.length === 0 ? (
                    <div className="p-16 text-center text-sm text-slate-500">Nenhuma conversa paga encontrada.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                <tr><th className="px-5 py-3">Profissional</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Atividade</th><th className="px-5 py-3">Mensagens</th><th className="px-5 py-3">Cobrado</th><th className="px-5 py-3">Repasse</th><th className="px-5 py-3">Margem</th><th className="px-5 py-3">Revisão</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {conversations.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-5 py-3 font-bold text-slate-900">{item.professional?.name ?? 'Profissional'}<span className="block text-[10px] font-medium text-slate-400">@{item.professional?.username ?? '-'}</span></td>
                                        <td className="px-5 py-3 font-semibold text-slate-700">{item.client?.name ?? 'Cliente'}</td>
                                        <td className="px-5 py-3"><span className={item.isActiveNow ? 'font-bold text-emerald-600' : 'text-slate-500'}>{item.isActiveNow ? 'Agora' : relativeTime(item.lastActivityAt)}</span></td>
                                        <td className="px-5 py-3 text-slate-700">{item.messageCount} ({item.paidMessages} pagas)</td>
                                        <td className="px-5 py-3 font-bold">{money(item.grossChargedCents)}</td>
                                        <td className="px-5 py-3 font-bold text-emerald-700">{money(item.payoutCents)}</td>
                                        <td className="px-5 py-3 font-bold text-purple-700">{money(item.marginCents)}</td>
                                        <td className="px-5 py-3">{item.moderation ? <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800">Pendente</span> : <span className="text-slate-400">—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {(dashboardData?.campaignPerformance?.length ?? 0) > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="font-bold text-slate-900">Campanhas recentes</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {dashboardData.campaignPerformance.map((row: any) => (
                            <div key={row.campaign?._id ?? row.campaign?.slug} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <p className="text-sm font-bold">{row.campaign?.name ?? 'Campanha removida'}</p>
                                <p className="mt-1 text-xs text-slate-500">{row.visits} visitas · {row.ctaClicks} cliques · {row.signups} cadastros · {row.recharges} recargas · {row.paidChatStarts} chats pagos</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
