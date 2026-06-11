'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { CookieBanner } from '@/components/CookieBanner';
import { QueryProvider } from '@/context/QueryProvider';
import { PaymentProvider } from '@/context/PaymentContext';
import { PWAProvider } from '@/context/PWAContext';
import { PUBLIC_CONTENT_ROUTES } from '@/lib/routes';

export function AppProviders({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isPublicRoute = pathname && PUBLIC_CONTENT_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

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
