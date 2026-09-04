'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    UserCheck,
    MessageSquare,
    DollarSign,
    ShieldAlert,
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
    Compass,
    Bell,
    ArrowLeft,
    Megaphone
} from 'lucide-react';

interface SidebarProps {
    activeTab?: string;
    setActiveTab?: (tab: string) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

interface MenuSection {
    title: string;
    items: {
        href: string;
        label: string;
        icon: React.ElementType;
        exact?: boolean;
    }[];
}

const MENU_SECTIONS: MenuSection[] = [
    {
        title: 'Visão Geral',
        items: [
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
            { href: '/admin/campaigns', label: 'Campanhas', icon: Megaphone },
        ],
    },
    {
        title: 'Gestão de Comunidade',
        items: [
            { href: '/admin/clients', label: 'Clientes', icon: Users },
            { href: '/admin/professionals', label: 'Profissionais', icon: UserCheck },
            { href: '/admin/team', label: 'Equipe', icon: ShieldCheck },
            { href: '/admin/identity-verifications', label: 'Verificação de Selos', icon: ShieldCheck },
        ],
    },
    {
        title: 'Operações & Suporte',
        items: [
            { href: '/admin/rooms', label: 'Conversas', icon: MessageSquare },
            { href: '/admin/help-tickets', label: 'Tickets de Ajuda', icon: LifeBuoy },
            { href: '/admin/institutional-emails', label: 'E-mails Institucionais', icon: Mail },
        ],
    },
    {
        title: 'Financeiro',
        items: [
            { href: '/admin/financial', label: 'Movimentações Financeiras', icon: DollarSign },
        ],
    },
    {
        title: 'Configurações do Sistema',
        items: [
            { href: '/admin/settings/platform', label: 'Plataforma & Operação', icon: Globe },
            { href: '/admin/settings/alerts', label: 'Alertas & Notificações', icon: Bell },
            { href: '/admin/settings/chat', label: 'Chat & Sessões', icon: Clock },
            { href: '/admin/settings/explore', label: 'Explorar & Algoritmo', icon: Compass },
            { href: '/admin/settings/pricing', label: 'Precificação & Assinaturas', icon: Coins },
            { href: '/admin/settings/profiles', label: 'Perfis & Galeria', icon: Camera },
            { href: '/admin/settings/payments', label: 'Meios de Pagamento', icon: CreditCard },
            { href: '/admin/settings/app', label: 'App & Experiência', icon: Smartphone },
            { href: '/admin/settings/admins', label: 'Administradores', icon: ShieldCheck },
        ],
    },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();

    const isLinkActive = (href: string, exact?: boolean) => {
        if (exact) {
            return pathname === href;
        }
        return pathname.startsWith(href);
    };

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
                <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {MENU_SECTIONS.map((section, idx) => (
                        <div key={idx} className="space-y-1.5">
                            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                {section.title}
                            </p>
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const active = isLinkActive(item.href, item.exact);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => onClose?.()}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                                            active
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/10 font-bold'
                                                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                                        }`}
                                    >
                                        <Icon
                                            size={17}
                                            className={`transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                                                active ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'
                                            }`}
                                        />
                                        <span className="truncate">{item.label}</span>
                                        {active && (
                                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
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
