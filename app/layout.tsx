import type { Metadata } from 'next';
import './globals.css';
import { Viewport } from 'next';
import { AppProviders } from '@/components/AppProviders';

export const metadata: Metadata = {
    title: 'Mimo Chat | Converse com mulheres reais',
    description: 'Converse com mulheres reais no Mimo Chat. Plataforma de conversas privadas, fotos e vídeos exclusivos com total segurança e respostas rápidas.',
    keywords: [
        'mimo chat',
        'converse com mulheres reais',
        'conversas privadas',
        'mensagens pagas',
        'conteudo exclusivo',
        'receber mimos',
        'privacy chat'
    ],
    manifest: '/manifest.json',
    openGraph: {
        title: 'Mimo Chat | Converse com mulheres reais',
        description: 'Converse com mulheres reais no Mimo Chat. Plataforma de conversas privadas, fotos e vídeos exclusivos com total segurança e respostas rápidas.',
        url: 'https://www.mimochat.com.br',
        siteName: 'Mimo Chat',
        images: [
            {
                url: 'https://www.mimochat.com.br/assets/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Mimo Chat | Converse com mulheres reais',
            },
        ],
        locale: 'pt_BR',
        type: 'website',
        // Omitido ou corrigido
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Mimo Chat | Converse com mulheres reais',
        description: 'Converse com mulheres reais no Mimo Chat. Plataforma de conversas privadas, fotos e vídeos exclusivos com total segurança e respostas rápidas.',
        images: ['https://www.mimochat.com.br/assets/og-image.png'],
    },
    appleWebApp: {
        capable: true,
        title: 'Mimo Chat',
        statusBarStyle: 'black-translucent',
    },
};

export const viewport: Viewport = {
    themeColor: '#7004d6',
    colorScheme: 'light',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    interactiveWidget: 'resizes-content',
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
