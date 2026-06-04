'use client';

import React, { useState, useMemo } from 'react';
import { Search, Ban, CheckCircle, MoreVertical, ShieldCheck, Mail, Calendar, Coins } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserMock {
    id: string;
    name: string;
    email: string;
    status: 'Ativo' | 'Banido';
    balance: number;
    createdAt: string;
    role: string;
}

const initialUsers: UserMock[] = [
    { id: '1', name: 'Carlos Oliveira', email: 'c.oliveira@gmail.com', status: 'Ativo', balance: 150.00, createdAt: '15/05/2026', role: 'Cliente' },
    { id: '2', name: 'Mariana Costa', email: 'mari.costa@mimo.chat', status: 'Ativo', balance: 450.00, createdAt: '22/05/2026', role: 'Profissional' },
    { id: '3', name: 'João Sousa', email: 'joao.sousa@yahoo.com', status: 'Banido', balance: 0.00, createdAt: '10/04/2026', role: 'Cliente' },
    { id: '4', name: 'Beatriz Lima', email: 'beatriz.l@outlook.com', status: 'Ativo', balance: 80.00, createdAt: '01/06/2026', role: 'Cliente' },
    { id: '5', name: 'Roberto Santos', email: 'roberto.s@gmail.com', status: 'Ativo', balance: 25.00, createdAt: '03/06/2026', role: 'Cliente' },
    { id: '6', name: 'Amanda Silva', email: 'amandinha@mimo.chat', status: 'Banido', balance: 12.50, createdAt: '18/05/2026', role: 'Profissional' },
    { id: '7', name: 'Felipe Rodrigues', email: 'felipe.rod@gmail.com', status: 'Ativo', balance: 1200.00, createdAt: '30/05/2026', role: 'Cliente' },
];

export function UserTable() {
    const [users, setUsers] = useState<UserMock[]>(initialUsers);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Banido'>('Todos');
    const [selectedUserMenu, setSelectedUserMenu] = useState<string | null>(null);

    // Lógica de busca e filtros
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = 
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesStatus = 
                statusFilter === 'Todos' || 
                user.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [users, searchQuery, statusFilter]);

    // Função para alterar status do usuário (Banir / Reativar)
    const toggleUserStatus = (id: string, currentStatus: 'Ativo' | 'Banido') => {
        const newStatus = currentStatus === 'Ativo' ? 'Banido' : 'Ativo';
        
        setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
        setSelectedUserMenu(null);

        if (newStatus === 'Banido') {
            toast.success(`Usuário banido com sucesso! (Simulado)`, {
                icon: '🚫',
                style: {
                    borderRadius: '12px',
                    background: '#1E293B',
                    color: '#FFF',
                    fontWeight: 600,
                }
            });
        } else {
            toast.success(`Usuário reativado com sucesso! (Simulado)`, {
                icon: '✅',
                style: {
                    borderRadius: '12px',
                    background: '#1E293B',
                    color: '#FFF',
                    fontWeight: 600,
                }
            });
        }
    };

    // Gera um avatar inicial circular elegante baseado nas iniciais
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
            {/* Título e Ações Superiores */}
            <div className="p-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                        Gerenciamento de Usuários
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Pesquise, filtre e gerencie as contas cadastradas na plataforma.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Barra de Busca */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar nome ou e-mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition-all font-medium placeholder-slate-400 text-slate-700"
                        />
                    </div>

                    {/* Filtro de Status */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
                        {(['Todos', 'Ativo', 'Banido'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                                    statusFilter === filter
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
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <th className="py-4 px-6">Usuário</th>
                            <th className="py-4 px-6">Tipo</th>
                            <th className="py-4 px-6">Saldo</th>
                            <th className="py-4 px-6">Cadastro</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/40 transition-colors group">
                                    {/* Info Usuário */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-100">
                                                {getInitials(user.name)}
                                            </div>
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
                                            user.role === 'Profissional'
                                                ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}>
                                            {user.role === 'Profissional' && <ShieldCheck size={12} />}
                                            {user.role}
                                        </span>
                                    </td>

                                    {/* Saldo */}
                                    <td className="py-4 px-6">
                                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                            <Coins size={14} className="text-amber-500" />
                                            {user.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </td>

                                    {/* Cadastro */}
                                    <td className="py-4 px-6">
                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                            <Calendar size={13} className="text-slate-400" />
                                            {user.createdAt}
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                            user.status === 'Ativo'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            {user.status}
                                        </span>
                                    </td>

                                    {/* Ações */}
                                    <td className="py-4 px-6 text-center relative">
                                        <button
                                            onClick={() => setSelectedUserMenu(selectedUserMenu === user.id ? null : user.id)}
                                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        {/* Dropdown de Ações */}
                                        {selectedUserMenu === user.id && (
                                            <>
                                                {/* Overlay para fechar */}
                                                <div 
                                                    className="fixed inset-0 z-20" 
                                                    onClick={() => setSelectedUserMenu(null)}
                                                />
                                                <div className="absolute right-6 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 animate-fade-in-up">
                                                    <button
                                                        onClick={() => toggleUserStatus(user.id, user.status)}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-left cursor-pointer transition-colors ${
                                                            user.status === 'Ativo' 
                                                                ? 'text-rose-600 hover:bg-rose-50' 
                                                                : 'text-emerald-600 hover:bg-emerald-50'
                                                        }`}
                                                    >
                                                        {user.status === 'Ativo' ? (
                                                            <>
                                                                <Ban size={14} />
                                                                Banir Usuário
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle size={14} />
                                                                Ativar Usuário
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">
                                    Nenhum usuário encontrado para esta busca ou filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginação Mockada */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold bg-slate-50/50 mt-auto">
                <span>Exibindo {filteredUsers.length} de {users.length} usuários</span>
                <div className="flex gap-2">
                    <button disabled className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-400 cursor-not-allowed opacity-50 font-bold">
                        Anterior
                    </button>
                    <button disabled className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-400 cursor-not-allowed opacity-50 font-bold">
                        Próxima
                    </button>
                </div>
            </div>
        </div>
    );
}
