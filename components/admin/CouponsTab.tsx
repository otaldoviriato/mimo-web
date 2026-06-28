'use client';

import React, { useEffect } from 'react';
import { Plus, Eye, Sliders, Trash2, Ticket, Users, Search, Loader2, X } from 'lucide-react';
import { useCoupons } from '@/hooks/admin/useCoupons';

function getInitials(name: string) {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export function CouponsTab() {
    const {
        coupons, loadingCoupons,
        couponModalOpen, setCouponModalOpen,
        selectedCoupon,
        couponUsersModalOpen, setCouponUsersModalOpen,
        auditedCoupon,
        couponUsers, loadingCouponUsers,
        couponUsersSearch, setCouponUsersSearch,
        cpCode, setCpCode,
        cpAmount, setCpAmount,
        cpDescription, setCpDescription,
        cpTargetAudience, setCpTargetAudience,
        cpMaxUses, setCpMaxUses,
        cpExpiresAt, setCpExpiresAt,
        cpIsActive, setCpIsActive,
        fetchCoupons,
        handleOpenCouponModal,
        handleSaveCoupon,
        handleDeleteCoupon,
        handleOpenCouponUsers,
    } = useCoupons();

    useEffect(() => {
        fetchCoupons();
    }, []);

    return (
        <>
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Gerenciamento de Cupons de Desconto</h3>
                        <p className="text-xs text-slate-500 font-medium">
                            Crie, edite e gerencie os cupons promocionais que concedem saldo de recarga para os usuários.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenCouponModal(null)}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/10 cursor-pointer flex items-center gap-1.5"
                    >
                        <Plus size={14} />
                        Criar Novo Cupom
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">Código</th>
                                <th className="py-4 px-6">Valor</th>
                                <th className="py-4 px-6">Descrição</th>
                                <th className="py-4 px-6">Público-Alvo</th>
                                <th className="py-4 px-6">Usos / Limite</th>
                                <th className="py-4 px-6">Expira Em</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingCoupons ? (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center text-sm font-semibold text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="animate-spin h-6 w-6 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                            <span>Buscando cupons no banco...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : coupons.length > 0 ? (
                                coupons.map((coupon) => (
                                    <tr key={coupon._id} className="hover:bg-slate-50/40 transition-colors group">
                                        <td className="py-4 px-6">
                                            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 border border-purple-100/80 px-2.5 py-1 rounded-lg">
                                                {coupon.code}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-extrabold text-slate-800">
                                                {(coupon.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-500 font-medium max-w-[180px] truncate" title={coupon.description}>
                                            {coupon.description || '-'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                coupon.targetAudience === 'client' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                coupon.targetAudience === 'professional' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                'bg-slate-50 text-slate-700 border-slate-100'
                                            }`}>
                                                {coupon.targetAudience === 'client' ? 'Usuários' :
                                                 coupon.targetAudience === 'professional' ? 'Perfis Monetizados' : 'Todos'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <button
                                                onClick={() => handleOpenCouponUsers(coupon)}
                                                className="text-xs font-semibold text-slate-650 hover:text-purple-600 transition-colors flex items-center gap-1 group/use cursor-pointer"
                                            >
                                                <span>{coupon.totalUses}{coupon.maxUses !== null && coupon.maxUses !== undefined ? ` / ${coupon.maxUses}` : ''}</span>
                                                <Eye size={12} className="text-slate-400 group-hover/use:text-purple-600 transition-colors" />
                                            </button>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-500 font-semibold">
                                            {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('pt-BR') : 'Sem expiração'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                coupon.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                                            }`}>
                                                <span className={`w-1 h-1 rounded-full ${coupon.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                {coupon.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => handleOpenCouponUsers(coupon)} className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95" title="Visualizar resgates">
                                                    <Eye size={13} />
                                                </button>
                                                <button onClick={() => handleOpenCouponModal(coupon)} className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95" title="Editar cupom">
                                                    <Sliders size={13} />
                                                </button>
                                                <button onClick={() => handleDeleteCoupon(coupon._id, coupon.code)} className="p-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg cursor-pointer transition-all shadow-sm active:scale-95" title="Excluir cupom">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center text-sm font-semibold text-slate-400">
                                        Nenhum cupom de desconto cadastrado no sistema.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Criar / Editar cupom */}
            {couponModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                                    <Ticket size={20} />
                                </div>
                                <div>
                                    <h3 className="text-slate-800 text-base font-bold tracking-tight">
                                        {selectedCoupon ? 'Editar Cupom de Desconto' : 'Criar Novo Cupom'}
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-0.5">
                                        {selectedCoupon ? 'Altere as configurações do cupom existente.' : 'Preencha os campos para cadastrar um cupom no banco.'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setCouponModalOpen(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCoupon} className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Código do Cupom</label>
                                        <input type="text" required value={cpCode} onChange={(e) => setCpCode(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="EX: PROMO100" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-semibold text-slate-800 uppercase" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Valor do Crédito (R$)</label>
                                        <input type="number" required step="0.01" min="0.01" value={cpAmount} onChange={(e) => setCpAmount(e.target.value)} placeholder="50,00" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-semibold text-slate-850" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Descrição</label>
                                    <input type="text" value={cpDescription} onChange={(e) => setCpDescription(e.target.value)} placeholder="EX: Cupom promocional de R$ 50 para novos usuários" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Público-Alvo</label>
                                        <select value={cpTargetAudience} onChange={(e) => setCpTargetAudience(e.target.value as any)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-semibold text-slate-700 cursor-pointer">
                                            <option value="all">Todos os usuários</option>
                                            <option value="client">Apenas Usuários (compradores)</option>
                                            <option value="professional">Apenas Perfis Monetizados</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Limite de Usos (Max)</label>
                                        <input type="number" min="1" value={cpMaxUses} onChange={(e) => setCpMaxUses(e.target.value)} placeholder="Ilimitado" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center pt-4 border-t border-slate-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Data de Expiração</label>
                                        <input type="date" value={cpExpiresAt} onChange={(e) => setCpExpiresAt(e.target.value)} className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 cursor-pointer" />
                                    </div>
                                    <div className="pt-5 pl-2">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="checkbox" checked={cpIsActive} onChange={(e) => setCpIsActive(e.target.checked)} className="accent-purple-600 rounded cursor-pointer w-4 h-4" />
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-purple-600 transition-colors select-none">Cupom Ativo</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                                <button type="button" onClick={() => setCouponModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all cursor-pointer bg-white">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/10 cursor-pointer transition-all">
                                    {selectedCoupon ? 'Salvar Alterações' : 'Criar Cupom'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Usuários que usaram o cupom */}
            {couponUsersModalOpen && auditedCoupon && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h3 className="text-slate-800 text-base font-bold tracking-tight">
                                        Histórico de Resgates — Cupom <strong className="font-mono text-purple-700">{auditedCoupon.code}</strong>
                                    </h3>
                                    <p className="text-slate-500 text-xs mt-0.5">
                                        Resgatado {couponUsers.length} {couponUsers.length === 1 ? 'vez' : 'vezes'} · Valor individual: R$ {(auditedCoupon.amount / 100).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setCouponUsersModalOpen(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                                <input type="text" placeholder="Pesquisar por nome ou e-mail na lista de resgates..." value={couponUsersSearch} onChange={(e) => setCouponUsersSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingCouponUsers ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="h-7 w-7 text-purple-600 animate-spin" />
                                    <span className="text-xs font-semibold text-slate-400">Buscando transações de resgate...</span>
                                </div>
                            ) : couponUsers.length > 0 ? (() => {
                                const filtered = couponUsers.filter(u =>
                                    u.name.toLowerCase().includes(couponUsersSearch.toLowerCase()) ||
                                    u.username.toLowerCase().includes(couponUsersSearch.toLowerCase()) ||
                                    u.email.toLowerCase().includes(couponUsersSearch.toLowerCase())
                                );
                                if (filtered.length === 0) {
                                    return <div className="py-20 text-center text-xs font-bold text-slate-400">Nenhum usuário correspondente à pesquisa.</div>;
                                }
                                return (
                                    <div className="divide-y divide-slate-100">
                                        {filtered.map((u, index) => (
                                            <div key={index} className="flex items-center justify-between py-3.5 first:pt-0">
                                                <div className="flex items-center gap-3 min-w-0 pr-3">
                                                    <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-sm">
                                                        {u.photoUrl ? <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" /> : getInitials(u.name)}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-bold text-slate-800 truncate leading-tight">{u.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{u.email}</span>
                                                        <code className="text-[8px] font-mono text-slate-400 mt-1 truncate">@{u.username || 'sem_username'} · {u.clerkId}</code>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Resgatado em</span>
                                                    <span className="text-xs text-slate-600 font-bold mt-0.5 block">{new Date(u.claimedAt).toLocaleString('pt-BR')}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })() : (
                                <div className="py-20 text-center text-xs font-semibold text-slate-400">Nenhum resgate registrado para este cupom ainda.</div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button onClick={() => setCouponUsersModalOpen(false)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md shadow-slate-800/10">
                                Fechar Auditoria
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
