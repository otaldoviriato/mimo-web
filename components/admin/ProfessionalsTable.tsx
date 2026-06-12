'use client';

import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, ShieldCheck, Mail, Calendar, Coins, Edit, Trash2, X, Phone, UserCheck, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function ProfessionalsTable() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserMenu, setSelectedUserMenu] = useState<string | null>(null);

    const [showAddEmailModal, setShowAddEmailModal] = useState(false);
    const [preAddedEmails, setPreAddedEmails] = useState<any[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingPreAdded, setIsLoadingPreAdded] = useState(false);

    // Busca a lista de e-mails pré-adicionados do banco
    const fetchPreAddedEmails = async () => {
        setIsLoadingPreAdded(true);
        try {
            const res = await fetch('/api/admin/professional-emails');
            if (res.ok) {
                const data = await res.json();
                setPreAddedEmails(data.emails || []);
            } else {
                toast.error('Erro ao buscar lista de e-mails autorizados.');
            }
        } catch (err) {
            console.error('Erro ao carregar e-mails autorizados:', err);
            toast.error('Falha de conexão ao carregar e-mails.');
        } finally {
            setIsLoadingPreAdded(false);
        }
    };

    // Efeito para carregar e-mails pré-adicionados quando o modal abre
    useEffect(() => {
        if (showAddEmailModal) {
            fetchPreAddedEmails();
        }
    }, [showAddEmailModal]);

    // Ação: Adicionar e-mail de profissional
    const handleAddEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/professional-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail })
            });

            const data = await res.json();

            if (res.ok) {
                if (data.status === 'promoted') {
                    toast.success(data.message, {
                        duration: 5000,
                        style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                    });
                    // Recarrega a lista de profissionais da tabela principal
                    fetchUsers(searchQuery);
                    setShowAddEmailModal(false);
                } else if (data.status === 'already_professional') {
                    toast.error(data.message);
                } else {
                    toast.success(data.message || 'E-mail adicionado com sucesso!', {
                        style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                    });
                    setNewEmail('');
                    fetchPreAddedEmails();
                }
            } else {
                toast.error(data.error || 'Erro ao adicionar e-mail.');
            }
        } catch (err) {
            console.error('Erro ao adicionar e-mail:', err);
            toast.error('Erro de conexão ao tentar adicionar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Ação: Deletar e-mail da lista de pré-adicionados
    const handleDeletePreAddedEmail = async (email: string) => {
        if (!confirm(`Remover o e-mail "${email}" da lista de autorizados?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/professional-emails?email=${encodeURIComponent(email)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('E-mail removido com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                });
                setPreAddedEmails(prev => prev.filter(item => item.email !== email));
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao remover e-mail.');
            }
        } catch (err) {
            console.error('Erro ao deletar e-mail:', err);
            toast.error('Erro de conexão ao tentar remover e-mail.');
        }
    };

    // Busca os usuários da API
    const fetchUsers = async (query: string = '') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                // Filtra apenas profissionais (isProfessional)
                const allUsers = data.users || [];
                const professionalsOnly = allUsers.filter((u: any) => u.isProfessional);
                setUsers(professionalsOnly);
            } else {
                toast.error('Erro ao buscar profissionais do banco de dados.');
            }
        } catch (err) {
            console.error('Erro ao carregar profissionais:', err);
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

    // Ação: Excluir Usuário permanentemente do banco e do Clerk
    const handleDeleteUser = async (clerkId: string, name: string) => {
        if (!confirm(`ATENÇÃO: Você tem certeza que deseja EXCLUIR permanentemente a profissional "${name}"?\nEsta ação apagará a conta do banco de dados e do Clerk de forma definitiva. Esta ação não poderá ser desfeita.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/users/${clerkId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Profissional excluída com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                });
                setUsers(prev => prev.filter(u => u.clerkId !== clerkId));
                setSelectedUserMenu(null);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao excluir usuário.');
            }
        } catch (err) {
            console.error('Erro ao excluir:', err);
            toast.error('Erro de conexão ao tentar excluir.');
        }
    };

    // Ação rápida: Alterar tipo de perfil para Cliente (Tornar Cliente)
    const handleDemoteToClient = async (clerkId: string) => {
        try {
            const res = await fetch(`/api/admin/users/${clerkId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isProfessional: false })
            });

            if (res.ok) {
                toast.success('Perfil alterado para Cliente!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                });
                setUsers(prev => prev.filter(u => u.clerkId !== clerkId));
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

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const formatLastSeen = (lastSeenStr: string | null) => {
        if (!lastSeenStr) return 'Nunca';
        try {
            const date = new Date(lastSeenStr);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', ' às');
        } catch (e) {
            return 'N/A';
        }
    };

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full relative">
            {/* Título e Ações Superiores */}
            <div className="p-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                        Profissionais Cadastradas
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Pesquise profissionais, defina chaves PIX, gerencie assinaturas ou gerencie as contas e fotos de galeria.
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
                    {/* Botão de Adicionar Profissional */}
                    <button
                        onClick={() => setShowAddEmailModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-md shadow-purple-500/15 active:scale-[0.98] transition-all cursor-pointer"
                    >
                        <UserCheck size={16} />
                        Adicionar Profissional
                    </button>
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin h-8 w-8 text-purple-600 rounded-full border-4 border-slate-200 border-t-purple-600" />
                        <span className="text-sm font-semibold text-slate-500">Buscando profissionais no banco...</span>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">Profissional</th>
                                <th className="py-4 px-6">Saldo a Receber</th>
                                <th className="py-4 px-6">Chave PIX</th>
                                <th className="py-4 px-6">Telefone</th>
                                <th className="py-4 px-6">Valor Assinatura</th>
                                <th className="py-4 px-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr 
                                        key={user.clerkId} 
                                        onClick={() => router.push(`/admin/users/${user.clerkId}`)}
                                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                    >
                                        {/* Info Profissional */}
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
                                                    <span className="text-[10px] font-semibold flex items-center gap-1.5 mt-1 select-none text-slate-400">
                                                        {user.isOnline ? (
                                                            <>
                                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-white" />
                                                                <span className="text-emerald-600 font-bold">Online</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-white" />
                                                                <span>Visto por último: {formatLastSeen(user.lastSeen)}</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Saldo */}
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                                <Coins size={14} className="text-amber-500" />
                                                {((user.balance || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </td>

                                        {/* Chave PIX */}
                                        <td className="py-4 px-6">
                                            <span className="text-xs text-slate-600 font-bold flex items-center gap-1">
                                                {user.pixKey ? (
                                                    <>
                                                        <Key size={13} className="text-slate-400" />
                                                        {user.pixKey}
                                                    </>
                                                ) : (
                                                    <span className="text-rose-500 font-bold italic">Não cadastrada</span>
                                                )}
                                            </span>
                                        </td>

                                        {/* Telefone */}
                                        <td className="py-4 px-6">
                                            <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                                                {user.phone ? (
                                                    <>
                                                        <Phone size={13} className="text-slate-400" />
                                                        {user.phone}
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400 italic">Não informado</span>
                                                )}
                                            </span>
                                        </td>

                                        {/* Valor Assinatura */}
                                        <td className="py-4 px-6">
                                            <span className="text-sm font-semibold text-purple-600">
                                                {(user.subscriptionPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </td>

                                        {/* Ações */}
                                        <td className="py-4 px-6 text-center relative" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedUserMenu(selectedUserMenu === user.clerkId ? null : user.clerkId);
                                                }}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {/* Dropdown de Ações */}
                                            {selectedUserMenu === user.clerkId && (
                                                <>
                                                    <div 
                                                        className="fixed inset-0 z-20" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedUserMenu(null);
                                                        }}
                                                    />
                                                    <div 
                                                        className="absolute right-6 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 divide-y divide-slate-50 animate-fade-in-up"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="py-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedUserMenu(null);
                                                                    router.push(`/admin/users/${user.clerkId}`);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-left"
                                                            >
                                                                <Edit size={14} className="text-slate-400" />
                                                                Editar Perfil
                                                            </button>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDemoteToClient(user.clerkId);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer text-left"
                                                            >
                                                                <UserCheck size={14} className="text-indigo-500" />
                                                                Tornar Cliente
                                                            </button>
                                                        </div>

                                                        <div className="py-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteUser(user.clerkId, user.name);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer text-left"
                                                            >
                                                                <Trash2 size={14} className="text-rose-500" />
                                                                Excluir Conta
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
                                    <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                        Nenhuma profissional encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Rodapé / Informações */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold bg-slate-50/50 mt-auto">
                <span>Total de profissionais mostradas: {users.length}</span>
                <span className="text-[10px] text-purple-500 uppercase tracking-widest font-black">MimoAdmin Profissionais</span>
            </div>

            {/* Modal de Adicionar Profissional por E-mail */}
            {showAddEmailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
                    {/* Background click to close */}
                    <div className="absolute inset-0" onClick={() => setShowAddEmailModal(false)} />
                    
                    <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] text-slate-700">
                        {/* Header do Modal */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h4 className="text-base font-bold text-slate-800">
                                    Adicionar Nova Profissional
                                </h4>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    Cadastre o e-mail da profissional que será ativada automaticamente no cadastro.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowAddEmailModal(false)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Formulário */}
                        <form onSubmit={handleAddEmail} className="py-4 border-b border-slate-100">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                E-mail da Profissional
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    required
                                    placeholder="exemplo@mimo.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-md shadow-purple-500/15 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[100px]"
                                >
                                    {isSubmitting ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        'Adicionar'
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Lista de E-mails Pendentes */}
                        <div className="pt-4 flex flex-col flex-1 overflow-hidden">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                E-mails Pendentes de Cadastro ({preAddedEmails.length})
                            </h5>
                            
                            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[300px]">
                                {isLoadingPreAdded ? (
                                    <div className="py-8 flex flex-col items-center justify-center gap-2">
                                        <div className="animate-spin h-5 w-5 text-purple-600 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                        <span className="text-xs font-semibold text-slate-400">Carregando lista...</span>
                                    </div>
                                ) : preAddedEmails.length > 0 ? (
                                    preAddedEmails.map((item: any) => (
                                        <div 
                                            key={item._id}
                                            className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700">{item.email}</span>
                                                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    Adicionado em {new Date(item.createdAt).toLocaleDateString('pt-BR')} às {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePreAddedEmail(item.email);
                                                }}
                                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                                                title="Remover autorização"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-xs font-semibold text-slate-400 italic">
                                        Nenhum e-mail pendente de cadastro.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
