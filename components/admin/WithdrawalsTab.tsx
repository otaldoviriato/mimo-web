'use client';

import React, { useEffect } from 'react';
import { Eye, X, Trash2 } from 'lucide-react';
import { useWithdrawals } from '@/hooks/admin/useWithdrawals';

function getInitials(name: string) {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export function WithdrawalsTab() {
    const {
        withdrawals, loadingWithdrawals,
        fetchWithdrawals,
        handleApproveWithdrawal,
        handleRejectWithdrawal,
        handleHideWithdrawalFromUser,
    } = useWithdrawals();

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Solicitações de Saque Manuais</h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Analise as solicitações de saque das profissionais, efetue o Pix manual no seu banco e confirme ou rejeite o pedido aqui.
                    </p>
                </div>
                <button
                    onClick={fetchWithdrawals}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                    Atualizar Lista
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <th className="py-4 px-6">Profissional</th>
                            <th className="py-4 px-6">Chave Pix</th>
                            <th className="py-4 px-6">Valor do Saque</th>
                            <th className="py-4 px-6">Solicitado Em</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loadingWithdrawals ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                        <span>Buscando solicitações no banco...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : withdrawals.length > 0 ? (
                            withdrawals.map((withdraw) => (
                                <tr key={withdraw.id} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-sm">
                                                {withdraw.userPhotoUrl ? (
                                                    <img src={withdraw.userPhotoUrl} alt={withdraw.userName} className="w-full h-full object-cover" />
                                                ) : getInitials(withdraw.userName)}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-slate-800 truncate">{withdraw.userName}</span>
                                                <span className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{withdraw.userEmail}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 w-fit break-all">
                                            {withdraw.pixKey}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm font-extrabold text-slate-800">
                                            {withdraw.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-xs text-slate-500 font-semibold">{withdraw.createdAt}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                            withdraw.status === 'concluido' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            withdraw.status === 'processando' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                                            withdraw.status === 'pendente' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                                            'bg-rose-50 text-rose-700 border-rose-100'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                withdraw.status === 'concluido' ? 'bg-emerald-500' :
                                                withdraw.status === 'processando' ? 'bg-blue-500' :
                                                withdraw.status === 'pendente' ? 'bg-amber-500' : 'bg-rose-500'
                                            }`} />
                                            {withdraw.status === 'concluido' ? 'Pago' :
                                             withdraw.status === 'processando' ? 'Processando (Asaas)' :
                                             withdraw.status === 'pendente' ? 'Pendente' : 'Rejeitado'}
                                        </span>
                                        {withdraw.hiddenFromUser && (
                                            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                                <Eye size={10} className="opacity-60" />
                                                Oculto da usuária
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {(withdraw.status === 'pendente' || withdraw.status === 'processando') ? (
                                            <div className="flex items-center gap-3 justify-center">
                                                {withdraw.status === 'processando' && (
                                                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider animate-pulse mr-2">
                                                        Processando (Asaas)...
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleRejectWithdrawal(withdraw.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg transition-all border border-rose-100 cursor-pointer shadow-sm active:scale-95"
                                                >
                                                    <X size={12} />
                                                    Rejeitar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 justify-center">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Resolvido</span>
                                                {!withdraw.hiddenFromUser && (
                                                    <button
                                                        onClick={() => handleHideWithdrawalFromUser(withdraw.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg transition-all border border-slate-200 cursor-pointer shadow-sm active:scale-95"
                                                    >
                                                        <Trash2 size={12} />
                                                        Ocultar
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                    Nenhuma solicitação de saque cadastrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
