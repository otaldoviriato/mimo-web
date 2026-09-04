import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { LandingView } from '@/components/landing/LandingView';

export const metadata = {
    title: 'MimoChat | Conversas Privadas com Criadoras Reais',
    description: 'Converse diretamente com criadoras verificadas. Mensagens, fotos e áudios exclusivos com total discrição no Pix.',
};

export default async function RootPage() {
    const { userId } = await auth();
    if (userId) {
        redirect('/chats');
    }

    return <LandingView authRedirectUrl="/login" />;
}

