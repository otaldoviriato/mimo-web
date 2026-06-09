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
            return NextResponse.json({ items: [], privateItems: [], privatePhotosCount: 0, privateVideosCount: 0 });
        }

        // Verificar se quem está pedindo é assinante (assinatura só faz sentido para profissionais com assinatura ativada)
        const isSubscriber = owner.isProfessional && owner.isSubscriptionEnabled && requesterId && owner.subscribers?.includes(requesterId);
        const isOwner = requesterId === ownerId;

        const allItems = await GalleryItem.find({ ownerId }).sort({ createdAt: -1 });

        const publicItems = allItems.filter(item => !item.galleryType || item.galleryType === 'public');
        const privateItems = allItems.filter(item => item.galleryType === 'private');

        const privatePhotosCount = privateItems.filter(item => !item.mediaType || item.mediaType === 'photo').length;
        const privateVideosCount = privateItems.filter(item => item.mediaType === 'video').length;

        // Se for assinante ou o dono, retornamos as fotos/vídeos privados, caso contrário retornamos vazio
        const visiblePrivateItems = (isSubscriber || isOwner) ? privateItems : [];

        return NextResponse.json({ 
            items: publicItems,
            publicItems,
            privateItems: visiblePrivateItems,
            privatePhotosCount,
            privateVideosCount,
            isSubscriber: !!isSubscriber,
            isOwner: !!isOwner
        });
    } catch (error: any) {
        console.error('Error fetching public gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
