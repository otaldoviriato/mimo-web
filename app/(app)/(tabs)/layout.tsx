'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMyProfile } from '@/hooks/useQueries';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { Avatar } from '@/components/Avatar';
import { useUser } from '@clerk/nextjs';
import { PWAPromoModal } from '@/components/PWAPromoModal';
import { NotifPromoModal } from '@/components/NotifPromoModal';

// As abas são geradas dinamicamente dentro do componente com base no tipo de perfil (profissional ou não)

export default function TabsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: userData } = useMyProfile();
    const { user } = useUser();
    const balance = userData?.balance ?? 0;

    const isProfessional = !!userData?.isProfessional;

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
        isProfessional ? {
            href: '/wallet',
            label: 'Carteira',
            icon: (active: boolean) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 14h2" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
        } : {
            href: '/search',
            label: 'Buscar',
            icon: (active: boolean) => (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth={active ? 2.5 : 2} />
                    <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" />
                </svg>
            ),
        },
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
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
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
