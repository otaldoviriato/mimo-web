'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMyProfile, useRequestWithdraw, usePendingWithdrawal, useUpdateProfile, useWithdrawalHistory } from '@/hooks/useQueries';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { Input } from '@/components/Input';
import { Avatar } from '@/components/Avatar';
import { 
    Wallet2, 
    ArrowUpRight, 
    ArrowDownRight, 
    TrendingUp, 
    MessageSquare, 
    Image as ImageIcon, 
    Gift, 
    Crown, 
    AlertCircle,
    Key,
    Eye,
    EyeOff,
    ShieldAlert
} from 'lucide-react';

interface CustomerRanking {
    clerkId: string;
    totalSpent: number;
    name: string;
    username: string;
    photoUrl: string | null;
}

interface EarningEvolutionPoint {
    date: string;
    amount: number;
}

interface WalletDashboardData {
    balance: number;
    totalWithdrawn: number;
    pendingWithdrawal: unknown;
    projectedMonthlyRecurring: number;
    earningsByCategory: {
        subscription: number;
        message: number;
        image_unlock: number;
        gift: number;
    };
    earningsEvolution: EarningEvolutionPoint[];
    topCustomers: CustomerRanking[];
    totalMessageEarnings: number;
    totalMessagesCount: number;
    averageEarningPerMessage: number;
    totalImageUnlocksCount: number;
    totalImageUnlockEarnings: number;
    monthlyMessageEarnings: number;
    monthlyMessagesCount: number;
    monthlyAverageEarningPerMessage: number;
    monthlyImageUnlockEarnings: number;
    monthlyImageUnlocksCount: number;
}

