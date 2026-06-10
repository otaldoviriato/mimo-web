'use client';

import {
    BarChart3,
    ClipboardList,
    FlaskConical,
    LayoutDashboard,
    Menu,
    Megaphone,
    Settings,
    Sprout,
    UsersRound,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navigation = [
    { href: '/marketing', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/marketing/campaigns', label: 'Campanhas', icon: Megaphone },
    { href: '/marketing/seeds', label: 'Perfis-semente', icon: Sprout },
    { href: '/marketing/runs', label: 'Rodadas', icon: FlaskConical },
    { href: '/marketing/leads', label: 'Leads', icon: UsersRound },
    { href: '/marketing/applications', label: 'Inscrições', icon: ClipboardList },
    { href: '/marketing/settings', label: 'Configurações', icon: Settings },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const current = navigation.find(item => (
        item.href === '/marketing' ? pathname === item.href : pathname.startsWith(item.href)
    ));

    return (
        <div className="min-h-screen bg-[#f7f5fb] text-slate-900">
            {open && (
                <button
                    className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar menu"
                />
            )}
            <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[#211535] text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500 shadow-lg shadow-purple-950/40">
                        <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-black tracking-tight">Mimo Growth</p>
                        <p className="text-xs font-medium text-purple-200">Prospecção interna</p>
                    </div>
                    <button className="rounded-xl p-2 text-purple-200 lg:hidden" onClick={() => setOpen(false)}>
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
                    <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-purple-300/60">
                        Operação
                    </p>
                    {navigation.map(item => {
                        const Icon = item.icon;
                        const active = item.href === '/marketing'
                            ? pathname === item.href
                            : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                                    active
                                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-950/20'
                                        : 'text-purple-100/70 hover:bg-white/8 hover:text-white'
                                }`}
                            >
                                <Icon className="h-[18px] w-[18px]" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="border-t border-white/10 p-4">
                    <Link
                        href="/admin"
                        className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs font-bold text-purple-100 hover:bg-white/10"
                    >
                        Voltar ao painel admin
                    </Link>
                </div>
            </aside>

            <div className="lg:pl-72">
                <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-8">
                    <button
                        className="rounded-xl border border-slate-200 p-2.5 text-slate-600 lg:hidden"
                        onClick={() => setOpen(true)}
                        aria-label="Abrir menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-purple-600">Marketing interno</p>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">{current?.label || 'Growth'}</h1>
                    </div>
                    <div className="ml-auto rounded-full border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">
                        Somente administradores
                    </div>
                </header>
                <main className="p-4 md:p-8">{children}</main>
            </div>
        </div>
    );
}
