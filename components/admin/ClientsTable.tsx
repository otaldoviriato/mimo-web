'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, MoreVertical, ShieldCheck, Mail, Calendar, Coins, Edit, Trash2, X, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function ClientsTable() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserMenu, setSelectedUserMenu] = useState<string | null>(null);

    // Busca os usuários da API
    const fetchUsers = async (query: string = '') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                // Filtra apenas clientes (!isProfessional)
                const allUsers = data.users || [];
                const clientsOnly = allUsers.filter((u: any) => !u.isProfessional);
                setUsers(clientsOnly);
            } else {
                toast.error('Erro ao buscar clientes do banco de dados.');
            }
        } catch (err) {
            console.error('Erro ao carregar clientes:', err);
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
        if (!confirm(`ATENÇÃO: Você tem certeza que deseja EXCLUIR permanentemente o cliente "${name}"?\nEsta ação apagará a conta do banco de dados e do Clerk de forma definitiva. Esta ação não poderá ser desfeita.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/users/${clerkId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Cliente excluído com sucesso!', {
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
                        Clientes Cadastrados
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Pesquise clientes, acesse suas configurações de perfil ou gerencie suas contas.
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
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin h-8 w-8 text-purple-600 rounded-full border-4 border-slate-200 border-t-purple-600" />
                        <span className="text-sm font-semibold text-slate-500">Buscando clientes no banco...</span>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">Usuário</th>
                                <th className="py-4 px-6">Saldo da Carteira</th>
                                <th className="py-4 px-6">WhatsApp / Telefone</th>
                                <th className="py-4 px-6">Cadastro</th>
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

                                        {/* Cadastro */}
                                        <td className="py-4 px-6">
                                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                <Calendar size={13} className="text-slate-400" />
                                                {user.createdAt}
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
                                                                Excluir Cliente
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
                                        Nenhum cliente encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Rodapé / Informações */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold bg-slate-50/50 mt-auto">
                <span>Total de clientes mostrados: {users.length}</span>
                <span className="text-[10px] text-purple-500 uppercase tracking-widest font-black">MimoAdmin Clientes</span>
            </div>
        </div>
    );
}
