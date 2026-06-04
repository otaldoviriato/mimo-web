'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, MoreVertical, ShieldCheck, Mail, Calendar, Coins, Edit, Trash2, X, FileText, Phone, Key, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function UserTable() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'Todos' | 'Cliente' | 'Profissional'>('Todos');
    const [selectedUserMenu, setSelectedUserMenu] = useState<string | null>(null);

    // Estados da Modal de Edição
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editBalance, setEditBalance] = useState<number>(0);
    const [editIsProfessional, setEditIsProfessional] = useState(false);
    const [editTaxId, setEditTaxId] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editPixKey, setEditPixKey] = useState('');
    const [saving, setSaving] = useState(false);

    // Busca os usuários da API
    const fetchUsers = async (query: string = '') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            } else {
                toast.error('Erro ao buscar usuários do banco de dados.');
            }
        } catch (err) {
            console.error('Erro ao carregar usuários:', err);
            toast.error('Falha de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    // Debounce para a barra de pesquisa
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filtros combinados no frontend para tipo de usuário
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            if (roleFilter === 'Todos') return true;
            if (roleFilter === 'Profissional') return user.isProfessional;
            if (roleFilter === 'Cliente') return !user.isProfessional;
            return true;
        });
    }, [users, roleFilter]);

    // Ação: Excluir Usuário permanentemente do banco e do Clerk
    const handleDeleteUser = async (clerkId: string, name: string) => {
        if (!confirm(`ATENÇÃO: Você tem certeza que deseja EXCLUIR permanentemente o usuário "${name}"?\nEsta ação apagará a conta do banco de dados e do Clerk de forma definitiva. Esta ação não poderá ser desfeita.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/users/${clerkId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Usuário excluído com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                });
                setUsers(prev => prev.filter(u => u.clerkId !== clerkId));
                setSelectedUserMenu(null);
                if (editingUser?.clerkId === clerkId) {
                    setEditingUser(null);
                }
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao excluir usuário.');
            }
        } catch (err) {
            console.error('Erro ao excluir:', err);
            toast.error('Erro de conexão ao tentar excluir.');
        }
    };

    // Ação rápida: Alterar tipo de perfil (Profissional / Cliente)
    const handleToggleProfessional = async (clerkId: string, currentIsProfessional: boolean) => {
        const newIsProfessional = !currentIsProfessional;
        try {
            const res = await fetch(`/api/admin/users/${clerkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isProfessional: newIsProfessional })
            });

            if (res.ok) {
                toast.success(newIsProfessional ? 'Usuário promovido a Profissional!' : 'Usuário alterado para Cliente!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                });
                setUsers(prev => prev.map(u => u.clerkId === clerkId ? { ...u, isProfessional: newIsProfessional } : u));
                setSelectedUserMenu(null);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao alterar tipo do usuário.');
            }
        } catch (err) {
            console.error('Erro ao atualizar tipo:', err);
            toast.error('Erro de conexão ao tentar atualizar.');
        }
    };

    // Ação: Abrir modal de edição completa
    const handleOpenEdit = (user: any) => {
        setEditingUser(user);
        setEditName(user.name || '');
        setEditEmail(user.email || '');
        setEditBalance((user.balance || 0) / 100);
        setEditIsProfessional(user.isProfessional || false);
        setEditTaxId(user.taxId || '');
        setEditPhone(user.phone || '');
        setEditPixKey(user.pixKey || '');
        setSelectedUserMenu(null);
    };

    // Ação: Salvar edição completa do usuário
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setSaving(true);

        try {
            const res = await fetch(`/api/admin/users/${editingUser.clerkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName,
                    email: editEmail,
                    balance: editBalance * 100,
                    isProfessional: editIsProfessional,
                    taxId: editTaxId,
                    phone: editPhone,
                    pixKey: editPixKey,
                })
            });

            if (res.ok) {
                toast.success('Usuário atualizado com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                });
                setUsers(prev => prev.map(u => u.clerkId === editingUser.clerkId ? {
                    ...u,
                    name: editName,
                    email: editEmail,
                    balance: editBalance * 100,
                    isProfessional: editIsProfessional,
                    taxId: editTaxId,
                    phone: editPhone,
                    pixKey: editPixKey,
                } : u));
                setEditingUser(null);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao atualizar usuário.');
            }
        } catch (err) {
            console.error('Erro ao salvar edições:', err);
            toast.error('Erro de conexão ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full relative">
            {/* Título e Ações Superiores */}
            <div className="p-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                        Gerenciamento de Usuários
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Pesquise, edite saldos e perfis, ou remova contas cadastradas na base.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Barra de Busca */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar nome, username ou e-mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition-all font-medium placeholder-slate-400 text-slate-700"
                        />
                    </div>

                    {/* Filtro de Tipo */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                        {(['Todos', 'Cliente', 'Profissional'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setRoleFilter(filter)}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                                    roleFilter === filter
                                        ? 'bg-white text-purple-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin h-8 w-8 text-purple-600 rounded-full border-4 border-slate-200 border-t-purple-600" />
                        <span className="text-sm font-semibold text-slate-500">Buscando contas no banco...</span>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">Usuário</th>
                                <th className="py-4 px-6">Tipo</th>
                                <th className="py-4 px-6">Saldo</th>
                                <th className="py-4 px-6">Cadastro</th>
                                <th className="py-4 px-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.clerkId} className="hover:bg-slate-50/40 transition-colors group">
                                        {/* Info Usuário */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {user.photoUrl ? (
                                                    <img src={user.photoUrl} alt={user.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-100">
                                                        {getInitials(user.name)}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                                                        {user.name}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                        <Mail size={12} />
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Cargo/Tipo */}
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                user.isProfessional
                                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                                {user.isProfessional && <ShieldCheck size={12} />}
                                                {user.isProfessional ? 'Profissional' : 'Cliente'}
                                            </span>
                                        </td>

                                        {/* Saldo */}
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                <Coins size={14} className="text-amber-500" />
                                                {((user.balance || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </td>

                                        {/* Cadastro */}
                                        <td className="py-4 px-6">
                                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                <Calendar size={13} className="text-slate-400" />
                                                {user.createdAt}
                                            </span>
                                        </td>

                                        {/* Ações */}
                                        <td className="py-4 px-6 text-center relative">
                                            <button
                                                onClick={() => setSelectedUserMenu(selectedUserMenu === user.clerkId ? null : user.clerkId)}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {/* Dropdown de Ações */}
                                            {selectedUserMenu === user.clerkId && (
                                                <>
                                                    <div 
                                                        className="fixed inset-0 z-20" 
                                                        onClick={() => setSelectedUserMenu(null)}
                                                    />
                                                    <div className="absolute right-6 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 divide-y divide-slate-50 animate-fade-in-up">
                                                        <div className="py-1">
                                                            <button
                                                                onClick={() => handleOpenEdit(user)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-left"
                                                            >
                                                                <Edit size={14} className="text-slate-400" />
                                                                Editar Completo
                                                            </button>

                                                            <button
                                                                onClick={() => handleToggleProfessional(user.clerkId, user.isProfessional)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-left"
                                                            >
                                                                <UserCheck size={14} className="text-indigo-500" />
                                                                {user.isProfessional ? 'Tornar Cliente' : 'Tornar Profissional'}
                                                            </button>
                                                        </div>

                                                        <div className="py-1">
                                                            <button
                                                                onClick={() => handleDeleteUser(user.clerkId, user.name)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer text-left"
                                                            >
                                                                <Trash2 size={14} className="text-rose-500" />
                                                                Excluir Usuário
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-sm font-semibold text-slate-400">
                                        Nenhum usuário encontrado na base de dados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Rodapé / Informações */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold bg-slate-50/50 mt-auto">
                <span>Total de registros mostrados: {filteredUsers.length}</span>
                <span className="text-[10px] text-purple-500 uppercase tracking-widest font-black">MimoAdmin Base Real</span>
            </div>

            {/* Modal de Edição Completa */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
                        {/* Header Modal */}
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-200">
                                    <Edit size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-base leading-tight">Editar Conta do Usuário</h4>
                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Clerk ID: {editingUser.clerkId}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setEditingUser(null)}
                                className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Nome do Usuário</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-bold text-slate-700"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">E-mail</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-bold text-slate-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                        <Coins size={12} className="text-amber-500" />
                                        Saldo da Carteira (R$)
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        value={editBalance}
                                        onChange={(e) => setEditBalance(Number(e.target.value))}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-bold text-slate-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                        <FileText size={12} className="text-slate-400" />
                                        CPF/CNPJ
                                    </label>
                                    <input 
                                        type="text" 
                                        value={editTaxId}
                                        onChange={(e) => setEditTaxId(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-bold text-slate-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                        <Phone size={12} className="text-slate-400" />
                                        Telefone
                                    </label>
                                    <input 
                                        type="text" 
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-bold text-slate-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                        <Key size={12} className="text-slate-400" />
                                        Chave PIX
                                    </label>
                                    <input 
                                        type="text" 
                                        value={editPixKey}
                                        onChange={(e) => setEditPixKey(e.target.value)}
                                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <input 
                                        type="checkbox"
                                        checked={editIsProfessional}
                                        onChange={(e) => setEditIsProfessional(e.target.checked)}
                                        className="accent-purple-600 rounded cursor-pointer w-4 h-4"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-slate-700 group-hover:text-purple-600 transition-colors block">Perfil Profissional</span>
                                        <span className="text-[10px] text-slate-400 font-medium block">Pode definir preços por caractere e receber pagamentos.</span>
                                    </div>
                                </label>
                            </div>

                            {/* Footer Modal Actions */}
                            <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                                <button 
                                    type="button"
                                    onClick={() => handleDeleteUser(editingUser.clerkId, editName)}
                                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-100 cursor-pointer transition-colors flex items-center gap-1.5"
                                >
                                    <Trash2 size={13} />
                                    Excluir Conta
                                </button>
                                
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-purple-600/10"
                                    >
                                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
