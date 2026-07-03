import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem, Subscription } from '@/models';

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

        const isOwner = requesterId === ownerId;
        let isSubscriber = false;

        if (owner.isProfessional && requesterId && !isOwner) {
            const now = new Date();
            const subscription = await Subscription.findOne({
                subscriberId: requesterId,
                professionalId: ownerId,
                status: { $in: ['ACTIVE', 'CANCELED'] },
            }).sort({ expiresAt: -1 });

            isSubscriber = Boolean(subscription && subscription.expiresAt > now);

            if (isSubscriber && !owner.subscribers?.includes(requesterId)) {
                await User.updateOne(
                    { clerkId: ownerId },
                    { $addToSet: { subscribers: requesterId } }
                );
            } else if (subscription && subscription.expiresAt <= now) {
                if (subscription.status !== 'EXPIRED') {
                    subscription.status = 'EXPIRED';
                    await subscription.save();
                }

                await User.updateOne(
                    { clerkId: ownerId },
                    { $pull: { subscribers: requesterId } }
                );
            }
        }

        const allItems = await GalleryItem.find({ ownerId }).sort({ createdAt: -1 });

        const publicItems = allItems.filter(item => !item.galleryType || item.galleryType === 'public');
        const privateItems = allItems.filter(item => item.galleryType === 'private');

        // Sanitizar a URL das fotos públicas exclusivas de assinante para evitar vazamento
        const sanitizedPublicItems = publicItems.map(item => {
            const isLocked = item.visibility === 'subscribers' && !isSubscriber && !isOwner;
            if (isLocked) {
                const itemObj = item.toObject();
                itemObj.imageUrl = ''; // Remove a URL real da imagem exclusiva para não-assinantes
                return itemObj;
            }
            return item;
        });

        const privatePhotosCount = privateItems.filter(item => !item.mediaType || item.mediaType === 'photo').length;
        const privateVideosCount = privateItems.filter(item => item.mediaType === 'video').length;

        // Se for assinante ou o dono, retornamos as fotos/vídeos privados, caso contrário retornamos vazio
        const visiblePrivateItems = (isSubscriber || isOwner) ? privateItems : [];

        return NextResponse.json({ 
            items: sanitizedPublicItems,
            publicItems: sanitizedPublicItems,
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
