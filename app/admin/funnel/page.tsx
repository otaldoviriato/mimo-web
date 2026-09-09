'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Filter,
    TrendingUp,
    Users,
    MousePointer,
    UserPlus,
    Compass,
    Send,
    MessageSquare,
    CreditCard,
    Calendar,
    Search,
    RefreshCw,
    CheckCircle2,
    Clock,
    ArrowRight,
    ExternalLink,
    ChevronRight,
    HelpCircle,
    Globe,
    DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

type FunnelStep = {
    id: number;
    label: string;
    key: string;
    count: number;
    topConversionRate: number;
    stepConversionRate: number;
    dropoffCount: number;
    dropoffRate: number;
};

type ClientRow = {
    visitorId: string;
    userId: string | null;
    user: {
        clerkId: string;
        name?: string;
        username?: string;
        photoUrl?: string;
        email?: string;
        createdAt?: string;
    } | null;
    campaign: {
        _id: string;
        name: string;
        slug: string;
        network: string;
    };
    utm: Record<string, string>;
    clickId: string | null;
    stagesCompleted: number;
    progressPercentage: number;
    stages: {
        stage1_landing: { reached: boolean; at?: string };
        stage2_cta: { reached: boolean; at?: string };
        stage3_signup: { reached: boolean; at?: string };
        stage4_profileView: {
            reached: boolean;
            at?: string;
            professional?: {
                clerkId: string;
                name?: string;
                username?: string;
                photoUrl?: string;
            } | null;
        };
        stage5_messageSent: { reached: boolean; at?: string };
        stage6_messageReceived: { reached: boolean; at?: string };
        stage7_firstRecharge: { reached: boolean; at?: string; amountCents?: number };
    };
    createdAt: string;
};

type FunnelData = {
    campaigns: Array<{ _id: string; name: string; slug: string; network: string }>;
    summary: {
        totalLeads: number;
        totalRevenueCents: number;
        overallConversionRate: number;
        steps: FunnelStep[];
    };
    clients: ClientRow[];
};

