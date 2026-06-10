import type { Metadata } from 'next';
import { CreatorLanding } from './CreatorLanding';

export const metadata: Metadata = {
    title: 'MimoChat para Criadoras',
    description: 'Ganhe por conversar, responda mensagens no seu tempo e receba seus mimos.',
    alternates: {
        canonical: 'https://www.mimochat.com.br/creators',
    },
    openGraph: {
        title: 'MimoChat para Criadoras',
        description: 'Ganhe por conversar, responda mensagens no seu tempo e receba seus mimos.',
        url: 'https://www.mimochat.com.br/creators',
        siteName: 'MimoChat',
        locale: 'pt_BR',
        type: 'website',
        images: [{
            url: 'https://www.mimochat.com.br/icon-512x512.png',
            width: 512,
            height: 512,
            alt: 'MimoChat para Criadoras',
        }],
    },
};

export default function CreatorsPage() {
    return <CreatorLanding />;
}
