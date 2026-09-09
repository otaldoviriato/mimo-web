'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Megaphone,
    Filter,
    MousePointer,
    UserPlus,
    CreditCard,
    DollarSign,
    TrendingUp,
    Plus,
    Search,
    Copy,
    Check,
    ExternalLink,
    Globe,
    ChevronDown,
    ChevronUp,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

type CampaignRow = {
    _id: string;
    name: string;
    slug: string;
    status: 'draft' | 'active' | 'paused' | 'archived';
    network: 'exoclick' | 'direct' | 'other';
    visits: number;
    ctaClicks: number;
    signups: number;
    recharges: number;
    paidChatStarts: number;
    rechargeRevenueCents: number;
    ctaRate: number;
    signupRate: number;
    rechargeRate: number;
    createdAt?: string;
};

type SummaryData = {
    totalCampaigns: number;
    activeCampaigns: number;
    totalVisits: number;
    totalCtaClicks: number;
    totalSignups: number;
    totalRecharges: number;
    totalRevenueCents: number;
    overallConversionRate: number;
};

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [networkFilter, setNetworkFilter] = useState('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: '',
        slug: '',
        network: 'exoclick',
        landingHeadline: '',
        landingBody: '',
        targetProfessionalId: ''
    });

    const load = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/campaigns');
            const data = await response.json();
            if (response.ok) {
                setCampaigns(data.campaigns ?? []);
                setSummary(data.summary ?? null);
            } else {
                toast.error(data.error || 'Erro ao carregar campanhas');
            }
        } catch {
            toast.error('Erro de conexão ao carregar campanhas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const create = async (event: FormEvent) => {
        event.preventDefault();
        try {
            const response = await fetch('/api/admin/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await response.json();
            if (!response.ok) {
                return toast.error(data.error ?? 'Não foi possível criar a campanha.');
            }
            toast.success('Campanha criada com sucesso!');
            setForm({
                name: '',
                slug: '',
                network: 'exoclick',
                landingHeadline: '',
                landingBody: '',
                targetProfessionalId: ''
            });
            setIsCreateOpen(false);
            await load();
        } catch {
            toast.error('Erro ao enviar dados da campanha.');
        }
    };

    const changeStatus = async (id: string, status: string) => {
        try {
            const res = await fetch('/api/admin/campaigns', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (res.ok) {
                toast.success('Status atualizado');
                await load();
            } else {
                toast.error('Não foi possível alterar status');
            }
        } catch {
            toast.error('Erro ao atualizar status');
        }
    };

    const copyTrackingUrl = (slug: string, network: string) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.mimochat.com.br';
        let url = `${origin}/descubra?utm_source=${network}&utm_campaign=${slug}`;
        if (network === 'exoclick') {
            url = `${origin}/descubra?utm_source=exoclick&utm_medium=display&utm_campaign=${slug}&utm_content={variation_id}&zone_id={zone_id}&click_id={conversions_tracking}`;
        }
        navigator.clipboard.writeText(url);
        setCopiedSlug(slug);
        toast.success('URL com parâmetros UTM copiada!');
        setTimeout(() => setCopiedSlug(null), 2500);
    };

    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesNetwork = networkFilter === 'all' || c.network === networkFilter;
        return matchesSearch && matchesNetwork;
    });

    return (
        <div className="space-y-6">
            {/* Header com Ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                            <Megaphone size={18} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Campanhas & Tráfego</h1>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Detecção automática via parâmetros UTM e compilação de resultados de conversão.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void load()}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(!isCreateOpen)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                        <Plus size={16} />
                        Nova Campanha
                        {isCreateOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Cards de Métricas Agregadas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Campanhas</span>
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                            <Megaphone size={14} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-black text-slate-900">{summary?.activeCampaigns ?? 0}</p>
                    <span className="text-[10px] text-slate-500 font-medium">{summary?.totalCampaigns ?? 0} no total</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Visitas / Clicks</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <MousePointer size={14} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-black text-slate-900">{summary?.totalVisits ?? 0}</p>
                    <span className="text-[10px] text-blue-600 font-medium">{summary?.totalCtaClicks ?? 0} no CTA</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cadastros</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <UserPlus size={14} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-black text-slate-900">{summary?.totalSignups ?? 0}</p>
                    <span className="text-[10px] text-emerald-600 font-medium">
                        {summary?.totalVisits ? ((summary.totalSignups / summary.totalVisits) * 100).toFixed(1) : 0}% conv.
                    </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">1ª Recarga</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <CreditCard size={14} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-black text-slate-900">{summary?.totalRecharges ?? 0}</p>
                    <span className="text-[10px] text-purple-600 font-medium">Conversões pagas</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Faturamento</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <DollarSign size={14} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-black text-slate-900">
                        {((summary?.totalRevenueCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <span className="text-[10px] text-amber-700 font-medium">1ª recarga de leads</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Taxa Geral</span>
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                            <TrendingUp size={14} />
                        </div>
                    </div>
                    <p className="mt-2 text-xl font-black text-slate-900">{summary?.overallConversionRate ?? 0}%</p>
                    <span className="text-[10px] text-slate-500 font-medium">Visita → Recarga</span>
                </div>
            </div>

            {/* Formulário Retrátil para Criação Manual */}
            {isCreateOpen && (
                <form onSubmit={create} className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm space-y-4 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900">Cadastrar Nova Campanha / Landing</h2>
                        <span className="text-[11px] text-slate-500">Ou use UTMs diretamente para auto-criação</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        <input
                            required
                            placeholder="Nome interno (ex: ExoClick Banner 300x250)"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-purple-500"
                        />
                        <input
                            required
                            placeholder="slug-da-campanha"
                            value={form.slug}
                            onChange={e => setForm({ ...form, slug: e.target.value })}
                            className="rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-purple-500 font-mono"
                        />
                        <select
                            value={form.network}
                            onChange={e => setForm({ ...form, network: e.target.value as any })}
                            className="rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-purple-500"
                        >
                            <option value="exoclick">ExoClick</option>
                            <option value="direct">Direto / Orgânico</option>
                            <option value="other">Outra Rede (Google/Meta/etc)</option>
                        </select>
                        <input
                            required
                            placeholder="Título da landing page"
                            value={form.landingHeadline}
                            onChange={e => setForm({ ...form, landingHeadline: e.target.value })}
                            className="rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-purple-500 sm:col-span-2"
                        />
                        <input
                            placeholder="Clerk ID da criadora alvo (opcional)"
                            value={form.targetProfessionalId}
                            onChange={e => setForm({ ...form, targetProfessionalId: e.target.value })}
                            className="rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-purple-500"
                        />
                        <textarea
                            required
                            placeholder="Texto descritivo / chamada da landing"
                            value={form.landingBody}
                            onChange={e => setForm({ ...form, landingBody: e.target.value })}
                            className="rounded-xl border border-slate-200 p-2.5 text-xs focus:outline-none focus:border-purple-500 sm:col-span-2 md:col-span-3 h-20"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
                        >
                            Salvar Campanha
                        </button>
                    </div>
                </form>
            )}

            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative w-full sm:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou slug..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Filter size={13} />
                        <span>Rede:</span>
                    </div>
                    <select
                        value={networkFilter}
                        onChange={e => setNetworkFilter(e.target.value)}
                        className="text-xs rounded-xl border border-slate-200 px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-purple-500"
                    >
                        <option value="all">Todas as origens</option>
                        <option value="exoclick">ExoClick</option>
                        <option value="direct">Orgânico / Direto</option>
                        <option value="other">Outros UTMs</option>
                    </select>
                </div>
            </div>

            {/* Tabela de Campanhas */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="p-3.5 pl-5">Campanha & Origem</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 text-center">Visitas</th>
                                <th className="p-3.5 text-center">CTA Clicks</th>
                                <th className="p-3.5 text-center">Cadastros</th>
                                <th className="p-3.5 text-center">1ª Recarga</th>
                                <th className="p-3.5 text-right">Receita</th>
                                <th className="p-3.5 text-center pr-5">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw size={14} className="animate-spin text-purple-600" />
                                            <span>Carregando campanhas...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-10 text-center text-slate-500">
                                        <Globe size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="font-semibold text-slate-700">Nenhuma campanha encontrada</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Tráfego com parâmetros UTM será detectado e listado automaticamente aqui.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map(camp => {
                                    const isExoclick = camp.network === 'exoclick';
                                    const isOrganic = camp.slug === 'organico' || camp.network === 'direct';

                                    return (
                                        <tr key={camp._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3.5 pl-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900">{camp.name}</span>
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                                                            isExoclick
                                                                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                                                : isOrganic
                                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        }`}>
                                                            {camp.network}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <code className="text-[10px] text-slate-400 font-mono">slug: {camp.slug}</code>
                                                        <button
                                                            onClick={() => copyTrackingUrl(camp.slug, camp.network)}
                                                            className="inline-flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 font-medium"
                                                            title="Copiar link de rastreamento com UTMs"
                                                        >
                                                            {copiedSlug === camp.slug ? (
                                                                <>
                                                                    <Check size={11} className="text-emerald-600" />
                                                                    <span className="text-emerald-600">Copiado!</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy size={11} />
                                                                    <span>Copiar URL UTM</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-3.5">
                                                <select
                                                    value={camp.status}
                                                    onChange={e => void changeStatus(camp._id, e.target.value)}
                                                    className={`text-[11px] font-bold rounded-lg border px-2 py-1 focus:outline-none ${
                                                        camp.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : camp.status === 'paused'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : camp.status === 'archived'
                                                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                                    }`}
                                                >
                                                    <option value="active">Ativa</option>
                                                    <option value="paused">Pausada</option>
                                                    <option value="draft">Rascunho</option>
                                                    <option value="archived">Arquivada</option>
                                                </select>
                                            </td>

                                            <td className="p-3.5 text-center font-bold text-slate-800">
                                                {camp.visits}
                                            </td>

                                            <td className="p-3.5 text-center">
                                                <div className="font-bold text-slate-800">{camp.ctaClicks}</div>
                                                <div className="text-[10px] text-slate-400">{camp.ctaRate}% CTR</div>
                                            </td>

                                            <td className="p-3.5 text-center">
                                                <div className="font-bold text-emerald-700">{camp.signups}</div>
                                                <div className="text-[10px] text-slate-400">{camp.signupRate}% conv.</div>
                                            </td>

                                            <td className="p-3.5 text-center">
                                                <div className="font-bold text-purple-700">{camp.recharges}</div>
                                                <div className="text-[10px] text-slate-400">{camp.rechargeRate}% conv.</div>
                                            </td>

                                            <td className="p-3.5 text-right font-bold text-slate-900">
                                                {((camp.rechargeRevenueCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>

                                            <td className="p-3.5 text-center pr-5">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Link
                                                        href={`/admin/funnel?campaignId=${camp._id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold transition-colors border border-purple-200/80 shadow-2xs"
                                                    >
                                                        <Filter size={12} />
                                                        Ver Funil
                                                    </Link>
                                                    <a
                                                        href={`/descubra?utm_source=${camp.network}&utm_campaign=${camp.slug}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                                        title="Abrir destino"
                                                    >
                                                        <ExternalLink size={13} />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