export default function AdminFunnelPage() {
    const searchParams = useSearchParams();
    const initialCampaign = searchParams.get('campaignId') || 'all';

    const [selectedCampaign, setSelectedCampaign] = useState<string>(initialCampaign);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [data, setData] = useState<FunnelData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
    const [clientSearch, setClientSearch] = useState('');

    const loadFunnel = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCampaign && selectedCampaign !== 'all') {
                params.set('campaignId', selectedCampaign);
            }
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);

            const res = await fetch(`/api/admin/funnel?${params.toString()}`);
            const json = await res.json();
            if (res.ok) {
                setData(json);
            } else {
                toast.error(json.error || 'Erro ao carregar dados do funil');
            }
        } catch {
            toast.error('Erro de conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadFunnel();
    }, [selectedCampaign, startDate, endDate]);

    // Presets de data
    const applyDatePreset = (preset: 'today' | '7d' | '30d' | 'all') => {
        const now = new Date();
        if (preset === 'all') {
            setStartDate('');
            setEndDate('');
            return;
        }
        if (preset === 'today') {
            const str = now.toISOString().slice(0, 10);
            setStartDate(str);
            setEndDate(str);
            return;
        }
        if (preset === '7d') {
            const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            setStartDate(past.toISOString().slice(0, 10));
            setEndDate(now.toISOString().slice(0, 10));
            return;
        }
        if (preset === '30d') {
            const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            setStartDate(past.toISOString().slice(0, 10));
            setEndDate(now.toISOString().slice(0, 10));
            return;
        }
    };

    // Filtro de busca na lista de clientes
    const filteredClients = useMemo(() => {
        if (!data?.clients) return [];
        if (!clientSearch.trim()) return data.clients;
        const q = clientSearch.toLowerCase();
        return data.clients.filter(c => {
            const name = c.user?.name?.toLowerCase() || '';
            const username = c.user?.username?.toLowerCase() || '';
            const email = c.user?.email?.toLowerCase() || '';
            const visitor = c.visitorId.toLowerCase();
            const camp = c.campaign.name.toLowerCase();
            return name.includes(q) || username.includes(q) || email.includes(q) || visitor.includes(q) || camp.includes(q);
        });
    }, [data?.clients, clientSearch]);

    const steps = data?.summary?.steps || [];
    const maxCount = steps.length > 0 ? Math.max(...steps.map(s => s.count), 1) : 1;

    const stepIcons = [
        Globe,           // 1. Landing
        MousePointer,    // 2. CTA
        UserPlus,        // 3. Signup
        Compass,         // 4. Explorar perfil
        Send,            // 5. Enviou mensagem
        MessageSquare,   // 6. Recebeu mensagem
        CreditCard       // 7. Primeira recarga
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                            <Filter size={18} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Funil de Conversão</h1>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Acompanhe em 7 etapas a jornada completa dos leads desde o primeiro clique até a recarga.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/campaigns"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
                    >
                        Ver Campanhas
                        <ArrowRight size={13} />
                    </Link>
                    <button
                        onClick={() => void loadFunnel()}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Filtro por Campanha */}
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <span className="text-xs font-bold text-slate-500 shrink-0">Campanha:</span>
                        <select
                            value={selectedCampaign}
                            onChange={e => setSelectedCampaign(e.target.value)}
                            className="w-full lg:w-72 rounded-xl border border-slate-200 p-2 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="all">Todas as campanhas & orgânico</option>
                            {data?.campaigns?.map(camp => (
                                <option key={camp._id} value={camp._id}>
                                    {camp.name} ({camp.network})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro de Datas com Presets */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500">De:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500">Até:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Presets rápidos */}
                        <div className="flex items-center gap-1 ml-auto lg:ml-2">
                            <button
                                onClick={() => applyDatePreset('today')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                            >
                                Hoje
                            </button>
                            <button
                                onClick={() => applyDatePreset('7d')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                            >
                                7 dias
                            </button>
                            <button
                                onClick={() => applyDatePreset('30d')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                            >
                                30 dias
                            </button>
                            <button
                                onClick={() => applyDatePreset('all')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                            >
                                Todo período
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Topo do Funil</span>
                    <p className="mt-1 text-2xl font-black text-slate-900">{data?.summary?.totalLeads ?? 0}</p>
                    <span className="text-[11px] text-slate-400">Total de acessos</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cadastros</span>
                    <p className="mt-1 text-2xl font-black text-emerald-600">
                        {steps[2]?.count ?? 0}
                    </p>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                        {steps[2]?.topConversionRate ?? 0}% de conversão
                    </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Primeiras Recargas</span>
                    <p className="mt-1 text-2xl font-black text-purple-600">
                        {steps[6]?.count ?? 0}
                    </p>
                    <span className="text-[11px] text-purple-600 font-semibold">
                        {data?.summary?.overallConversionRate ?? 0}% conv. geral
                    </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Faturamento (1ª Recarga)</span>
                    <p className="mt-1 text-2xl font-black text-amber-600">
                        {((data?.summary?.totalRevenueCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <span className="text-[11px] text-amber-700 font-semibold">Receita de novos clientes</span>
                </div>
            </div>

            {/* REPRESENTAÇÃO GRÁFICA DO FUNIL (Horizontal: Da esquerda para a direita) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp size={16} className="text-purple-600" />
                            Fluxo Visual do Funil (Horizontal)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Passe o cursor sobre cada etapa para ver quantidade de usuários, retenção e drop-off.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="h-48 flex items-center justify-center text-slate-400">
                        <RefreshCw size={20} className="animate-spin text-purple-600 mr-2" />
                        <span>Calculando etapas do funil...</span>
                    </div>
                ) : steps.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Nenhum dado registrado para este filtro.</div>
                ) : (
                    <div className="space-y-4">
                        {/* Container do gráfico em 7 colunas conectadas */}
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5 relative pt-2">
                            {steps.map((step, idx) => {
                                const Icon = stepIcons[idx] || CheckCircle2;
                                const isHovered = hoveredStepIndex === idx;
                                const heightPercent = Math.max(25, Math.round((step.count / maxCount) * 100));

                                return (
                                    <div
                                        key={step.id}
                                        onMouseEnter={() => setHoveredStepIndex(idx)}
                                        onMouseLeave={() => setHoveredStepIndex(null)}
                                        className={`relative flex flex-col rounded-2xl border transition-all duration-200 cursor-pointer p-3 ${
                                            isHovered
                                                ? 'border-purple-500 bg-purple-50/50 shadow-md scale-[1.02] z-20'
                                                : 'border-slate-200 bg-slate-50/70 hover:border-purple-300'
                                        }`}
                                    >
                                        {/* Cabeçalho da etapa */}
                                        <div className="flex items-center justify-between gap-1 mb-2">
                                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                                {step.id}
                                            </span>
                                            <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                                                <Icon size={12} />
                                            </div>
                                        </div>

                                        <p className="text-[11px] font-extrabold text-slate-800 line-clamp-2 leading-tight h-8">
                                            {step.label}
                                        </p>

                                        {/* Barra de volume afunilada */}
                                        <div className="my-2.5 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-linear-to-r from-purple-500 to-purple-700 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${heightPercent}%` }}
                                            />
                                        </div>

                                        {/* Quantidade e taxa */}
                                        <div className="mt-auto pt-1 flex flex-col">
                                            <span className="text-base font-black text-slate-900">
                                                {step.count.toLocaleString('pt-BR')}
                                            </span>
                                            <span className="text-[10px] font-bold text-purple-700">
                                                {step.topConversionRate}% do total
                                            </span>
                                        </div>

                                        {/* Badge de Transição para a próxima etapa (setinha) */}
                                        {idx < steps.length - 1 && (
                                            <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-white border border-slate-300 items-center justify-center shadow-2xs">
                                                <ChevronRight size={10} className="text-slate-400" />
                                            </div>
                                        )}

                                        {/* TOOLTIP NO HOVER COM DADOS DETALHADOS */}
                                        {isHovered && (
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs z-50 pointer-events-none animate-in fade-in-50 zoom-in-95 duration-150">
                                                <div className="flex items-center gap-1.5 font-bold border-b border-slate-800 pb-1.5 mb-1.5 text-purple-300">
                                                    <Icon size={13} />
                                                    <span>Etapa {step.id}: {step.label}</span>
                                                </div>
                                                <div className="space-y-1 text-[11px]">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Total de Leads:</span>
                                                        <span className="font-bold text-white">{step.count}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Conversão do Topo:</span>
                                                        <span className="font-bold text-emerald-400">{step.topConversionRate}%</span>
                                                    </div>
                                                    {idx > 0 && (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">Retenção da Etapa Anterior:</span>
                                                                <span className="font-bold text-purple-300">{step.stepConversionRate}%</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-400">Drop-off (Perda):</span>
                                                                <span className="font-bold text-rose-400">-{step.dropoffCount} ({step.dropoffRate}%)</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-slate-900" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* LISTA DE CLIENTES & PROGRESSO DO FUNIL (Mais recentes em primeiro) */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-3 p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Users size={16} className="text-purple-600" />
                            Clientes & Leads no Funil ({filteredClients.length})
                        </h2>
                        <p className="text-xs text-slate-500">
                            Ordenados pelos mais recentes primeiro. Acompanhe a barra de progresso individual de 0% a 100%.
                        </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente, username, email..."
                            value={clientSearch}
                            onChange={e => setClientSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                {/* Tabela de Clientes */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                            <tr>
                                <th className="p-3 pl-4">Lead / Cliente</th>
                                <th className="p-3">Campanha</th>
                                <th className="p-3">Data de Entrada</th>
                                <th className="p-3 text-center">Progresso</th>
                                <th className="p-3 pr-4">Etapas Concluídas (1 a 7)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw size={14} className="animate-spin text-purple-600" />
                                            <span>Carregando clientes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        Nenhum lead encontrado com os filtros atuais.
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map(client => {
                                    const dateStr = client.createdAt ? new Date(client.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Recente';
                                    const user = client.user;
                                    const stages = client.stages;

                                    return (
                                        <tr key={client.visitorId} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Identificação do Cliente */}
                                            <td className="p-3 pl-4">
                                                <div className="flex items-center gap-3">
                                                    {user?.photoUrl ? (
                                                        <img
                                                            src={user.photoUrl}
                                                            alt={user.name || 'User'}
                                                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                                                            {(user?.name || user?.username || 'L')[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-900">
                                                                {user?.name || user?.username || 'Visitante Anônimo'}
                                                            </span>
                                                            {user && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                                                    Cadastrado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {user?.username ? `@${user.username}` : `ID: ${client.visitorId.slice(0, 10)}...`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Campanha */}
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 text-[11px]">
                                                        {client.campaign.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                                                        {client.campaign.network}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Data */}
                                            <td className="p-3 text-slate-600 font-medium">
                                                {dateStr}
                                            </td>

                                            {/* Progresso do Funil (%) */}
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center gap-1 w-28 mx-auto">
                                                    <div className="flex items-center justify-between w-full text-[11px]">
                                                        <span className="font-extrabold text-slate-900">{client.progressPercentage}%</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{client.stagesCompleted}/7</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${
                                                                client.progressPercentage >= 100
                                                                    ? 'bg-emerald-500'
                                                                    : client.progressPercentage >= 50
                                                                        ? 'bg-purple-600'
                                                                        : 'bg-blue-500'
                                                            }`}
                                                            style={{ width: `${client.progressPercentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Checklist das 7 Etapas */}
                                            <td className="p-3 pr-4">
                                                <div className="flex items-center gap-1.5">
                                                    {/* 1. Landing */}
                                                    <div
                                                        title="1. Acessou a landing page"
                                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                            stages.stage1_landing.reached
                                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        1
                                                    </div>

                                                    {/* 2. CTA */}
                                                    <div
                                                        title="2. Clicou no botão principal (CTA)"
                                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                            stages.stage2_cta.reached
                                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        2
                                                    </div>

                                                    {/* 3. Cadastro */}
                                                    <div
                                                        title="3. Criou uma conta"
                                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                            stages.stage3_signup.reached
                                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        3
                                                    </div>

                                                    {/* 4. Perfil no Explorar */}
                                                    <div
                                                        title={stages.stage4_profileView.reached
                                                            ? `4. Visitou perfil no explorar: ${stages.stage4_profileView.professional?.name || stages.stage4_profileView.professional?.username || 'Perfil'}`
                                                            : '4. Visitou perfil no explorar (pendente)'}
                                                        className={`px-2 h-6 rounded-lg flex items-center gap-1 text-[10px] font-bold ${
                                                            stages.stage4_profileView.reached
                                                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        <span>4</span>
                                                        {stages.stage4_profileView.professional?.username && (
                                                            <span className="font-semibold text-purple-700 truncate max-w-[80px]">
                                                                @{stages.stage4_profileView.professional.username}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* 5. Enviou Mensagem */}
                                                    <div
                                                        title="5. Enviou uma mensagem"
                                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                            stages.stage5_messageSent.reached
                                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        5
                                                    </div>

                                                    {/* 6. Recebeu Mensagem */}
                                                    <div
                                                        title="6. Recebeu uma mensagem"
                                                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                            stages.stage6_messageReceived.reached
                                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        6
                                                    </div>

                                                    {/* 7. Primeira Recarga */}
                                                    <div
                                                        title={stages.stage7_firstRecharge.reached
                                                            ? `7. Realizou primeira recarga: ${((stages.stage7_firstRecharge.amountCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                                            : '7. Primeira recarga (pendente)'}
                                                        className={`px-2 h-6 rounded-lg flex items-center gap-1 text-[10px] font-bold ${
                                                            stages.stage7_firstRecharge.reached
                                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                                : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        <span>7</span>
                                                        {stages.stage7_firstRecharge.reached && stages.stage7_firstRecharge.amountCents ? (
                                                            <span>
                                                                {((stages.stage7_firstRecharge.amountCents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </span>
                                                        ) : null}
                                                    </div>
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
