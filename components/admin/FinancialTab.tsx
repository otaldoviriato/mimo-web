'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, X, AlertCircle, CheckCircle2, Clock, Coins, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface FinancialTabProps {
    dashboardData: any;
    loadingDashboard: boolean;
    handleDeleteTransaction: (id: string, displayId: string) => Promise<void>;
}

export function FinancialTab({ dashboardData, loadingDashboard: parentLoading, handleDeleteTransaction }: FinancialTabProps) {
    // Filtro padrão de depósitos
    const [activeTab, setActiveTab] = useState('recharge');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loadingLocal, setLoadingLocal] = useState(true);

    // Estados para o painel contábil mensal
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const MONTHS = [
        { value: 1, label: 'Janeiro' },
        { value: 2, label: 'Fevereiro' },
        { value: 3, label: 'Março' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Maio' },
        { value: 6, label: 'Junho' },
        { value: 7, label: 'Julho' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Setembro' },
        { value: 10, label: 'Outubro' },
        { value: 11, label: 'Novembro' },
        { value: 12, label: 'Dezembro' }
    ];

    const YEARS = [2026, 2025, 2024];

    // Função para buscar as estatísticas e dados do gráfico
    const fetchStats = useCallback(async (m: number, y: number) => {
        setLoadingStats(true);
        try {
            const res = await fetch(`/api/admin/financial/stats?month=${m}&year=${y}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setChartData(data.chartData || []);
                // Guarda a data de último acesso na primeira consulta
                if (!lastViewedAt) {
                    setLastViewedAt(data.lastViewedAt || '1970-01-01T00:00:00.000Z');
                }
            }
        } catch (err) {
            console.error('Erro ao carregar painel financeiro:', err);
        } finally {
            setLoadingStats(false);
        }
    }, [lastViewedAt]);

    // Função para buscar as transações da API paginada
    const fetchTransactions = useCallback(async (m: number, y: number) => {
        setLoadingLocal(true);
        try {
            const response = await fetch(`/api/admin/transactions?page=${page}&limit=${limit}&type=${activeTab}&month=${m}&year=${y}`);
            if (response.ok) {
                const data = await response.json();
                setTransactions(data.transactions || []);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages || 1);
                    setTotalItems(data.pagination.totalItems || 0);
                }
            } else {
                toast.error('Erro ao carregar movimentações financeiras.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingLocal(false);
        }
    }, [page, limit, activeTab]);

    // Carregar estatísticas e transações ao alterar período
    useEffect(() => {
        fetchStats(selectedMonth, selectedYear);
    }, [fetchStats, selectedMonth, selectedYear]);

    useEffect(() => {
        fetchTransactions(selectedMonth, selectedYear);
    }, [fetchTransactions, selectedMonth, selectedYear, page, activeTab]);

    // Resetar para a primeira página quando o filtro mudar
    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        setPage(1);
    };

    // Handler para deletar transações normais
    const handleDeleteNormal = async (id: string, displayId: string) => {
        await handleDeleteTransaction(id, displayId);
        fetchTransactions(selectedMonth, selectedYear);
        fetchStats(selectedMonth, selectedYear);
    };

    // Handler para rejeitar saques pendentes
    const handleRejectWithdrawal = async (id: string) => {
        if (!window.confirm('Deseja realmente rejeitar este saque? O saldo correspondente será devolvido imediatamente à carteira da profissional.')) return;
        try {
            const response = await fetch(`/api/admin/withdrawals/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
            });
            if (response.ok) {
                toast.success('Saque rejeitado com sucesso. Saldo devolvido para a profissional!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                fetchTransactions(selectedMonth, selectedYear);
                fetchStats(selectedMonth, selectedYear);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao rejeitar saque.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    };

    // Handler para ocultar saques concluídos do histórico da profissional
    const handleHideWithdrawalFromUser = async (id: string) => {
        if (!window.confirm('Deseja ocultar esta transferência do histórico da profissional? Ela continuará visível neste painel de administração.')) return;
        try {
            const response = await fetch(`/api/admin/withdrawals/${id}`, { method: 'DELETE' });
            if (response.ok) {
                toast.success('Transferência ocultada do histórico da usuária.', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                fetchTransactions(selectedMonth, selectedYear);
                fetchStats(selectedMonth, selectedYear);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao ocultar transferência.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    };

    const loading = parentLoading || loadingLocal;

    // --- CÁLCULO DE GRÁFICOS SVG ---
    const width = 600;
    const height = 240;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = useMemo(() => {
        if (chartData.length === 0) return 100;
        const values = chartData.flatMap(d => [d.revenue, d.fee]);
        const max = Math.max(...values);
        return max > 0 ? Math.ceil(max / 100) * 100 : 100;
    }, [chartData]);

    const points = useMemo(() => {
        if (chartData.length === 0) return { revenuePoints: [], feePoints: [] };
        const stepX = chartWidth / (chartData.length - 1);
        
        const revenuePoints = chartData.map((d, i) => {
            const x = paddingLeft + i * stepX;
            const y = paddingTop + chartHeight - (d.revenue / maxVal) * chartHeight;
            return { x, y, val: d.revenue, label: d.label };
        });

        const feePoints = chartData.map((d, i) => {
            const x = paddingLeft + i * stepX;
            const y = paddingTop + chartHeight - (d.fee / maxVal) * chartHeight;
            return { x, y, val: d.fee, label: d.label };
        });

        return { revenuePoints, feePoints };
    }, [chartData, maxVal, chartWidth, chartHeight]);

    const paths = useMemo(() => {
        const { revenuePoints, feePoints } = points;
        if (revenuePoints.length === 0) return { revLine: '', revArea: '', feeLine: '', feeArea: '' };

        const getLinePath = (pts: any[]) => 
            pts.reduce((path, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`, '');

        const getAreaPath = (pts: any[], linePathStr: string) => {
            const startX = pts[0].x;
            const endX = pts[pts.length - 1].x;
            const bottomY = paddingTop + chartHeight;
            return `${linePathStr} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
        };

        const revLine = getLinePath(revenuePoints);
        const revArea = getAreaPath(revenuePoints, revLine);

        const feeLine = getLinePath(feePoints);
        const feeArea = getAreaPath(feePoints, feeLine);

        return { revLine, revArea, feeLine, feeArea };
    }, [points, chartHeight]);

    return (
        <div className="space-y-6 md:space-y-8">
            
            {/* Seletor Contábil Superior */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Painel Financeiro Contábil</h2>
                    <p className="text-xs text-slate-505 font-medium mt-0.5">
                        Gerencie depósitos, saques e taxas de comissão filtrando pelo período contábil.
                    </p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-auto select-none">
                    <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-2 rounded-xl transition-all">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mês:</span>
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => { setSelectedMonth(parseInt(e.target.value, 10)); setPage(1); }} 
                            className="text-xs font-bold bg-transparent focus:outline-none text-slate-700 cursor-pointer pr-1"
                        >
                            {MONTHS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-2 rounded-xl transition-all">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ano:</span>
                        <select 
                            value={selectedYear} 
                            onChange={(e) => { setSelectedYear(parseInt(e.target.value, 10)); setPage(1); }} 
                            className="text-xs font-bold bg-transparent focus:outline-none text-slate-700 cursor-pointer pr-1"
                        >
                            {YEARS.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Seção 1: Indicadores Consolidados (Estilizados no Padrão do BackOffice) */}
            <div className="space-y-6">
                {loadingStats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl h-32" />
                        ))}
                    </div>
                ) : stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Card: Faturamento */}
                        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex items-start justify-between cursor-default group hover:-translate-y-0.5 hover:shadow-purple-500/5">
                            <div className="space-y-3">
                                <span className="text-sm font-bold text-slate-505 tracking-tight block">Faturamento Bruto</span>
                                <span className="text-3xl font-extrabold text-slate-800 tracking-tight block">
                                    {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <p className="text-[10px] text-slate-400 font-medium">Total de depósitos deste mês</p>
                            </div>
                            <div className="p-3 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 bg-purple-50 text-purple-650 border-purple-100">
                                <Coins size={22} className="stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Card: Taxas */}
                        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex items-start justify-between cursor-default group hover:-translate-y-0.5 hover:shadow-emerald-500/5">
                            <div className="space-y-3">
                                <span className="text-sm font-bold text-slate-505 tracking-tight block">Taxas Arrecadadas</span>
                                <span className="text-3xl font-extrabold text-slate-800 tracking-tight block">
                                    {stats.totalPlatformFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <p className="text-[10px] text-emerald-600 font-bold">Comissão retida da plataforma</p>
                            </div>
                            <div className="p-3 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 bg-emerald-50 text-emerald-650 border-emerald-100">
                                <TrendingUp size={22} className="stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Card: Saques Concluídos */}
                        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex items-start justify-between cursor-default group hover:-translate-y-0.5 hover:shadow-blue-500/5">
                            <div className="space-y-3">
                                <span className="text-sm font-bold text-slate-550 tracking-tight block">Saques Concluídos</span>
                                <span className="text-3xl font-extrabold text-slate-800 tracking-tight block">
                                    {stats.totalWithdrawPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <p className="text-[10px] text-slate-400 font-medium">Repassado para profissionais</p>
                            </div>
                            <div className="p-3 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 bg-blue-50 text-blue-650 border-blue-100">
                                <ArrowDownLeft size={22} className="stroke-[2.2]" />
                            </div>
                        </div>

                        {/* Card: Saques Pendentes */}
                        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex items-start justify-between cursor-default group hover:-translate-y-0.5 hover:shadow-amber-500/5">
                            <div className="space-y-3">
                                <span className="text-sm font-bold text-slate-550 tracking-tight block">Saques Pendentes</span>
                                <span className="text-3xl font-extrabold text-slate-800 tracking-tight block">
                                    {stats.totalWithdrawPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                <p className="text-[10px] text-amber-600 font-semibold">Aguardando aprovação no mês</p>
                            </div>
                            <div className="p-3 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 bg-amber-50 text-amber-600 border-amber-100">
                                <ArrowUpRight size={22} className="stroke-[2.2]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Seção 2: Gráfico de Evolução Financeira Diária do Mês */}
            {!loadingStats && chartData.length > 0 && (
                <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                <TrendingUp size={18} className="text-purple-600" />
                                Desempenho Financeiro Diário
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Comparativo entre volume de depósitos e comissões da plataforma ao longo do mês selecionado.
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-[11px] font-bold select-none shrink-0">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                                <span className="text-slate-650">Faturamento Bruto</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span className="text-slate-650">Taxas da Plataforma</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative flex-1 min-h-[220px]">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" style={{ overflow: 'visible' }}>
                            <defs>
                                <linearGradient id="purpleFeeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.15" />
                                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                                </linearGradient>
                                <linearGradient id="emeraldFeeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
                                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                                </linearGradient>
                            </defs>

                            {/* Linhas de Grade e Rótulos Y */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                const y = paddingTop + ratio * chartHeight;
                                const labelValue = maxVal * (1 - ratio);
                                return (
                                    <g key={i} className="opacity-45">
                                        <line
                                            x1={paddingLeft}
                                            y1={y}
                                            x2={width - paddingRight}
                                            y2={y}
                                            stroke="#F1F5F9"
                                            strokeDasharray="4 4"
                                            strokeWidth={1}
                                        />
                                        <text
                                            x={paddingLeft - 12}
                                            y={y + 3.5}
                                            textAnchor="end"
                                            fill="#64748B"
                                            className="text-[9px] font-bold"
                                        >
                                            {labelValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Área e Linha: Faturamento Bruto (Purple) */}
                            <path d={paths.revArea} fill="url(#purpleFeeGradient)" className="transition-all duration-300" />
                            <path
                                d={paths.revLine}
                                fill="none"
                                stroke="#8B5CF6"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-all duration-300"
                            />

                            {/* Área e Linha: Taxas da Plataforma (Emerald) */}
                            <path d={paths.feeArea} fill="url(#emeraldFeeGradient)" className="transition-all duration-300" />
                            <path
                                d={paths.feeLine}
                                fill="none"
                                stroke="#10B981"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-all duration-300"
                            />

                            {/* Rótulos X - Limpos, exibindo apenas datas estratégicas de 5 em 5 dias */}
                            {points.revenuePoints.map((pt, i) => {
                                const dayNum = i + 1;
                                const shouldShowLabel = dayNum === 1 || dayNum % 5 === 0 || dayNum === chartData.length;
                                if (!shouldShowLabel) return null;
                                return (
                                    <text
                                        key={i}
                                        x={pt.x}
                                        y={height - 15}
                                        textAnchor="middle"
                                        fill="#64748B"
                                        className="text-[9px] font-extrabold"
                                    >
                                        {pt.label}
                                    </text>
                                );
                            })}

                            {/* Pontos Visuais de Destaque no Hover */}
                            {hoveredIndex !== null && points.revenuePoints[hoveredIndex] && (
                                <g>
                                    {/* Linha vertical de referência */}
                                    <line
                                        x1={points.revenuePoints[hoveredIndex].x}
                                        y1={paddingTop}
                                        x2={points.revenuePoints[hoveredIndex].x}
                                        y2={paddingTop + chartHeight}
                                        stroke="#E2E8F0"
                                        strokeWidth={1}
                                    />
                                    {/* Ponto Faturamento */}
                                    <circle
                                        cx={points.revenuePoints[hoveredIndex].x}
                                        cy={points.revenuePoints[hoveredIndex].y}
                                        r={4.5}
                                        fill="#8B5CF6"
                                        stroke="#FFFFFF"
                                        strokeWidth={1.5}
                                    />
                                    {/* Ponto Taxas */}
                                    <circle
                                        cx={points.feePoints[hoveredIndex].x}
                                        cy={points.feePoints[hoveredIndex].y}
                                        r={4.5}
                                        fill="#10B981"
                                        stroke="#FFFFFF"
                                        strokeWidth={1.5}
                                    />
                                </g>
                            )}

                            {/* Barras Verticais Invisíveis para melhor experiência de hover */}
                            {chartData.map((_, i) => {
                                const stepX = chartWidth / (chartData.length - 1);
                                const x = paddingLeft + i * stepX;
                                return (
                                    <rect
                                        key={i}
                                        x={x - stepX / 2}
                                        y={paddingTop}
                                        width={stepX}
                                        height={chartHeight}
                                        fill="transparent"
                                        className="cursor-pointer"
                                        onMouseEnter={() => setHoveredIndex(i)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    />
                                );
                            })}
                        </svg>

                        {/* Tooltip Dinâmica HTML */}
                        {hoveredIndex !== null && chartData[hoveredIndex] && (
                            <div
                                className="absolute bg-slate-900 border border-slate-800 text-white text-[11px] font-bold p-3 rounded-2xl shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-150 animate-fade-in"
                                style={{
                                    left: `${(points.revenuePoints[hoveredIndex].x / width) * 100}%`,
                                    top: `${(Math.min(points.revenuePoints[hoveredIndex].y, points.feePoints[hoveredIndex].y) / height) * 100 - 8}%`,
                                }}
                            >
                                <div className="text-[9px] text-slate-400 font-semibold mb-1">
                                    Dia {chartData[hoveredIndex].label}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="font-semibold text-slate-350">Depósitos:</span>
                                        <span className="text-purple-300 font-extrabold">
                                            {chartData[hoveredIndex].revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="font-semibold text-slate-350">Comissão Mimo:</span>
                                        <span className="text-emerald-300 font-extrabold">
                                            {chartData[hoveredIndex].fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Seção 3: Histórico e Listagem Paginada do Mês */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Histórico Financeiro</h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Todas as transações financeiras de recargas, saques, assinaturas, desbloqueios de mídia e mimos ocorridas no período selecionado.
                    </p>
                </div>

                {/* Abas de Filtros (Reorganizadas) */}
                <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-4">
                    {[
                        { id: 'recharge', label: 'Depósitos (Recargas)' },
                        { id: 'withdrawal', label: 'Saques' },
                        { id: 'subscription', label: 'Assinaturas' },
                        { id: 'all', label: 'Todas' },
                        { id: 'image_unlock', label: 'Desbloqueios de Mídia' },
                        { id: 'gift', label: 'Mimos / Cupons' },
                        { id: 'message', label: 'Mensagens (Chat)' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                                activeTab === tab.id
                                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/10'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100/80 active:scale-98'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">ID Transação</th>
                                <th className="py-4 px-6">Remetente → Destinatário</th>
                                <th className="py-4 px-6">Tipo</th>
                                <th className="py-4 px-6">Valor</th>
                                <th className="py-4 px-6">Data/Hora</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-sm font-semibold text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                            <span>Buscando transações reais...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : transactions.length > 0 ? (
                                transactions.map((tx: any) => {
                                    // Verificar se o depósito é novo (criado após o último acesso do admin logado)
                                    const isNew = tx.source === 'recharge' &&
                                        ['Aprovado', 'Pago', 'Crédito'].includes(tx.status) &&
                                        lastViewedAt &&
                                        new Date(tx.timestamp).getTime() > new Date(lastViewedAt).getTime();

                                    return (
                                        <tr 
                                            key={tx.id} 
                                            className={`transition-colors group ${
                                                isNew 
                                                    ? 'bg-emerald-50/40 hover:bg-emerald-100/40 border-l-4 border-l-emerald-500' 
                                                    : 'hover:bg-slate-50/40'
                                            }`}
                                        >
                                            <td className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">
                                                <div className="flex items-center gap-2">
                                                    {tx.displayId || tx.id}
                                                    {isNew && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 animate-pulse border border-emerald-200 select-none">
                                                            Novo
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm font-bold">
                                                <div className="flex flex-col">
                                                    {tx.source === 'recharge' ? (
                                                        <div className="flex items-center gap-1">
                                                            {tx.senderId && tx.senderId !== 'platform' ? (
                                                                <Link href={`/admin/users/${tx.senderId}`} className="text-purple-600 hover:text-purple-800 hover:underline font-extrabold transition-colors">
                                                                    {tx.senderName}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-slate-700 font-extrabold">{tx.senderName}</span>
                                                            )}
                                                        </div>
                                                    ) : tx.source === 'withdrawal' ? (
                                                        <div className="flex items-center gap-1">
                                                            {tx.receiverId && tx.receiverId !== 'platform' ? (
                                                                <Link href={`/admin/users/${tx.receiverId}`} className="text-purple-600 hover:text-purple-800 hover:underline font-extrabold transition-colors">
                                                                    {tx.receiverName}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-slate-700 font-extrabold">{tx.receiverName}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {tx.senderId && tx.senderId !== 'platform' ? (
                                                                <Link href={`/admin/users/${tx.senderId}`} className="text-slate-700 hover:text-purple-600 hover:underline font-extrabold transition-colors">
                                                                    {tx.senderName}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-slate-700 font-extrabold">{tx.senderName}</span>
                                                            )}
                                                            <span className="text-slate-400 font-normal">→</span>
                                                            {tx.receiverId && tx.receiverId !== 'platform' ? (
                                                                <Link href={`/admin/users/${tx.receiverId}`} className="text-purple-600 hover:text-purple-850 hover:underline font-extrabold transition-colors">
                                                                    {tx.receiverName}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-purple-600 font-extrabold">{tx.receiverName}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {tx.isWithdrawRequest && tx.pixKey && (
                                                        <span className="text-[10px] font-mono text-slate-400 mt-0.5 break-all">Pix: {tx.pixKey}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-500 font-semibold">{tx.type}</td>
                                            <td className="py-4 px-6 text-xs text-slate-750">
                                                {['subscription', 'image_unlock', 'gift', 'message'].includes(tx.source) ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-sm font-bold text-slate-800">
                                                            {tx.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold select-none">
                                                            <span title="Taxa MimoChat" className="text-slate-400">
                                                                % {(tx.fee || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </span>
                                                            <span className="text-slate-300">•</span>
                                                            <span title="Valor Líquido" className="text-emerald-600 font-bold">
                                                                = {(tx.net || tx.val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-bold text-slate-800">
                                                        {tx.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-500 font-medium">{tx.time}</td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                                    tx.status === 'Aprovado' || tx.status === 'Crédito' || tx.status === 'Pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    tx.status === 'Pendente' || tx.status === 'Processando (Asaas)' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    tx.status === 'Débito' || tx.status === 'Cancelado' || tx.status === 'Rejeitado' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                    'bg-slate-50 text-slate-700 border-slate-100'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        tx.status === 'Aprovado' || tx.status === 'Crédito' || tx.status === 'Pago' ? 'bg-emerald-500' :
                                                        tx.status === 'Pendente' || tx.status === 'Processando (Asaas)' ? 'bg-amber-500' :
                                                        tx.status === 'Débito' || tx.status === 'Cancelado' || tx.status === 'Rejeitado' ? 'bg-rose-500' :
                                                        'bg-slate-500'
                                                    }`} />
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {tx.isWithdrawRequest ? (
                                                    <div className="flex items-center gap-2 justify-center">
                                                        {(tx.status === 'Pendente' || tx.status === 'Processando (Asaas)') ? (
                                                            <button
                                                                onClick={() => handleRejectWithdrawal(tx.id)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold rounded-lg transition-all border border-rose-100 cursor-pointer shadow-sm active:scale-95"
                                                                title="Rejeitar Saque e devolver saldo"
                                                            >
                                                                <X size={10} />
                                                                Rejeitar
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resolvido</span>
                                                                {!tx.hiddenFromUser && (
                                                                    <button
                                                                        onClick={() => handleHideWithdrawalFromUser(tx.id)}
                                                                        className="p-1.5 bg-slate-50 border border-slate-200 text-slate-505 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                                                                        title="Ocultar do histórico da profissional"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeleteNormal(tx.id, tx.displayId || tx.id)}
                                                        className="p-1.5 bg-slate-50 border border-slate-200 text-slate-505 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                                                        title="Excluir Transação"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-sm font-semibold text-slate-450">
                                        Nenhuma transação contábil registrada neste período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {!loading && totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-6 mt-4 gap-4">
                        <div className="text-xs font-semibold text-slate-500">
                            Mostrando página <span className="font-bold text-slate-700">{page}</span> de <span className="font-bold text-slate-700">{totalPages}</span> ({totalItems} transações no total)
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-98 select-none"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={page === totalPages}
                                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-98 select-none"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
