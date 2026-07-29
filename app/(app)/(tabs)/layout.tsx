'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMyProfile } from '@/hooks/useQueries';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { Avatar } from '@/components/Avatar';
import { useUser } from '@clerk/nextjs';
import { PWAPromoModal } from '@/components/PWAPromoModal';
import { NotifPromoModal } from '@/components/NotifPromoModal';
import { Settings, ShieldAlert, Search, Pencil } from 'lucide-react';

// As abas são geradas dinamicamente dentro do componente com base no tipo de perfil (profissional ou não)

export default function TabsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: userData } = useMyProfile();
    const { user } = useUser();
    const balance = userData?.balance ?? 0;

    const isProfessional = !!userData?.isProfessional;

    const currentTabLabel = 
        pathname === '/wallet' ? 'Carteira' :
        pathname === '/search' ? 'Explorar' :
        pathname === '/profile' ? 'Perfil' : 'Conversas';

    const resolvedTabs = [
        {
            href: '/chats',
            label: 'Conversas',
            icon: (active: boolean) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} className="transition-all">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
        },
        ...(isProfessional ? [
            {
                href: '/wallet',
                label: 'Carteira',
                icon: (active: boolean) => (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
                        <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 14h2" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ),
            },
        ] : [
            {
                href: '/search',
                label: 'Explorar',
                icon: (active: boolean) => (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'currentColor' : 'none'} />
                        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'currentColor' : 'none'} />
                        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'currentColor' : 'none'} />
                        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill={active ? 'currentColor' : 'none'} />
                    </svg>
                ),
            }
        ]),
        {
            href: '/profile',
            label: 'Perfil',
            icon: (active: boolean) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                        stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth={active ? 2.5 : 2} />
                </svg>
            ),
        },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar (desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0">
                {/* Brand */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
                    <div className="flex w-9 h-9 items-center justify-center bg-linear-to-br from-purple-600 to-purple-700 rounded-xl shrink-0">
                        <img
                            src="/Logo.svg"
                            alt="MimoChat"
                            className="w-6 h-6 object-contain"
                        />
                    </div>
                    <span className="text-lg font-bold text-gray-900">MimoChat</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4">
                    {resolvedTabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href === '/chats' && pathname === '/');
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                replace={tab.href !== '/chats'}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all font-medium text-sm
                                    ${isActive
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <span className={isActive ? 'text-purple-600' : 'text-gray-400'}>
                                    {tab.icon(isActive)}
                                </span>
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Balance + User */}
                <div className="px-4 pb-5 border-t border-gray-100 pt-4 flex flex-col gap-3">
                    <BalanceDisplay balance={balance} size="md" />
                    <div className="flex items-center gap-2 px-1">
                        <Avatar uri={userData?.photoUrl} size={32} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                                {userData?.name || userData?.username || user?.username || ''}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                                @{userData?.username || ''}
                            </p>
                        </div>
                    </div>
                    {userData?.isAdmin && (
                        <button
                            onClick={() => router.push('/admin')}
                            className="flex items-center justify-between w-full px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition-all font-semibold text-xs border border-purple-200/60 cursor-pointer"
                            title="Acessar Back-office"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                                <span className="truncate">{userData?.email || user?.primaryEmailAddress?.emailAddress || 'Back-office'}</span>
                            </div>
                            <span className="text-[10px] bg-purple-600 text-white font-bold px-1.5 py-0.5 rounded uppercase shrink-0">Admin</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                {/* Header Superior Persistente — oculto na aba Perfil apenas para o perfil feminino (profissional) */}
                {!(pathname === '/profile' && isProfessional) && (
                <div className="shared-header bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-30 sticky top-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <img
                            src="/Logo.svg"
                            alt="MimoChat"
                            className="w-8 h-8 object-contain shrink-0"
                        />
                        <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                        <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">
                            {currentTabLabel}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {pathname === '/search' && (
                            <button
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('mimo:toggle-search'));
                                    }
                                }}
                                className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center cursor-pointer"
                                title="Buscar usuário"
                            >
                                <Search className="w-5 h-5 text-white" />
                            </button>
                        )}
                        {pathname === '/profile' && (
                            <button
                                onClick={() => router.push('/profile/edit')}
                                className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center cursor-pointer"
                                title="Editar Perfil"
                            >
                                <Pencil className="w-4.5 h-4.5" />
                            </button>
                        )}
                        {userData?.isAdmin && (
                            <button
                                onClick={() => router.push('/admin')}
                                className="p-2 md:px-3 md:py-1.5 hover:bg-white/10 active:bg-white/20 md:bg-white/15 md:hover:bg-white/25 md:border md:border-white/25 rounded-full transition-all text-white flex items-center justify-center gap-2 cursor-pointer"
                                title="Acessar Back-office"
                            >
                                <ShieldAlert className="w-5 h-5 md:w-4.5 md:h-4.5 text-white md:text-purple-200 shrink-0" />
                                <span className="hidden md:inline text-xs font-semibold max-w-[240px] truncate">
                                    {userData?.email || user?.primaryEmailAddress?.emailAddress || 'Back-office'}
                                </span>
                            </button>
                        )}
                        {pathname === '/profile' && (
                            <button
                                onClick={() => router.push('/settings')}
                                className="p-2 hover:bg-white/10 active:bg-white/20 rounded-full transition-all text-white flex items-center justify-center cursor-pointer"
                                title="Configurações"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
                )}

                {children}
            </div>

            {/* Modal de instalação PWA — aparece uma vez por sessão quando o Chrome libera o prompt */}
            <PWAPromoModal />
            {/* Modal de notificações — aparece uma vez por sessão quando em modo standalone e permissão ainda não concedida */}
            <NotifPromoModal />

            {/* Bottom nav (mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-white border-t border-gray-200 flex z-40 shadow-[0_-6px_18px_rgba(15,23,42,0.05)]">
                {resolvedTabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href === '/chats' && pathname === '/');
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            replace={tab.href !== '/chats'}
                            className={`flex-1 h-full flex flex-col items-center justify-center gap-1 px-2 text-[11px] font-semibold transition-colors pt-2 pb-[calc(6px+env(safe-area-inset-bottom))]
                                ${isActive ? 'text-purple-600' : 'text-gray-400'}`}
                        >
                            {tab.icon(isActive)}
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
