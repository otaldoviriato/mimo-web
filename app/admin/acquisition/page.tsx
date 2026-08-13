'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Compass, ExternalLink, Loader2, RefreshCw, Share2, TrendingUp, Users, type LucideIcon } from 'lucide-react';

type OriginStat = { origin: string; relationships: number; uniqueClients: number; uniqueProfessionals: number; gmvCents: number; paidEvents: number };
type RetentionStat = { origin: string; d7Eligible: number; d7Retained: number; d30Eligible: number; d30Retained: number };
type Relationship = {
    relationshipKey: string;
    origin: string;
    firstPaidAt: string;
    lastPaidAt: string;
    firstPaidSource: string;
    professionalPosition?: 1 | 2;
    gmvCents: number;
    paidEventsCount: number;
    d7RetainedAt?: string;
    d30RetainedAt?: string;
    clientName?: string;
    clientUsername?: string;
    professionalName?: string;
    professionalUsername?: string;
};
type Metrics = {
    generatedAt: string;
    coverageStartsAt: string | null;
    range: { days: number; startDate: string; endDate: string };
    funnel: Record<string, number>;
    totals: { relationships: number; gmvCents: number; paidEvents: number };
    originStats: OriginStat[];
    retentionStats: RetentionStat[];
    relationships: Relationship[];
    definitions: { origin: string; gmv: string; d7: string; d30: string };
};

const ORIGIN_LABELS: Record<string, string> = {
    profile_share: 'Link da profissional',
    explore: 'Explorar',
    first_paid_message: '1ª mensagem paga',
    direct: 'Direto / não atribuído',
    unknown: 'Desconhecido',
};

const FUNNEL_STEPS = [
    ['linkShared', 'Links compartilhados'],
    ['linkViewed', 'Links visualizados'],
    ['signupAttributed', 'Cadastros atribuídos'],
    ['firstRecharge', 'Primeiras recargas'],
    ['firstPaidRelationship', '1ª relação paga'],
] as const;

const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const rate = (value: number, total: number) => total ? `${((value / total) * 100).toFixed(1)}%` : '—';
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

function retentionLabel(item: Relationship, days: 7 | 30, generatedAt: string) {
    const retainedAt = days === 7 ? item.d7RetainedAt : item.d30RetainedAt;
    if (retainedAt) return { label: `D${days} ✓`, className: 'font-bold text-emerald-700' };
    const eligibleAt = new Date(item.firstPaidAt).getTime() + days * 24 * 60 * 60 * 1000;
    if (new Date(generatedAt).getTime() < eligibleAt) return { label: `D${days} pendente`, className: 'text-amber-600' };
    return { label: `D${days} —`, className: 'text-slate-400' };
}

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: LucideIcon }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <span className="rounded-xl bg-purple-50 p-2 text-purple-600"><Icon size={17} /></span>
            </div>
            <p className="text-2xl font-black tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">{helper}</p>
        </div>
    );
}

