'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, X, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface FinancialTabProps {
    dashboardData: any;
    loadingDashboard: boolean;
    handleDeleteTransaction: (id: string, displayId: string) => Promise<void>;
}

export function FinancialTab({ dashboardData, loadingDashboard: parentLoading, handleDeleteTransaction }: FinancialTabProps) {
    const [activeTab, setActiveTab] = useState('all');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loadingLocal, setLoadingLocal] = useState(true);

    // Função para buscar as transações da API paginada
    const fetchTransactions = useCallback(async () => {
        setLoadingLocal(true);
        try {
            const response = await fetch(`/api/admin/transactions?page=${page}&limit=${limit}&type=${activeTab}`);
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

    // Disparar a busca quando a página ou a aba de filtro mudar
    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Resetar para a primeira página quando o filtro mudar
    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        setPage(1);
    };

    // Handler para deletar transações normais
    const handleDeleteNormal = async (id: string, displayId: string) => {
        // Chama a prop de deleção do pai que faz o confirm e a requisição
        await handleDeleteTransaction(id, displayId);
        // Após concluir, recarrega a nossa lista local
        fetchTransactions();
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
                fetchTransactions();
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
                fetchTransactions();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Erro ao ocultar transferência.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    };

    const loading = parentLoading || loadingLocal;

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Histórico Financeiro Recente</h3>
                <p className="text-xs text-slate-500 font-medium">
                    Todas as transações financeiras de recargas, saques, assinaturas, desbloqueios de mídia e mimos.
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
                            transactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">{tx.displayId || tx.id}</td>
                                    <td className="py-4 px-6 text-sm font-bold">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-slate-700 font-extrabold">{tx.senderName}</span>
                                                <span className="text-slate-400 font-normal">→</span>
                                                <span className="text-purple-600 font-extrabold">{tx.receiverName}</span>
                                            </div>
                                            {tx.isWithdrawRequest && tx.pixKey && (
                                                <span className="text-[10px] font-mono text-slate-400 mt-0.5 break-all">Pix: {tx.pixKey}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">{tx.type}</td>
                                    <td className="py-4 px-6 text-xs text-slate-700">
                                        {['subscription', 'image_unlock', 'gift', 'message'].includes(tx.source) ? (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-slate-800">
                                                    Total: {tx.val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                                <span className="text-slate-400 text-[10px] font-semibold">
                                                    Taxa: {(tx.fee || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                                <span className="text-emerald-600 text-[10px] font-bold">
                                                    Líquido: {(tx.net || tx.val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
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
                                                                className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
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
                                                className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                                                title="Excluir Transação"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="py-20 text-center text-sm font-semibold text-slate-400">
                                    Nenhuma transação deste tipo registrada nesta página.
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
                            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-98 select-none"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={page === totalPages}
                            className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-98 select-none"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
