import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { QueryProvider } from '@/context/QueryProvider';
import { PaymentProvider } from '@/context/PaymentContext';
import { PWAProvider } from '@/context/PWAContext';
import { Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
    title: 'MimoChat',
    description: 'Conectando você de verdade',
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    themeColor: '#6D28D9',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className="h-full">
            <body className="h-full">
                <ClerkProvider>
                    <QueryProvider>
                        <PWAProvider>
                            <PaymentProvider>
                                {children}
                                <Toaster position="top-center" />
                            </PaymentProvider>
                        </PWAProvider>
                    </QueryProvider>
                </ClerkProvider>
            </body>
        </html>
    );
}
