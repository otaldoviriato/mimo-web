import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem } from '@/models';
import { AppSettings } from '@/models/AppSettings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/users/featured
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Encontrar criadores profissionais aprovados (excluindo a si mesmo e suspensos)
        const featuredUsers = await User.find({
            clerkId: { $ne: userId },
            isProfessional: true,
            professionalStatus: 'approved',
            isSuspended: { $ne: true }
        })
        .select('clerkId username name email photoUrl coverUrl isProfessional subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers bio createdAt avgResponseTimeMinutes')
        .limit(30)
        .lean() as any[];

        if (!featuredUsers || featuredUsers.length === 0) {
            return NextResponse.json({ users: [] });
        }

        // Buscar fotos públicas livres da galeria para estes usuários
        const clerkIds = featuredUsers.map(u => u.clerkId);
        const galleryItems = await GalleryItem.find({
            ownerId: { $in: clerkIds },
            galleryType: 'public',
            visibility: 'public',
            mediaType: 'photo'
        })
        .sort({ createdAt: -1 })
        .lean();

        // Mapear fotos por ownerId
        const photosByOwner = galleryItems.reduce((acc: Record<string, string[]>, item: any) => {
            if (!acc[item.ownerId]) {
                acc[item.ownerId] = [];
            }
            acc[item.ownerId].push(item.imageUrl);
            return acc;
        }, {});

        const settings = await AppSettings.findOne({ key: 'global' }).select('defaultPricePerCharSubscribers defaultPricePerCharNonSubscribers newProfileDaysThreshold').lean();
        const defaultSub = settings?.defaultPricePerCharSubscribers ?? 0.002;
        const defaultNonSub = settings?.defaultPricePerCharNonSubscribers ?? 0.005;
        const thresholdDays = settings?.newProfileDaysThreshold ?? 15;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

        // Mapear usuários e anexar até 4 fotos públicas
        const usersWithPhotos = featuredUsers.map(u => ({
            id: u._id,
            clerkId: u.clerkId,
            username: u.username,
            name: u.name,
            email: u.email,
            photoUrl: u.photoUrl,
            coverUrl: u.coverUrl,
            isProfessional: u.isProfessional,
            subscriptionPrice: u.subscriptionPrice || 0,
            chargePerCharSubscribers: u.chargePerCharSubscribers ?? defaultSub,
            chargePerCharNonSubscribers: u.chargePerCharNonSubscribers ?? defaultNonSub,
            bio: u.bio || '',
            isNew: u.createdAt ? new Date(u.createdAt) >= cutoffDate : false,
            publicPhotos: (photosByOwner[u.clerkId] || []).slice(0, 4),
            avgResponseTimeMinutes: u.avgResponseTimeMinutes ?? null,
        }));

        // Fazer um shuffle simples para dar um aspecto mais dinâmico
        const shuffled = usersWithPhotos
            .sort(() => 0.5 - Math.random())
            .slice(0, 10);

        return NextResponse.json({ users: shuffled });
    } catch (error: any) {
        console.error('Error fetching featured users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
