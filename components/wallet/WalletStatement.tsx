'use client';

import { useState } from 'react';
import { ArrowDownRight, CheckCircle2, CircleDollarSign, Clock3, Gift, Image as ImageIcon, MessageSquare, RefreshCw, UserRoundPlus } from 'lucide-react';
import { Avatar } from '@/components/Avatar';

export interface WalletStatementEntry {
    id: string;
    kind: 'conversation' | 'other_earnings' | 'media_unlock' | 'gift' | 'subscription' | 'adjustment';
    title: string;
    description: string;
    amount: number;
    timestamp: string;
    status: 'open' | 'closed';
    clientPhotoUrl?: string | null;
}

export interface WalletStatementData {
    balance: number;
    totalWithdrawn: number;
    entries: WalletStatementEntry[];
    openEarnings: number;
    closedEarnings: number;
    totalEarnings: number;
    explainedBalance: number;
    reconciliationDifference: number;
    timeoutMinutes: number;
    minimumEarningsCents: number;
    withdrawals: Array<{
        id: string;
        amount: number;
        fee: number;
        netAmount: number;
        status: 'pendente' | 'processando' | 'concluido' | 'rejeitado';
        timestamp: string;
    }>;
}

type Props = {
    data?: WalletStatementData;
    isLoading: boolean;
    showValues: boolean;
};

const formatCurrency = (amount: number, showValues: boolean) => showValues
    ? (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ ••••';

const iconByKind = {
    conversation: MessageSquare,
    other_earnings: CircleDollarSign,
    media_unlock: ImageIcon,
    gift: Gift,
    subscription: UserRoundPlus,
    adjustment: RefreshCw,
};

export function WalletStatement({ data, isLoading, showValues }: Props) {
    const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'withdrawals'>('all');
    if (isLoading) {
        return (
            <div className="rounded-2xl border border-purple-100/60 bg-white p-5">
                <div className="space-y-3 animate-pulse">
                    <div className="h-5 w-40 rounded bg-slate-100" />
                    <div className="h-16 rounded-xl bg-slate-50" />
                    <div className="h-16 rounded-xl bg-slate-50" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const earningRows = filter === 'all'
        ? data.entries
        : data.entries.filter(entry => entry.status === filter);
    const rows = (filter === 'withdrawals'
        ? data.withdrawals.map(withdrawal => ({ ...withdrawal, rowType: 'withdrawal' as const }))
        : earningRows.map(entry => ({ ...entry, rowType: 'earning' as const })))
        .toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const cardClass = (active: boolean, color: 'amber' | 'emerald' | 'slate') => {
        const activeClasses = {
            amber: 'border-amber-300 bg-amber-100 ring-2 ring-amber-100',
            emerald: 'border-emerald-300 bg-emerald-100 ring-2 ring-emerald-100',
            slate: 'border-purple-300 bg-purple-50 ring-2 ring-purple-100',
        };
        return `rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${active ? activeClasses[color] : 'border-slate-200 bg-slate-50/70'}`;
    };

    return (
        <section className="rounded-2xl border border-purple-100/60 bg-white p-5 shadow-[0_4px_20px_rgb(0,0,0,0.012)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Extrato do saldo</h2>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                        Seus ganhos acumulados, os valores já sacados e o saldo disponível em uma única conta.
                    </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">Saldo</span>
                    <strong className="text-sm text-emerald-800">{formatCurrency(data.balance, showValues)}</strong>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 py-4 sm:grid-cols-4">
                <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter(filter === 'open' ? 'all' : 'open')} className={cardClass(filter === 'open', 'amber')}>
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700">
                        <Clock3 className="h-3 w-3" /> Em andamento
                    </span>
                    <strong className="mt-1 block text-sm text-slate-800">{formatCurrency(data.openEarnings, showValues)}</strong>
                </button>
                <button type="button" aria-pressed={filter === 'closed'} onClick={() => setFilter(filter === 'closed' ? 'all' : 'closed')} className={cardClass(filter === 'closed', 'emerald')}>
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Concluídos
                    </span>
                    <strong className="mt-1 block text-sm text-slate-800">{formatCurrency(data.closedEarnings, showValues)}</strong>
                </button>
                <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} className={cardClass(filter === 'all', 'slate')}>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total ganho</span>
                    <strong className="mt-1 block text-sm text-slate-800">{formatCurrency(data.totalEarnings, showValues)}</strong>
                </button>
                <button type="button" aria-pressed={filter === 'withdrawals'} onClick={() => setFilter(filter === 'withdrawals' ? 'all' : 'withdrawals')} className={cardClass(filter === 'withdrawals', 'slate')}>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total sacado</span>
                    <strong className="mt-1 block text-sm text-slate-800">{formatCurrency(data.totalWithdrawn, showValues)}</strong>
                </button>
            </div>

            <div className="space-y-2">
                {rows.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 py-8 text-center text-xs font-medium text-slate-400">
                        Seus próximos ganhos aparecerão aqui.
                    </div>
                ) : rows.map(row => {
                    if (row.rowType === 'withdrawal') {
                        const statusLabel = row.status === 'concluido' ? 'Concluído' : row.status === 'rejeitado' ? 'Não realizado' : 'Em processamento';
                        return (
                            <article key={row.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                    <ArrowDownRight className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xs font-extrabold text-slate-800">Saque via Pix</h3>
                                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                        {statusLabel} · {new Date(row.timestamp).toLocaleString('pt-BR')}
                                        {row.fee > 0 ? ` · Taxa ${formatCurrency(row.fee, showValues)}` : ''}
                                    </p>
                                </div>
                                <strong className={row.status === 'rejeitado' ? 'text-xs text-slate-400 line-through' : 'text-xs text-red-600'}>
                                    − {formatCurrency(row.amount, showValues)}
                                </strong>
                            </article>
                        );
                    }

                    const Icon = iconByKind[row.kind];
                    return (
                        <article key={row.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 hover:bg-slate-50/50">
                            {row.clientPhotoUrl ? (
                                <Avatar uri={row.clientPhotoUrl} size={36} />
                            ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                                    <Icon className="h-4 w-4" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="truncate text-xs font-extrabold text-slate-800">{row.title}</h3>
                                    {row.status === 'open' ? (
                                        <span className="shrink-0 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700">
                                            Em andamento
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                                    {row.description} · {new Date(row.timestamp).toLocaleString('pt-BR')}
                                </p>
                            </div>
                            <strong className={row.amount >= 0 ? 'text-xs text-emerald-600' : 'text-xs text-red-600'}>
                                {row.amount >= 0 ? '+' : '−'} {formatCurrency(Math.abs(row.amount), showValues)}
                            </strong>
                        </article>
                    );
                })}
            </div>

        </section>
    );
}
