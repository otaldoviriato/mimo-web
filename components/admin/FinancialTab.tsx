'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

interface FinancialTabProps {
    dashboardData: any;
    loadingDashboard: boolean;
    handleDeleteTransaction: (id: string, displayId: string) => Promise<void>;
}

export function FinancialTab({ dashboardData, loadingDashboard, handleDeleteTransaction }: FinancialTabProps) {
    const [activeTab, setActiveTab] = React.useState('all');

    const transactions = dashboardData?.recentTransactions || [];

    const filteredTransactions = React.useMemo(() => {
        if (activeTab === 'all') return transactions;
        return transactions.filter((tx: any) => {
            if (activeTab === 'recharge') return tx.source === 'recharge';
            if (activeTab === 'withdrawal') return tx.source === 'withdrawal';
            if (activeTab === 'subscription') return tx.source === 'subscription';
            if (activeTab === 'image_unlock') return tx.source === 'image_unlock';
            if (activeTab === 'gift') return tx.source === 'gift';
            if (activeTab === 'message') return tx.source === 'message';
            return true;
        });
    }, [transactions, activeTab]);

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Histórico Financeiro Recente</h3>
                <p className="text-xs text-slate-500 font-medium">
                    Todas as transações financeiras de recarga de créditos efetuadas via API AbacatePay e cobranças.
                </p>
            </div>

            {/* Abas de Filtros */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-4">
                {[
                    { id: 'all', label: 'Todas' },
                    { id: 'recharge', label: 'Depósitos (Recargas)' },
                    { id: 'withdrawal', label: 'Saques' },
                    { id: 'subscription', label: 'Assinaturas' },
                    { id: 'image_unlock', label: 'Desbloqueios de Mídia' },
                    { id: 'gift', label: 'Mimos / Cupons' },
                    { id: 'message', label: 'Mensagens (Chat)' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
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
                            <th className="py-4 px-6">Usuário</th>
                            <th className="py-4 px-6">Tipo</th>
                            <th className="py-4 px-6">Valor</th>
                            <th className="py-4 px-6">Data/Hora</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loadingDashboard ? (
                            <tr>
                                <td colSpan={7} className="py-20 text-center text-sm font-semibold text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                        <span>Buscando transações reais...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredTransactions.length > 0 ? (
                            filteredTransactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                                    <td className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">{tx.displayId || tx.id}</td>
                                    <td className="py-4 px-6 text-sm font-bold text-slate-800">{tx.user}</td>
                                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">{tx.type}</td>
                                    <td className="py-4 px-6 text-sm font-bold text-slate-700">
                                        {tx.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">{tx.time}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                            tx.status === 'Aprovado' || tx.status === 'Crédito' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                            tx.status === 'Pendente' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                            tx.status === 'Débito' || tx.status === 'Cancelado' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                            'bg-slate-50 text-slate-700 border border-slate-100'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                tx.status === 'Aprovado' || tx.status === 'Crédito' ? 'bg-emerald-500' :
                                                tx.status === 'Pendente' ? 'bg-amber-500' :
                                                tx.status === 'Débito' || tx.status === 'Cancelado' ? 'bg-rose-500' :
                                                'bg-slate-500'
                                            }`} />
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <button
                                            onClick={() => handleDeleteTransaction(tx.id, tx.displayId || tx.id)}
                                            className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                                            title="Excluir Transação"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="py-20 text-center text-sm font-semibold text-slate-400">
                                    Nenhuma transação deste tipo registrada recentemente.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
