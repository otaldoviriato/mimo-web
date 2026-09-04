'use client';

import React, { useState } from 'react';
import { Menu, Search, ArrowRight } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface DashboardHeaderProps {
    title: string;
    children?: React.ReactNode;
    onMenuToggle?: () => void;
}

export function DashboardHeader({ title, children, onMenuToggle }: DashboardHeaderProps) {
    const router = useRouter();
    const [quickSearch, setQuickSearch] = useState('');
    const [searching, setSearching] = useState(false);

    const formattedDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const handleQuickSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const term = quickSearch.trim();
        if (!term) return;

        // Se for um ID do Clerk direto (ex: user_3Fh6kR...)
        if (/^user_[A-Za-z0-9]+$/.test(term)) {
            router.push(`/admin/users/${term}`);
            setQuickSearch('');
            return;
        }

        // Se for um virtualRoomId com dois IDs (ex: user_A_user_B)
        const matchedTokens = term.match(/user_[A-Za-z0-9]+/g);
        if (matchedTokens && matchedTokens.length >= 1) {
            router.push(`/admin/users/${matchedTokens[0]}`);
            setQuickSearch('');
            return;
        }

        // Caso seja username ou nome, busca na API para ver se acha
        setSearching(true);
        try {
            const clean = term.replace('@', '');
            const res = await fetch(`/api/admin/users?q=${encodeURIComponent(clean)}&limit=1`);
            if (res.ok) {
                const data = await res.json();
                if (data.users && data.users.length > 0) {
                    router.push(`/admin/users/${data.users[0].clerkId}`);
                    setQuickSearch('');
                    return;
                }
            }
            // Se não achar direto, redireciona para a lista de profissionais com o filtro
            router.push(`/admin/professionals`);
            toast('Nenhum usuário exato encontrado. Verifique na lista.', { icon: '🔍' });
        } catch {
            router.push(`/admin/professionals`);
        } finally {
            setSearching(false);
        }
    };

    return (
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 z-10 shadow-xs">
            {/* Linha superior: hamburger + título + avatar (mobile) */}
            <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Botão hamburger — só no mobile */}
                <button
                    onClick={onMenuToggle}
                    className="md:hidden p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200 cursor-pointer"
                    aria-label="Abrir menu"
                >
                    <Menu size={22} />
                </button>

                {/* Título e data */}
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight capitalize truncate">
                        {title}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 hidden sm:block">
                        {capitalize(formattedDate)}
                    </p>
                </div>

                {/* Ações — movidas para cá no mobile para ficarem na mesma linha */}
                <div className="flex items-center gap-3 md:hidden">
                    <UserButton />
                </div>
            </div>

            {/* Busca Rápida por ID / Usuário no Topo */}
            <form onSubmit={handleQuickSearch} className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                    type="text"
                    placeholder="Buscar por ID ou @user..."
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    disabled={searching}
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition-all font-medium placeholder-slate-400 text-slate-700"
                />
                {quickSearch && (
                    <button
                        type="submit"
                        disabled={searching}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-700 p-0.5 cursor-pointer"
                        title="Buscar"
                    >
                        <ArrowRight size={14} />
                    </button>
                )}
            </form>

            {/* Filtros (ex: seletor de período) */}
            {children && (
                <div className="flex items-center gap-2 flex-wrap">
                    {children}
                </div>
            )}

            {/* Ações e perfil — só visíveis no desktop */}
            <div className="hidden md:flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col text-right">
                        <span className="text-sm font-bold text-slate-800 leading-tight">Admin Mimo</span>
                        <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full self-end border border-purple-100 mt-0.5">
                            Super Admin
                        </span>
                    </div>
                    <UserButton />
                </div>
            </div>
        </header>
    );
}
