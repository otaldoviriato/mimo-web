'use client';

import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, ShieldCheck, Mail, Calendar, UserX, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function TeamTable() {
    const router = useRouter();
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserMenu, setSelectedUserMenu] = useState<string | null>(null);

    const fetchTeamMembers = async (query: string = '') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}&role=team&limit=500`);
            if (res.ok) {
                const data = await res.json();
                setTeamMembers(data.users || []);
            } else {
                toast.error('Erro ao buscar membros da equipe.');
            }
        } catch (err) {
            console.error('Erro ao carregar membros da equipe:', err);
            toast.error('Falha de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTeamMembers(searchQuery);
        }, searchQuery ? 400 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleRemoveFromTeam = async (clerkId: string, name: string) => {
        if (!confirm(`Deseja remover "${name}" da Equipe Mimo?\nEle retornará à classificação de cliente normal.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/users/${clerkId}/team-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isTeam: false })
            });

            if (res.ok) {
                toast.success(`"${name}" foi removido da equipe.`, {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF' }
                });
                setTeamMembers(prev => prev.filter(u => u.clerkId !== clerkId));
                setSelectedUserMenu(null);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao remover da equipe.');
            }
        } catch (err) {
            console.error('Erro ao remover da equipe:', err);
            toast.error('Erro de conexão ao tentar remover.');
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
            <div className="p-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-purple-600" />
                        Membros da Equipe Mimo
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Gerencie os agentes de ativação e suporte do MimoChat.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar nome ou e-mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition-all font-medium text-slate-700"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin h-8 w-8 text-purple-600 rounded-full border-4 border-slate-200 border-t-purple-600" />
                        <span className="text-sm font-semibold text-slate-500">Buscando membros da equipe...</span>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">Membro</th>
                                <th className="py-4 px-6">Selo de Identidade</th>
                                <th className="py-4 px-6">Conversas Iniciadas</th>
                                <th className="py-4 px-6">WhatsApp / Telefone</th>
                                <th className="py-4 px-6">Data de Cadastro</th>
                                <th className="py-4 px-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {teamMembers.length > 0 ? (
                                teamMembers.map((user) => (
                                    <tr 
                                        key={user.clerkId}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {user.photoUrl ? (
                                                    <img src={user.photoUrl} alt={user.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm border border-purple-200">
                                                        {getInitials(user.name)}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors flex items-center gap-1.5">
                                                        {user.name}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                        <Mail size={12} />
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <ShieldCheck size={14} className="text-emerald-600" />
                                                {user.teamTitle || 'Equipe Mimo ✓'}
                                            </span>
                                        </td>

                                        <td className="py-4 px-6">
                                            <span className="text-xs font-bold text-slate-700">
                                                {user.roomsCount || 0} conversas de ativação
                                            </span>
                                        </td>

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

                                        <td className="py-4 px-6">
                                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                <Calendar size={13} className="text-slate-400" />
                                                {user.createdAt}
                                            </span>
                                        </td>

                                        <td className="py-4 px-6 text-center relative">
                                            <button
                                                onClick={() => setSelectedUserMenu(selectedUserMenu === user.clerkId ? null : user.clerkId)}
                                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {selectedUserMenu === user.clerkId && (
                                                <>
                                                    <div 
                                                        className="fixed inset-0 z-20" 
                                                        onClick={() => setSelectedUserMenu(null)}
                                                    />
                                                    <div 
                                                        className="absolute right-6 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 animate-fade-in-up"
                                                    >
                                                        <button
                                                            onClick={() => handleRemoveFromTeam(user.clerkId, user.name)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer text-left"
                                                        >
                                                            <UserX size={14} className="text-rose-500" />
                                                            Remover da Equipe
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-sm font-semibold text-slate-400">
                                        Nenhum membro da equipe cadastrado no momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold bg-slate-50/50 mt-auto">
                <span>Total de membros da equipe: {teamMembers.length}</span>
                <span className="text-[10px] text-purple-600 uppercase tracking-widest font-black">Equipe Mimo</span>
            </div>
        </div>
    );
}
