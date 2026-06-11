'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { CookieBanner } from '@/components/CookieBanner';
import { QueryProvider } from '@/context/QueryProvider';
import { PaymentProvider } from '@/context/PaymentContext';
import { PWAProvider } from '@/context/PWAContext';

const PUBLIC_ROUTES = [
    '/creators',
    '/institucional',
    '/termos-de-uso',
    '/politica-de-privacidade',
    '/ajuda',
    '/founders',
    '/para-criadoras2',
    '/para-criadoras3',
    '/para-criadoras'
];

export function AppProviders({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isPublicRoute = pathname && PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

    if (isPublicRoute) {
        return (
            <>
                {children}
                <Toaster position="top-center" />
                <CookieBanner />
            </>
        );
    }

    return (
        <ClerkProvider>
            <QueryProvider>
                <PWAProvider>
                    <PaymentProvider>
                        {children}
                        <Toaster position="top-center" />
                        <CookieBanner />
                    </PaymentProvider>
                </PWAProvider>
            </QueryProvider>
        </ClerkProvider>
    );
}
