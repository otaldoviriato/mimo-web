import type { Metadata } from 'next';
import './globals.css';
import { Viewport } from 'next';
import { AppProviders } from '@/components/AppProviders';

export const metadata: Metadata = {
    title: 'Mimo Chat | Monetize suas Mensagens e Interações com Fãs',
    description: 'No Mimo Chat você se conecta de verdade. A plataforma premium para criadores monetizarem mensagens, directs e conteúdos exclusivos de forma assíncrona e segura via Pix.',
    keywords: [
        'mimo chat',
        'monetizar direct',
        'mensagens pagas',
        'privacy',
        'onlyfans',
        'conteudo exclusivo',
        'interacao com fas',
        'receber mimos',
        'privacy chat',
        'abacatepay'
    ],
    manifest: '/manifest.json',
    openGraph: {
        title: 'Mimo Chat | Monetize suas Mensagens e Interações com Fãs',
        description: 'Cansada de responder direct de graça? No Mimo você cobra por mensagem e recebe direto no Pix.',
        url: 'https://www.mimochat.com.br',
        siteName: 'Mimo Chat',
        images: [
            {
                url: 'https://www.mimochat.com.br/icon-512x512.png',
                width: 512,
                height: 512,
                alt: 'Mimo Chat - Monetize suas Mensagens e Interações com Fãs',
            },
        ],
        locale: 'pt_BR',
        type: 'website',
        // Omitido ou corrigido
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Mimo Chat | Monetize suas Mensagens e Interações com Fãs',
        description: 'Cansada de responder direct de graça? No Mimo você cobra por mensagem e recebe direto no Pix.',
        images: ['https://www.mimochat.com.br/icon-512x512.png'],
    },
    appleWebApp: {
        capable: true,
        title: 'Mimo Chat',
        statusBarStyle: 'default',
    },
};

export const viewport: Viewport = {
    themeColor: '#7A1FA2',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className="h-full">
            <body className="h-full">
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
