import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem } from '@/models';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { itemIds } = body;

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return NextResponse.json({ error: 'Lista de IDs inválida' }, { status: 400 });
        }

        await connectToDatabase();

        // Atualizar a ordem de cada item de forma atômica
        const updatePromises = itemIds.map((id: string, index: number) =>
            GalleryItem.updateOne(
                { _id: id, ownerId: userId },
                { $set: { order: index } }
            )
        );

        await Promise.all(updatePromises);

        // Se o primeiro item for uma foto pública, sincroniza com a photoUrl do usuário
        const firstId = itemIds[0];
        if (firstId) {
            const firstItem = await GalleryItem.findOne({ _id: firstId, ownerId: userId });
            if (firstItem && (!firstItem.galleryType || firstItem.galleryType === 'public') && firstItem.imageUrl) {
                await User.updateOne(
                    { clerkId: userId },
                    { $set: { photoUrl: firstItem.imageUrl } }
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error reordering gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
