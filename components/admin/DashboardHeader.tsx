'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

interface DashboardHeaderProps {
    title: string;
    children?: React.ReactNode;
    onMenuToggle?: () => void;
}

export function DashboardHeader({ title, children, onMenuToggle }: DashboardHeaderProps) {
    const formattedDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    return (
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 z-10 shadow-sm shadow-slate-100/40">
            {/* Linha superior: hamburger + título + notificação + avatar */}
            <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Botão hamburger — só no mobile */}
                <button
                    onClick={onMenuToggle}
                    className="md:hidden p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200"
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
