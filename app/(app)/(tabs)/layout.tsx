'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMyProfile } from '@/hooks/useQueries';
import { BalanceDisplay } from '@/components/BalanceDisplay';
import { Avatar } from '@/components/Avatar';
import { useUser } from '@clerk/nextjs';

const tabs = [
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
    {
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

export default function TabsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: userData } = useMyProfile();
    const { user } = useUser();
    const balance = userData?.balance ?? 0;

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar (desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0">
                {/* Brand */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold text-gray-900">MimoChat</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.href || (tab.href === '/chats' && pathname === '/');
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
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
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {children}
            </div>

            {/* Bottom nav (mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center z-40">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href === '/chats' && pathname === '/');
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-colors
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