export default function WalletPage() {
    const { data: userData, refetch: refetchProfile } = useMyProfile();
    const router = useTransitionRouter();
    const updateProfileMutation = useUpdateProfile();
    const requestWithdrawMutation = useRequestWithdraw();
    const { refetch: refetchPendingWithdrawal } = usePendingWithdrawal();
    const { data: withdrawalsData, refetch: refetchWithdrawals } = useWithdrawalHistory();

    const [pixKey, setPixKey] = useState('');
    const [pixModalOpen, setPixModalOpen] = useState(false);
    const [withdrawConfirmModalOpen, setWithdrawConfirmModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const [showValues, setShowValues] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mimo_show_wallet_values');
            return saved !== 'false';
        }
        return true;
    });

    const toggleShowValues = () => {
        setShowValues((prev) => {
            const next = !prev;
            localStorage.setItem('mimo_show_wallet_values', String(next));
            return next;
        });
    };

    const renderValue = (amountInCentavos: number) => {
        return showValues ? formatCurrency(amountInCentavos) : 'R$ ••••';
    };

    // Estado da query de dashboard
    const { data: dashboardData, isLoading: loadingDashboard, refetch: refetchDashboard } = useQuery<WalletDashboardData>({
        queryKey: ['wallet', 'dashboard'],
        queryFn: async () => {
            const res = await fetch('/api/users/me/wallet-dashboard');
            if (!res.ok) throw new Error('Falha ao buscar dados da carteira');
            return res.json();
        },
        refetchInterval: 30 * 1005
    });

    useEffect(() => {
        if (userData?.pixKey) {
            setPixKey(userData.pixKey);
        }
    }, [userData]);

    const handleSavePix = async () => {
        if (!pixKey.trim()) return;
        setLoading(true);
        try {
            await updateProfileMutation.mutateAsync({ pixKey });
            await refetchProfile();
            setPixModalOpen(false);
            setWithdrawConfirmModalOpen(true);
        } catch {
            alert('Erro ao salvar chave Pix');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestWithdraw = async () => {
        try {
            await requestWithdrawMutation.mutateAsync();
            setWithdrawConfirmModalOpen(false);
            refetchProfile();
            refetchPendingWithdrawal();
            refetchDashboard();
            refetchWithdrawals();
        } catch {
            alert('Erro ao solicitar saque.');
        }
    };

    if (loadingDashboard) {
        return (
            <div className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-16 animate-pulse">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 px-5 h-[72px] shrink-0 flex items-center">
                    <div className="h-6 w-32 bg-gray-150 rounded-lg" />
                </div>
                <div className="p-4 flex flex-col gap-4 max-w-3xl mx-auto w-full">
                    <div className="h-36 bg-white rounded-2xl border border-gray-100 shadow-sm" />
                    <div className="h-24 bg-white rounded-2xl border border-gray-100 shadow-sm" />
                </div>
            </div>
        );
    }

    const data = dashboardData || {
        balance: 0,
        totalWithdrawn: 0,
        pendingWithdrawal: null,
        projectedMonthlyRecurring: 0,
        earningsByCategory: { subscription: 0, message: 0, image_unlock: 0, gift: 0 },
        earningsEvolution: [],
        topCustomers: [],
        totalMessageEarnings: 0,
        totalMessagesCount: 0,
        averageEarningPerMessage: 0,
        totalImageUnlocksCount: 0,
        totalImageUnlockEarnings: 0,
        monthlyMessageEarnings: 0,
        monthlyMessagesCount: 0,
        monthlyAverageEarningPerMessage: 0,
        monthlyImageUnlockEarnings: 0,
        monthlyImageUnlocksCount: 0
    };

    const formatCurrency = (amountInCentavos: number) => {
        return (amountInCentavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Cálculos para o gráfico SVG de linha
    const points = data.earningsEvolution;
    const maxVal = Math.max(...points.map(p => p.amount), 100);
    const width = 500;
    const height = 130;
    const padding = 15;

    const svgPoints = points.map((p, idx) => {
        const x = padding + (idx / (points.length - 1)) * (width - padding * 2);
        const y = height - padding - (p.amount / maxVal) * (height - padding * 2);
        return { x, y, val: p.amount, date: p.date };
    });

    const generatePath = () => {
        if (svgPoints.length === 0) return '';
        let d = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
        for (let i = 0; i < svgPoints.length - 1; i++) {
            const p0 = svgPoints[i];
            const p1 = svgPoints[i + 1];
            const cpX1 = p0.x + (p1.x - p0.x) / 2;
            const cpY1 = p0.y;
            const cpX2 = p0.x + (p1.x - p0.x) / 2;
            const cpY2 = p1.y;
            d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
        }
        return d;
    };

    const generateAreaPath = () => {
        const path = generatePath();
        if (!path) return '';
        return `${path} L ${svgPoints[svgPoints.length - 1].x} ${height - padding} L ${svgPoints[0].x} ${height - padding} Z`;
    };

    const linePath = generatePath();
    const areaPath = generateAreaPath();

    const totalEarningsSum = Object.values(data.earningsByCategory).reduce((a, b) => a + b, 0) || 1;
    const getPercent = (val: number) => {
        return ((val / totalEarningsSum) * 100).toFixed(0) + '%';
    };    return (
        <div className="flex flex-col h-full bg-slate-50 text-gray-850 overflow-y-auto pb-24 md:pb-6 relative no-scrollbar">
            
            {/* Header */}
            <div className="shared-header bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-20 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-8 h-8 object-contain shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">Carteira</span>
                </div>
                {userData?.isAdmin && (
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center"
                        title="Painel Admin"
                    >
                        <ShieldAlert className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Bento Grid Container - Compacto, sem bordas pretas, sem rosa e ajustado para mobile */}
            <div className="p-4 flex flex-col gap-4 max-w-3xl w-full mx-auto relative z-0">
                
                {/* ── BENTO BLOCK 1: CARD DE SALDO PRINCIPAL (Tema Claro Lavanda / Azul Premium) ── */}
                <div className="bg-gradient-to-br from-purple-50/90 to-indigo-50/50 rounded-2xl p-5 flex flex-col justify-between min-h-[150px] relative overflow-hidden shadow-[0_8px_30px_rgb(124,58,237,0.02)] text-slate-800 border border-purple-100/80">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-purple-650 font-extrabold uppercase tracking-widest">
                                    Saldo Disponível
                                </span>
                                <button
                                    onClick={toggleShowValues}
                                    className="text-purple-400 hover:text-purple-600 active:scale-95 transition-all focus:outline-none p-0.5"
                                    title={showValues ? "Ocultar valores" : "Mostrar valores"}
                                >
                                    {showValues ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight mt-1">
                                {renderValue(data.balance)}
                            </h2>
                        </div>
                        <span className="text-[9px] bg-slate-200/60 border border-slate-300/40 text-slate-600 font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider backdrop-blur-sm">
                            Real (BRL)
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-purple-100/50">
                        <p className="text-[9px] text-slate-450 max-w-xs flex items-center gap-1.5 leading-snug">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            Saques via Pix transferidos para a chave PIX cadastrada.
                        </p>
                        
                        <button
                            onClick={() => {
                                if (!userData?.pixKey) {
                                    setPixModalOpen(true);
                                } else {
                                    setWithdrawConfirmModalOpen(true);
                                }
                            }}
                            disabled={data.balance <= 0}
                            className={`h-9 px-4 rounded-xl font-bold text-xs tracking-wide uppercase transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 shrink-0 shadow-sm ${
                                data.balance <= 0
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200/40'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-950/10'
                            }`}
                        >
                            <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                            Sacar Saldo (PIX)
                        </button>
                    </div>
                </div>

                {/* ── BENTO BLOCK 2: HISTÓRICO DE SAQUES (Substitui Desempenho no Chat) ── */}
                <div className="bg-white border border-purple-100/60 rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.012)] flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-6.5 h-6.5 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200/50 shrink-0">
                                <Wallet2 className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                                Histórico de Saques
                            </span>
                        </div>
                        
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total Sacado</span>
                            <span className="text-sm font-black text-emerald-650 leading-tight">
                                {renderValue(data.totalWithdrawn)}
                            </span>
                        </div>
                    </div>

                    {/* Lista de Saques */}
                    {withdrawalsData === undefined ? (
                        <div className="flex flex-col gap-2 py-4 animate-pulse">
                            <div className="h-10 bg-slate-50 rounded-xl" />
                            <div className="h-10 bg-slate-50 rounded-xl" />
                            <div className="h-10 bg-slate-50 rounded-xl" />
                        </div>
                    ) : (withdrawalsData.withdrawals || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center border border-dashed border-gray-150 rounded-xl py-8 gap-2 bg-slate-50/50">
                            <span className="text-xl">💸</span>
                            <p className="text-[10px] text-gray-400">Nenhum saque realizado ainda.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {((withdrawalsData.withdrawals || []).slice(0, isExpanded ? undefined : 5)).map((w: { id: string; amount: number; status: string; createdAt: string }) => {
                                const statusStyles = (() => {
                                    switch (w.status) {
                                        case 'concluido':
                                            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                        case 'processando':
                                        case 'pendente':
                                            return 'bg-amber-50 text-amber-700 border-amber-100';
                                        case 'rejeitado':
                                            return 'bg-red-50 text-red-700 border-red-100';
                                        default:
                                            return 'bg-slate-50 text-slate-700 border-slate-100';
                                    }
                                })();

                                const statusLabel = (() => {
                                    switch (w.status) {
                                        case 'concluido': return 'Concluído';
                                        case 'processando': return 'Processando';
                                        case 'pendente': return 'Pendente';
                                        case 'rejeitado': return 'Rejeitado';
                                        default: return w.status;
                                    }
                                })();

                                return (
                                    <div key={w.id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-b-0">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                                w.status === 'concluido'
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : w.status === 'rejeitado'
                                                    ? 'bg-red-50 text-red-500'
                                                    : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-[10px] font-bold text-gray-900 leading-tight">Saque via Pix</h4>
                                                <p className="text-[8px] text-gray-400 mt-0.5">
                                                    {new Date(w.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10.5px] font-extrabold text-gray-800">
                                                {renderValue(w.amount)}
                                            </span>
                                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border ${statusStyles}`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {(withdrawalsData.withdrawals || []).length > 5 && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="text-[9px] font-extrabold text-purple-600 hover:text-purple-700 self-center py-1.5 px-3 rounded-lg bg-purple-50 hover:bg-purple-100/80 transition-all active:scale-[0.98] mt-1 border border-purple-100/30"
                                >
                                    {isExpanded ? 'Recolher histórico' : 'Carregar mais saques'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* ── BENTO BLOCK 3: TOP CLIENTES (FÃS VIP) (Terceiro Card) ── */}
                <div className="bg-white border border-purple-100/60 rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.015)] flex flex-col justify-between min-h-[220px]">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                        <span className="text-[9.5px] text-gray-500 font-bold uppercase tracking-widest">
                            Top Faturamento
                        </span>
                        <span className="text-[8.5px] text-purple-600 font-bold uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100/50">Top 5</span>
                    </div>

                    {data.topCustomers && data.topCustomers.length > 0 ? (
                        <div className="flex-1 flex flex-col gap-3 justify-center">
                            {data.topCustomers.map((customer, index) => (
                                <div key={customer.clerkId} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-b-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-50 border border-gray-200 shrink-0 text-gray-500">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </div>
                                        <div className="p-[0.5px] bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full shrink-0">
                                            <div className="bg-white p-[1px] rounded-full">
                                                <Avatar uri={customer.photoUrl} size={24} />
                                            </div>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-[10px] font-bold text-gray-900 truncate leading-tight">{customer.name}</h4>
                                            <p className="text-[8px] text-gray-400 truncate mt-0.5">@{customer.username}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10.5px] font-extrabold text-purple-650 shrink-0 text-right">{renderValue(customer.totalSpent)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-100 rounded-xl gap-1 py-6 bg-slate-50/50">
                            <span className="text-base">👑</span>
                            <p className="text-[10px] text-gray-400">Nenhum VIP listado ainda.</p>
                        </div>
                    )}
                </div>

                {/* ── SEÇÃO INDICADORES COMPACTOS - EM GRID 2 COLUNAS MOBILE (Preenche todo o espaço) ── */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Indicador: Total Retirado */}
                    <div className="bg-white border border-purple-100/60 rounded-2xl p-3 flex items-center gap-2.5 shadow-[0_4px_20px_rgb(0,0,0,0.015)]">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider block leading-none truncate">Total Retirado</span>
                            <span className="text-sm font-black text-gray-900 mt-0.5 block leading-tight truncate">{renderValue(data.totalWithdrawn)}</span>
                            <span className="text-[7.5px] text-emerald-650 font-medium block mt-0.5 truncate">Enviado Pix</span>
                        </div>
                    </div>

                    {/* Indicador: Faturamento Histórico */}
                    <div className="bg-white border border-purple-100/60 rounded-2xl p-3 flex items-center gap-2.5 shadow-[0_4px_20px_rgb(0,0,0,0.015)]">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-650 shrink-0">
                            <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider block leading-none truncate">Faturamento Total</span>
                            <span className="text-sm font-black text-gray-900 mt-0.5 block leading-tight truncate">{renderValue(data.balance + data.totalWithdrawn)}</span>
                            <span className="text-[7.5px] text-blue-600 font-medium block mt-0.5 truncate">Ganhos brutos</span>
                        </div>
                    </div>
                </div>

                {/* ── BENTO BLOCK 5: GRÁFICO DE EVOLUÇÃO (Refinado, Compacto, SVG Roxo) ── */}
                <div className="bg-white border border-purple-100/60 rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.015)] flex flex-col justify-between min-h-[200px]">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                        <span className="text-[9.5px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-purple-650" />
                            Evolução de Ganhos Diários
                        </span>
                        <span className="text-[8.5px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 font-medium">Últimos 15 Dias</span>
                    </div>

                    {/* Gráfico SVG Linha Suave */}
                    {svgPoints.length > 0 ? (
                        <div className="w-full flex-1 flex flex-col justify-end">
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.08" />
                                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {/* Linhas de grade sutis */}
                                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#f1f5f9" strokeWidth="1.5" />

                                {/* Área sob a curva */}
                                <path d={areaPath} fill="url(#areaGrad)" />

                                {/* Linha do gráfico - Roxo Limpo */}
                                <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                                {/* Pontos de Dados */}
                                {svgPoints.map((pt, idx) => {
                                    if (pt.val === 0) return null;
                                    return (
                                        <g key={idx} className="group/dot cursor-pointer">
                                            <circle cx={pt.x} cy={pt.y} r="4.5" fill="#7c3aed" className="opacity-0 group-hover/dot:opacity-20 transition-opacity animate-ping" />
                                            <circle cx={pt.x} cy={pt.y} r="2.5" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
                                        </g>
                                    );
                                })}
                            </svg>
                            
                            {/* Eixo X com as datas */}
                            <div className="flex justify-between px-2.5 mt-1.5 border-t border-gray-50 pt-1.5 text-[8.5px] text-gray-400 font-medium">
                                <span>{points[0]?.date}</span>
                                <span>{points[Math.floor(points.length / 2)]?.date}</span>
                                <span>{points[points.length - 1]?.date}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                            Nenhum faturamento registrado nos últimos 15 dias.
                        </div>
                    )}
                </div>

                {/* ── BENTO BLOCK 6: DETALHAMENTO DE PRODUTOS (Origem dos Ganhos) ── */}
                <div className="bg-white border border-purple-100/60 rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.015)] flex flex-col justify-between min-h-[220px]">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                        <span className="text-[9.5px] text-gray-500 font-bold uppercase tracking-widest">Origem dos Ganhos</span>
                        <span className="text-[8.5px] text-gray-450 font-bold uppercase tracking-wider">Divisão</span>
                    </div>

                    <div className="flex-1 flex flex-col gap-2 justify-center">
                        {/* Mensagens */}
                        <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-center text-[9px] font-semibold text-gray-500">
                                <span className="flex items-center gap-1.5"><MessageSquare className="w-3 h-3 text-purple-650" /> Mensagens</span>
                                <span className="font-bold text-gray-900">{renderValue(data.earningsByCategory.message)} ({getPercent(data.earningsByCategory.message)})</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-gray-200/30">
                                <div style={{ width: getPercent(data.earningsByCategory.message) }} className="h-full bg-purple-600 rounded-full" />
                            </div>
                        </div>

                        {/* Mídias */}
                        <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-center text-[9px] font-semibold text-gray-500">
                                <span className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3 text-purple-650" /> Mídias Privadas</span>
                                <span className="font-bold text-gray-900">{renderValue(data.earningsByCategory.image_unlock)} ({getPercent(data.earningsByCategory.image_unlock)})</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-gray-200/30">
                                <div style={{ width: getPercent(data.earningsByCategory.image_unlock) }} className="h-full bg-purple-600 rounded-full" />
                            </div>
                        </div>

                        {/* Assinaturas */}
                        <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-center text-[9px] font-semibold text-gray-500">
                                <span className="flex items-center gap-1.5"><Crown className="w-3 h-3 text-purple-650" /> Assinaturas</span>
                                <span className="font-bold text-gray-900">{renderValue(data.earningsByCategory.subscription)} ({getPercent(data.earningsByCategory.subscription)})</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-gray-200/30">
                                <div style={{ width: getPercent(data.earningsByCategory.subscription) }} className="h-full bg-purple-600 rounded-full" />
                            </div>
                        </div>

                        {/* Presentes */}
                        <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-center text-[9px] font-semibold text-gray-500">
                                <span className="flex items-center gap-1.5"><Gift className="w-3 h-3 text-purple-650" /> Presentes</span>
                                <span className="font-bold text-gray-900">{renderValue(data.earningsByCategory.gift)} ({getPercent(data.earningsByCategory.gift)})</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-gray-200/30">
                                <div style={{ width: getPercent(data.earningsByCategory.gift) }} className="h-full bg-purple-600 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── MODAL: CADASTRAR CHAVE PIX ─────────────────────────── */}
            {pixModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in duration-300 border border-gray-100">
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 shadow-sm">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Configurar Chave PIX</h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    Cadastre a sua chave Pix para receber os saques.
                                </p>
                            </div>
                        </div>

                        <Input
                            label="Chave Pix"
                            placeholder="CPF, E-mail, Telefone ou Aleatória"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                        />

                        <div className="flex gap-2.5 mt-1">
                            <button
                                onClick={() => setPixModalOpen(false)}
                                className="flex-1 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-655 font-bold text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSavePix}
                                disabled={loading || !pixKey.trim()}
                                className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center disabled:opacity-50"
                            >
                                {loading ? 'Salvando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: CONFIRMAR SAQUE ────────────────────────────────── */}
            {withdrawConfirmModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-5 animate-in fade-in zoom-in duration-300 border border-gray-100">
                        <div className="flex flex-col items-center text-center gap-2.5">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                                <ArrowDownRight className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Confirmar Saque</h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    Deseja solicitar a transferência do saldo?
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl flex flex-col gap-2 text-xs text-gray-750 border border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 font-medium">Valor:</span>
                                <span className="font-black text-sm text-gray-950">
                                    {formatCurrency(data.balance)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                                <span className="text-gray-400 font-medium">Chave PIX:</span>
                                <span className="font-bold text-gray-900">{pixKey}</span>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-start gap-1.5 mt-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[9px] text-amber-700 leading-snug">
                                    O prazo de transferência bancária via Pix é de até 24 horas úteis.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setWithdrawConfirmModalOpen(false)}
                                className="flex-1 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-655 font-bold text-xs"
                                disabled={requestWithdrawMutation.isPending}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRequestWithdraw}
                                disabled={requestWithdrawMutation.isPending || data.balance <= 0}
                                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center disabled:opacity-50"
                            >
                                {requestWithdrawMutation.isPending ? 'Enviando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
