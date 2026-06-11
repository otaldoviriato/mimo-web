import type { Metadata } from 'next';
import { ParaCriadorasLanding } from './ParaCriadorasLanding';

export const metadata: Metadata = {
    title: 'Mimo Chat para Criadoras | Conversas que geram valor',
    description:
        'Conheça o Mimo Chat, o aplicativo de mensagens criado para criadoras monetizarem conversas, fotos e vídeos com segurança.',
    alternates: {
        canonical: 'https://www.mimochat.com.br/para-criadoras2',
    },
    openGraph: {
        title: 'Mimo Chat para Criadoras',
        description: 'Sua audiência já quer falar com você. Agora essa conversa pode gerar valor.',
        url: 'https://www.mimochat.com.br/para-criadoras2',
        siteName: 'Mimo Chat',
        locale: 'pt_BR',
        type: 'website',
        images: [
            {
                url: 'https://www.mimochat.com.br/icon-512x512.png',
                width: 512,
                height: 512,
                alt: 'Mimo Chat',
            },
        ],
    },
};

export default function ParaCriadorasPage() {
    return <ParaCriadorasLanding />;
}
