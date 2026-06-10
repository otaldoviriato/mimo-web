'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { CookieBanner } from '@/components/CookieBanner';
import { QueryProvider } from '@/context/QueryProvider';
import { PaymentProvider } from '@/context/PaymentContext';
import { PWAProvider } from '@/context/PWAContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    if (pathname === '/creators') {
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
