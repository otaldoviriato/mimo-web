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
        // Deve possuir foto de perfil, capa, bio e ter acessado ou ter sido criado nos últimos 30 dias
        const featuredUsers = await User.find({
            clerkId: { $ne: userId },
            isProfessional: true,
            professionalStatus: 'approved',
            isSuspended: { $ne: true },
            hideFromExplore: { $ne: true },
            photoUrl: { $exists: true, $ne: '' },
            coverUrl: { $exists: true, $ne: '' },
            bio: { $exists: true, $ne: '' },
            $or: [
                { lastSeen: { $gte: activeLimitDate } },
                { isOnline: true },
                { createdAt: { $gte: activeLimitDate } }
            ]
        })
        .select('clerkId username name email photoUrl coverUrl isProfessional subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers bio createdAt avgResponseTimeMinutes isOnline lastSeen')
        .limit(80)
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

        // Mapear usuários, calcular o score e anexar até 4 fotos públicas
        const usersWithPhotos = featuredUsers.map(u => {
            const publicPhotos = photosByOwner[u.clerkId] || [];

            // Algoritmo de Score
            let score = 0;

            // 1. Estático: Foto de Capa (30 pts)
            if (u.coverUrl && u.coverUrl.trim() !== '') {
                score += 30;
            }

            // 2. Estático: Bio (40 pts)
            if (u.bio && u.bio.trim().length >= 10) {
                score += 40;
            }

            // 3. Estático: Galeria Pública (até 30 pts)
            // Mínimo de 3 fotos públicas = 30 pts (10 pts por foto)
            const photosCount = publicPhotos.length;
            score += Math.min(photosCount * 10, 30);

            // 4. Dinâmico: Online Agora (100 pts)
            if (u.isOnline) {
                score += 100;
            }

            // 5. Dinâmico: Frequência de Acesso (até 50 pts)
            if (u.isOnline) {
                score += 50;
            } else if (u.lastSeen) {
                const lastSeenDate = new Date(u.lastSeen);
                const diffMs = Date.now() - lastSeenDate.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                if (diffHours <= 24) {
                    score += 50;
                } else if (diffHours <= 48) {
                    score += 30;
                } else if (diffHours <= 168) { // 7 dias
                    score += 10;
                }
            }

            // 6. Dinâmico: Tempo de Resposta (15 pts)
            if (u.avgResponseTimeMinutes != null && u.avgResponseTimeMinutes < 15) {
                score += 15;
            }

            // Adiciona um fator aleatório sutil (0 a 5 pts) para que perfis de relevância semelhante se alternem de forma justa
            const finalScore = score + Math.random() * 5;

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
                score: finalScore,
                publicPhotosCount: photosCount // adicionado para o filtro de qualificação
            };
        })
        .filter(u => u.publicPhotosCount >= 3); // EXIGÊNCIA RÍGIDA: Mínimo de 3 fotos públicas na galeria

        // Ordenar decrescentemente pelo score de relevância e pegar as top 12 recomendações
        const sorted = usersWithPhotos
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);

        return NextResponse.json({ users: sorted });
    } catch (error: any) {
        console.error('Error fetching featured users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
