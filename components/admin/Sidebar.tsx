'use client';

import React from 'react';
import {
    LayoutDashboard,
    Users,
    UserCheck,
    MessageSquare,
    DollarSign,
    Settings,
    ArrowLeft,
    ShieldAlert,
    Wallet,
    Ticket,
    LifeBuoy,
    ClipboardList,
    TrendingUp,
    Mail,
    Send,
    X
} from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isOpen = false, onClose }: SidebarProps) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'professionals', label: 'Profissionais', icon: UserCheck },
        { id: 'rooms', label: 'Conversas', icon: MessageSquare },
        { id: 'financial', label: 'Financeiro', icon: DollarSign },
        { id: 'withdrawals', label: 'Solicitações de Saque', icon: Wallet },
        { id: 'coupons', label: 'Cupons de Desconto', icon: Ticket },
        { id: 'help-tickets', label: 'Tickets de Ajuda', icon: LifeBuoy },
        { id: 'institutional-emails', label: 'E-mails Institucionais', icon: Mail },
        { id: 'creator-applications', label: 'Inscrições de Criadoras', icon: ClipboardList },
    ];

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        onClose?.();
    };

    return (
        <>
            {/* Backdrop mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            <aside className={`
                fixed top-0 left-0 z-50 h-screen w-64
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                md:sticky md:top-0 md:z-auto md:translate-x-0 md:h-screen
                bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800
            `}>
                {/* Header / Logo */}
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="bg-purple-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/20 text-white flex items-center justify-center">
                        <ShieldAlert size={22} className="animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-lg leading-tight tracking-wide bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                            MimoAdmin
                        </h2>
                        <span className="text-xs text-purple-400 font-medium">Painel de Controle</span>
                    </div>
                    {/* Fechar no mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Fechar menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Menu Links */}
                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Menu Principal
                    </p>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const itemClassName = `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                            isActive
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/10'
                                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                        }`;

                        if ('href' in item && item.href) {
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={onClose}
                                    className={itemClassName}
                                >
                                    <Icon
                                        size={18}
                                        className={`transition-transform duration-200 group-hover:scale-110 ${
                                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'
                                        }`}
                                    />
                                    {item.label}
                                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
                                </Link>
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabChange(item.id)}
                                className={itemClassName}
                            >
                                <Icon
                                    size={18}
                                    className={`transition-transform duration-200 group-hover:scale-110 ${
                                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'
                                    }`}
                                />
                                {item.label}
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                )}
                            </button>
                        );
                    })}

                    <div className="pt-6 border-t border-slate-800/80 mt-6">
                        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                            Outros
                        </p>
                        <button
                            onClick={() => handleTabChange('settings')}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                                activeTab === 'settings'
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/10'
                                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                            }`}
                        >
                            <Settings
                                size={18}
                                className={`transition-transform duration-200 group-hover:scale-110 ${
                                    activeTab === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'
                                }`}
                            />
                            Configurações
                        </button>
                    </div>
                </nav>

                {/* Footer / Back to App */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/40">
                    <Link
                        href="/"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-xl transition-all duration-150 border border-slate-700 hover:border-slate-600"
                    >
                        <ArrowLeft size={14} />
                        Voltar ao MimoChat
                    </Link>
                </div>
            </aside>
        </>
    );
}
