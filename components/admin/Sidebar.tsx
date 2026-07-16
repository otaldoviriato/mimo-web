'use client';

import React, { useState, useEffect } from 'react';
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
    Mail,
    X,
    Globe,
    Clock,
    Coins,
    Camera,
    CreditCard,
    Smartphone,
    ShieldCheck,
    ChevronDown,
    Compass,
} from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

const SETTINGS_TABS = [
    { id: 'settings-platform', label: 'Plataforma & Operação', icon: Globe },
    { id: 'settings-chat', label: 'Chat & Sessões', icon: Clock },
    { id: 'settings-explore', label: 'Explorar', icon: Compass },
    { id: 'settings-pricing', label: 'Precificação & Assinaturas', icon: Coins },
    { id: 'settings-profiles', label: 'Perfis & Galeria', icon: Camera },
    { id: 'settings-payments', label: 'Meios de Pagamento', icon: CreditCard },
    { id: 'settings-app', label: 'App & Experiência', icon: Smartphone },
    { id: 'settings-admins', label: 'Administradores', icon: ShieldCheck },
];

export function Sidebar({ activeTab, setActiveTab, isOpen = false, onClose }: SidebarProps) {
    const isOnSettingsTab = activeTab.startsWith('settings');
    const [settingsExpanded, setSettingsExpanded] = useState(isOnSettingsTab);

    useEffect(() => {
        if (isOnSettingsTab) setSettingsExpanded(true);
    }, [isOnSettingsTab]);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'clients', label: 'Usuários', icon: Users },
        { id: 'professionals', label: 'Perfis Monetizados', icon: UserCheck },
        { id: 'rooms', label: 'Conversas', icon: MessageSquare },
        { id: 'financial', label: 'Financeiro', icon: DollarSign },
        { id: 'help-tickets', label: 'Tickets de Ajuda', icon: LifeBuoy },
        { id: 'institutional-emails', label: 'E-mails Institucionais', icon: Mail },
        { id: 'identity-verifications', label: 'Verificações de Selos', icon: ShieldCheck },
    ];

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        onClose?.();
    };

    const menuItemCls = (id: string) =>
        `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
            activeTab === id
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/10'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
        }`;

    const iconCls = (id: string) =>
        `transition-transform duration-200 group-hover:scale-110 ${
            activeTab === id ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'
        }`;

    return (
        <>
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
                <div className="p-6 border-b border-slate-800 flex items-center gap-3 shrink-0">
                    <div className="bg-purple-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/20 text-white flex items-center justify-center">
                        <ShieldAlert size={22} className="animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-lg leading-tight tracking-wide bg-linear-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                            MimoAdmin
                        </h2>
                        <span className="text-xs text-purple-400 font-medium">Painel de Controle</span>
                    </div>
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
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabChange(item.id)}
                                className={menuItemCls(item.id)}
                            >
                                <Icon size={18} className={iconCls(item.id)} />
                                {item.label}
                                {activeTab === item.id && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                )}
                            </button>
                        );
                    })}

                    {/* Seção Configurações */}
                    <div className="pt-6 border-t border-slate-800/80 mt-6">
                        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                            Sistema
                        </p>

                        {/* Botão pai Configurações */}
                        <button
                            onClick={() => {
                                setSettingsExpanded(prev => !prev);
                                if (!isOnSettingsTab) handleTabChange('settings-platform');
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                                isOnSettingsTab
                                    ? 'bg-purple-600/15 text-purple-300 border border-purple-600/20'
                                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                            }`}
                        >
                            <Settings
                                size={18}
                                className={`transition-transform duration-200 group-hover:scale-110 ${
                                    isOnSettingsTab ? 'text-purple-400' : 'text-slate-400 group-hover:text-purple-400'
                                }`}
                            />
                            <span className="flex-1 text-left">Configurações</span>
                            <ChevronDown
                                size={14}
                                className={`text-slate-500 transition-transform duration-200 ${settingsExpanded ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* Sub-itens */}
                        {settingsExpanded && (
                            <div className="mt-1 ml-3 pl-3 border-l border-slate-700/60 space-y-0.5">
                                {SETTINGS_TABS.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabChange(item.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                                                isActive
                                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/15'
                                                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                                            }`}
                                        >
                                            <Icon
                                                size={14}
                                                className={`transition-transform duration-150 group-hover:scale-110 shrink-0 ${
                                                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-purple-400'
                                                }`}
                                            />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
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
