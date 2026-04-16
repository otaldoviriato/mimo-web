import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem } from '@/models';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ownerId } = await params;
        const { userId: requesterId } = await auth();

        await connectToDatabase();

        // Buscar dono do perfil
        const owner = await User.findOne({ clerkId: ownerId });
        if (!owner) {
            return NextResponse.json({ items: [] });
        }

        // Verificar se quem está pedindo é assinante (assinatura só faz sentido para profissionais)
        const isSubscriber = owner.isProfessional && requesterId && owner.subscribers?.includes(requesterId);
        const isOwner = requesterId === ownerId;

        // Removemos o filtro de visibilidade para que todos vejam os itens (frontend aplicará o blur)
        let query: any = { ownerId };

        const items = await GalleryItem.find(query).sort({ createdAt: -1 });

        return NextResponse.json({ 
            items,
            isSubscriber: !!isSubscriber,
            isOwner: !!isOwner
        });
    } catch (error: any) {
        console.error('Error fetching public gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
