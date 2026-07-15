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

        // Limite de inatividade de 30 dias para exibição no explorar
        const activeLimitDate = new Date();
        activeLimitDate.setDate(activeLimitDate.getDate() - 30);

        // Encontrar criadores profissionais aprovados (excluindo a si mesmo e suspensos, e quem optou por ocultar do explorar)
        const featuredUsers = await User.find({
            clerkId: { $ne: userId },
            isProfessional: true,
            professionalStatus: 'approved',
            isSuspended: { $ne: true },
            hideFromExplore: { $ne: true },
            $or: [
                { lastSeen: { $gte: activeLimitDate } },
                { isOnline: true },
                { createdAt: { $gte: activeLimitDate } }
            ]
        })
        .select('clerkId username name email photoUrl coverUrl isProfessional subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers bio createdAt avgResponseTimeMinutes isOnline lastSeen birthDate city state')
        .limit(200)
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

        // Mapear usuários, calcular a completude do perfil e anexar até 4 fotos públicas
        const usersWithPhotos = featuredUsers.map(u => {
            const publicPhotos = photosByOwner[u.clerkId] || [];
            const photosCount = publicPhotos.length;

            // 1. Calcular completude (peso de 25% por requisito preenchido)
            const hasPhoto = !!u.photoUrl && u.photoUrl.trim() !== '';
            const hasCover = !!u.coverUrl && u.coverUrl.trim() !== '';
            const hasBio = !!u.bio && u.bio.trim().length >= 10;
            const hasPhotos = photosCount >= 3;

            let completedSteps = 0;
            if (hasPhoto) completedSteps++;
            if (hasCover) completedSteps++;
            if (hasBio) completedSteps++;
            if (hasPhotos) completedSteps++;

            const completeness = completedSteps * 25;

            // 2. Determinar timestamp de última atividade (online ou mais recente)
            let lastActiveTime = 0;
            if (u.isOnline) {
                lastActiveTime = Date.now();
            } else if (u.lastSeen) {
                lastActiveTime = new Date(u.lastSeen).getTime();
            } else if (u.createdAt) {
                lastActiveTime = new Date(u.createdAt).getTime();
            }

            return {
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
                publicPhotos: publicPhotos.slice(0, 4),
                avgResponseTimeMinutes: u.avgResponseTimeMinutes ?? null,
                score: completeness, // mantido para compatibilidade com a tipagem do frontend
                completeness,
                lastActiveTime,
                publicPhotosCount: photosCount,
                isOnline: !!u.isOnline,
                birthDate: u.birthDate ?? null,
                city: u.city ?? '',
                state: u.state ?? '',
            };
        });

        // Ordenar decrescentemente:
        // 1. Pela completude do perfil (100% primeiro, etc.)
        // 2. Por quem esteve online/ativo mais recentemente (lastActiveTime descendente)
        const sorted = usersWithPhotos
            .sort((a, b) => {
                if (b.completeness !== a.completeness) {
                    return b.completeness - a.completeness;
                }
                return b.lastActiveTime - a.lastActiveTime;
            })
            .slice(0, 12);

        return NextResponse.json({ users: sorted });
    } catch (error: any) {
        console.error('Error fetching featured users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
