'use client';

import React from 'react';
import { Bell, Search, User } from 'lucide-react';

interface DashboardHeaderProps {
    title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
    const formattedDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Capitaliza a primeira letra do dia da semana
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    return (
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 shadow-sm shadow-slate-100/40">
            {/* Boas-vindas e Data */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight capitalize">
                    {title}
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {capitalize(formattedDate)}
                </p>
            </div>

            {/* Ações e Info do Usuário */}
            <div className="flex items-center gap-4 self-end md:self-auto">
                {/* Notificações Mockadas */}
                <button className="relative p-2.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200 cursor-pointer group">
                    <Bell size={20} className="transition-transform duration-200 group-hover:rotate-12" />
                    {/* Badge de Alerta */}
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                </button>

                <div className="h-6 w-[1px] bg-slate-200" />

                {/* Perfil Admin */}
                <div className="flex items-center gap-3">
                    <div className="flex flex-col text-right">
                        <span className="text-sm font-bold text-slate-800 leading-tight">
                            Admin Mimo
                        </span>
                        <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full self-end border border-purple-100 mt-0.5">
                            Super Admin
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-purple-600/10 border-2 border-white">
                        AM
                    </div>
                </div>
            </div>
        </header>
    );
}
