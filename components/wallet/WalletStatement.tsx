'use client';

import { useState } from 'react';
import { ArrowDownRight, Gift, Image as ImageIcon, MessageSquare, RefreshCw, UserRoundPlus } from 'lucide-react';
import { Avatar } from '@/components/Avatar';

export interface WalletStatementEntry {
    id: string;
    kind: 'message' | 'media_unlock' | 'gift' | 'subscription' | 'adjustment';
    title: string;
    description: string;
    amount: number;
    timestamp: string;
    clientPhotoUrl?: string | null;
}

export interface WalletStatementData {
    balance: number;
    totalWithdrawn: number;
    totalEarnings: number;
    entries: WalletStatementEntry[];
    withdrawals: Array<{ id: string; amount: number; fee: number; netAmount: number; status: 'pendente' | 'processando' | 'concluido' | 'rejeitado'; timestamp: string }>;
}

type Props = { data?: WalletStatementData; isLoading: boolean; showValues: boolean };
const formatCurrency = (amount: number, show: boolean) => show ? (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ••••';
const iconByKind = { message: MessageSquare, media_unlock: ImageIcon, gift: Gift, subscription: UserRoundPlus, adjustment: RefreshCw };

export function WalletStatement({ data, isLoading, showValues }: Props) {
    const [filter, setFilter] = useState<'earnings' | 'withdrawals'>('earnings');
    if (isLoading) return <div className="rounded-2xl border border-purple-100/60 bg-white p-16 text-center text-xs font-bold text-slate-400">Carregando extrato...</div>;
    if (!data) return null;
    const rows = filter === 'earnings'
        ? data.entries.map(entry => ({ ...entry, rowType: 'earning' as const }))
        : data.withdrawals.map(item => ({ ...item, rowType: 'withdrawal' as const }));

    return (
        <section className="rounded-2xl border border-purple-100/60 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div><h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Extrato do saldo</h2><p className="mt-1 text-[11px] font-medium text-slate-500">Cada mensagem aparece assim que o valor entra no seu saldo disponível.</p></div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-right"><span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-700">Disponível agora</span><strong className="text-sm text-emerald-800">{formatCurrency(data.balance, showValues)}</strong></div>
            </div>
            <div className="grid grid-cols-3 gap-2 py-4">
                <button type="button" onClick={() => setFilter('earnings')} className={`rounded-xl border p-3 text-left ${filter === 'earnings' ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}><span className="text-[9px] font-black uppercase text-slate-500">Total ganho</span><strong className="mt-1 block text-sm">{formatCurrency(data.totalEarnings, showValues)}</strong></button>
                <button type="button" onClick={() => setFilter('withdrawals')} className={`rounded-xl border p-3 text-left ${filter === 'withdrawals' ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}><span className="text-[9px] font-black uppercase text-slate-500">Total sacado</span><strong className="mt-1 block text-sm">{formatCurrency(data.totalWithdrawn, showValues)}</strong></button>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><span className="text-[9px] font-black uppercase text-emerald-700">Saldo</span><strong className="mt-1 block text-sm text-emerald-800">{formatCurrency(data.balance, showValues)}</strong></div>
            </div>
            <div className="space-y-2">
                {rows.length === 0 ? <div className="rounded-xl bg-slate-50 py-8 text-center text-xs text-slate-400">Nenhuma movimentação encontrada.</div> : rows.map(row => {
                    if (row.rowType === 'withdrawal') return <article key={row.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><ArrowDownRight className="h-4 w-4" /></div><div className="min-w-0 flex-1"><h3 className="text-xs font-extrabold">Saque via Pix</h3><p className="text-[10px] text-slate-400">{row.status} · {new Date(row.timestamp).toLocaleString('pt-BR')}</p></div><strong className="text-xs text-red-600">− {formatCurrency(row.amount, showValues)}</strong></article>;
                    const Icon = iconByKind[row.kind];
                    return <article key={row.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">{row.clientPhotoUrl ? <Avatar uri={row.clientPhotoUrl} size={36} /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-600"><Icon className="h-4 w-4" /></div>}<div className="min-w-0 flex-1"><h3 className="truncate text-xs font-extrabold">{row.title}</h3><p className="truncate text-[10px] text-slate-400">{row.description} · {row.timestamp === new Date(0).toISOString() ? 'Histórico' : new Date(row.timestamp).toLocaleString('pt-BR')}</p></div><strong className={row.amount >= 0 ? 'text-xs text-emerald-600' : 'text-xs text-red-600'}>{row.amount >= 0 ? '+' : '−'} {formatCurrency(Math.abs(row.amount), showValues)}</strong></article>;
                })}
            </div>
        </section>
    );
}