export default function AcquisitionMetricsPage() {
    const [days, setDays] = useState(30);
    const [data, setData] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        fetch(`/api/admin/acquisition-metrics?days=${days}`, { signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) throw new Error('Não foi possível carregar as métricas.');
                const metrics = await response.json();
                if (active) setData(metrics);
            })
            .catch((reason) => {
                if (active && reason?.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Erro inesperado.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
            controller.abort();
        };
    }, [days, refreshKey]);

    const selectDays = (option: number) => {
        setLoading(true);
        setError('');
        if (option === days) setRefreshKey((current) => current + 1);
        else setDays(option);
    };

    const refresh = () => {
        setLoading(true);
        setError('');
        setRefreshKey((current) => current + 1);
    };

    const retentionByOrigin = useMemo(() => new Map(data?.retentionStats.map((item) => [item.origin, item]) || []), [data]);

    if (loading && !data) {
        return <div className="flex min-h-[50vh] items-center justify-center text-purple-600"><Loader2 className="animate-spin" size={28} /></div>;
    }

    if (error && !data) {
        return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">{error}</div>;
    }

    if (!data) return null;
    const secondProfessionalRate = rate(data.funnel.secondProfessional, data.funnel.firstProfessional);

    return (
        <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">Aquisição e liquidez</p>
                    <h1 className="text-2xl font-black tracking-tight">Do link à relação pagante</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Acompanhe atribuição, expansão pelo Explorar, GMV e retorno de cada relação cliente–profissional.</p>
                </div>
                <div className="flex items-center gap-2">
                    {[30, 90, 180].map((option) => (
                        <button type="button" key={option} aria-pressed={days === option} onClick={() => selectDays(option)} className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${days === option ? 'bg-purple-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}>{option} dias</button>
                    ))}
                    <button type="button" onClick={refresh} aria-label="Atualizar" className="rounded-xl bg-white/10 p-2 text-slate-300 hover:bg-white/15"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
                </div>
            </section>

            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">{error}</p> : null}

            {data.coverageStartsAt && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">Cobertura da nova instrumentação desde {date(data.coverageStartsAt)}. Dados anteriores exigem backfill e não incluem visitas ou compartilhamentos históricos.</p>
            )}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="GMV atribuído" value={money(data.totals.gmvCents)} helper={`${data.totals.paidEvents} eventos pagos`} icon={TrendingUp} />
                <MetricCard label="Relações pagantes" value={String(data.totals.relationships)} helper="cliente × profissional" icon={Users} />
                <MetricCard label="Perfis vistos no Explorar" value={String(data.funnel.exploreProfileViewed)} helper="visitantes únicos por perfil/dia" icon={Compass} />
                <MetricCard label="Expansão para 2ª profissional" value={secondProfessionalRate} helper={`${data.funnel.secondProfessional} de ${data.funnel.firstProfessional} clientes`} icon={ExternalLink} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-2"><Share2 size={18} className="text-purple-600" /><h2 className="font-black text-slate-900">Funil do link próprio</h2></div>
                <div className="grid gap-3 md:grid-cols-5">
                    {FUNNEL_STEPS.map(([key, label], index) => (
                        <div key={key} className="relative rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <p className="text-2xl font-black text-slate-900">{data.funnel[key] || 0}</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">{label}</p>
                            {index < FUNNEL_STEPS.length - 1 && <ArrowRight className="absolute -right-5 top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 md:block" size={18} />}
                        </div>
                    ))}
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5"><h2 className="font-black text-slate-900">GMV e retenção por origem</h2><p className="mt-1 text-xs text-slate-500">A origem é congelada na primeira transação da relação.</p></div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Origem</th><th className="px-4 py-3">Relações</th><th className="px-4 py-3">Clientes</th><th className="px-4 py-3">GMV</th><th className="px-4 py-3">D7</th><th className="px-5 py-3">D30</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.originStats.map((origin) => {
                                const retention = retentionByOrigin.get(origin.origin);
                                return <tr key={origin.origin} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-bold text-slate-800">{ORIGIN_LABELS[origin.origin] || origin.origin}</td><td className="px-4 py-4 font-semibold">{origin.relationships}</td><td className="px-4 py-4">{origin.uniqueClients}</td><td className="px-4 py-4 font-black text-emerald-700">{money(origin.gmvCents)}</td><td className="px-4 py-4"><span className="font-bold">{rate(retention?.d7Retained || 0, retention?.d7Eligible || 0)}</span><span className="ml-1 text-slate-400">({retention?.d7Retained || 0}/{retention?.d7Eligible || 0})</span></td><td className="px-5 py-4"><span className="font-bold">{rate(retention?.d30Retained || 0, retention?.d30Eligible || 0)}</span><span className="ml-1 text-slate-400">({retention?.d30Retained || 0}/{retention?.d30Eligible || 0})</span></td></tr>;
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5"><h2 className="font-black text-slate-900">Relações recentes</h2><p className="mt-1 text-xs text-slate-500">Até 100 relações iniciadas no período selecionado.</p></div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Cliente</th><th className="px-4 py-3">Profissional</th><th className="px-4 py-3">Origem</th><th className="px-4 py-3">Ordem</th><th className="px-4 py-3">Primeiro pagamento</th><th className="px-4 py-3">Último pagamento</th><th className="px-4 py-3">GMV</th><th className="px-5 py-3">Retenção</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.relationships.map((item) => {
                                const d7 = retentionLabel(item, 7, data.generatedAt);
                                const d30 = retentionLabel(item, 30, data.generatedAt);
                                return <tr key={item.relationshipKey} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-bold text-slate-800">{item.clientName || item.clientUsername || 'Cliente'}</p><p className="text-[10px] text-slate-400">@{item.clientUsername || '—'}</p></td><td className="px-4 py-4"><p className="font-bold text-slate-800">{item.professionalName || item.professionalUsername || 'Profissional'}</p><p className="text-[10px] text-slate-400">@{item.professionalUsername || '—'}</p></td><td className="px-4 py-4 font-semibold text-purple-700">{ORIGIN_LABELS[item.origin] || item.origin}</td><td className="px-4 py-4">{item.professionalPosition ? `${item.professionalPosition}ª` : '3ª+'}</td><td className="px-4 py-4">{date(item.firstPaidAt)}</td><td className="px-4 py-4">{date(item.lastPaidAt)}</td><td className="px-4 py-4 font-black text-emerald-700">{money(item.gmvCents)}</td><td className="px-5 py-4"><span className={d7.className}>{d7.label}</span><span className={`ml-3 ${d30.className}`}>{d30.label}</span></td></tr>;
                            })}
                            {!data.relationships.length && <tr><td colSpan={8} className="px-5 py-12 text-center font-semibold text-slate-400">Nenhuma relação instrumentada neste período.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="grid gap-3 text-xs text-slate-600 md:grid-cols-2">
                <p className="rounded-xl border border-slate-200 bg-white p-4"><strong className="text-slate-800">D7:</strong> {data.definitions.d7}</p>
                <p className="rounded-xl border border-slate-200 bg-white p-4"><strong className="text-slate-800">D30:</strong> {data.definitions.d30}</p>
            </section>
        </div>
    );
}
