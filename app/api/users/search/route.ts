import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem, Transaction } from '@/models';
import { AppSettings } from '@/models/AppSettings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/users/search?username=@username
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('username') || searchParams.get('query');

        if (!query) {
            return NextResponse.json({ error: 'Search query required' }, { status: 400 });
        }

        const cleanQuery = query.replace('@', '');

        await connectToDatabase();

        const currentUser = await User.findOne({ clerkId: userId }).select('isProfessional').lean();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryFilter: any = {
            clerkId: { $ne: userId },
            isSuspended: { $ne: true },
            photoUrl: { $exists: true, $ne: '' }
        };

        if (currentUser?.isProfessional) {
            queryFilter.isProfessional = { $ne: true };
        } else {
            queryFilter.isProfessional = true;
            queryFilter.professionalStatus = 'approved';
        }

        const foundUsers = await User.find({
            $or: [
                { username: { $regex: new RegExp(cleanQuery, 'i') } },
                { name: { $regex: new RegExp(cleanQuery, 'i') } }
            ],
            ...queryFilter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).select('clerkId username name email photoUrl coverUrl isProfessional identityStatus subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers bio createdAt avgResponseTimeMinutes isOnline lastSeen birthDate city state').limit(40).lean() as any[];

        if (!foundUsers || foundUsers.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Buscar fotos públicas livres da galeria para estes usuários encontrados
        const clerkIds = foundUsers.map(u => u.clerkId);
        const galleryItems = await GalleryItem.find({
            ownerId: { $in: clerkIds },
            galleryType: 'public',
            visibility: 'public',
            mediaType: 'photo'
        })
        .sort({ createdAt: -1 })
        .lean();

        // Mapear fotos por ownerId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        const activeLimitDate = new Date();
        activeLimitDate.setDate(activeLimitDate.getDate() - 30);

        // 1. Agregação de recargas nos últimos 30 dias para os usuários listados (se for profissional)
        const clientRechargesMap = new Map<string, number>();
        if (currentUser?.isProfessional) {
            const startOf30Days = new Date();
            startOf30Days.setDate(startOf30Days.getDate() - 30);

            const rechargeAgg = await Transaction.aggregate([
                {
                    $match: {
                        userId: { $in: clerkIds },
                        source: 'recharge',
                        status: { $in: ['PAID', 'COMPLETED'] },
                        timestamp: { $gte: startOf30Days }
                    }
                },
                {
                    $group: {
                        _id: '$userId',
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            rechargeAgg.forEach((item: any) => {
                clientRechargesMap.set(item._id, item.total);
            });
        }

        const getClientLevel = (amountCents: number): string => {
            const amount = amountCents;
            if (amount <= 0) return 'Novo';
            if (amount <= 100) return 'Bronze';
            if (amount <= 500) return 'Prata';
            if (amount <= 1000) return 'Ouro';
            return 'VIP';
        };

        // Mapear usuários e calcular scores
        const usersWithScores = foundUsers.map(u => {
            const publicPhotos = photosByOwner[u.clerkId] || [];
            const photosCount = publicPhotos.length;

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

            // Fator aleatório sutil (0 a 5 pts) para desempatar criadores semelhantes
            const finalScore = score + Math.random() * 5;

            // Critérios de qualificação booleana rígida
            const isOnlineOrRecent = u.isOnline || (u.lastSeen && new Date(u.lastSeen) >= activeLimitDate) || (u.createdAt && new Date(u.createdAt) >= activeLimitDate);
            const isQualified = currentUser?.isProfessional
                ? (!!u.photoUrl && u.photoUrl.trim() !== '' && isOnlineOrRecent)
                : (!!u.photoUrl && u.photoUrl.trim() !== '' &&
                   !!u.coverUrl && u.coverUrl.trim() !== '' &&
                   !!u.bio && u.bio.trim() !== '' &&
                   photosCount >= 3 &&
                   isOnlineOrRecent);

            return {
                id: u._id,
                clerkId: u.clerkId,
                username: u.username,
                name: u.name,
                email: u.email,
                photoUrl: u.photoUrl,
                coverUrl: u.coverUrl,
                isProfessional: u.isProfessional,
                identityStatus: u.identityStatus || null,
                subscriptionPrice: u.subscriptionPrice || 0,
                chargePerCharSubscribers: u.chargePerCharSubscribers ?? defaultSub,
                chargePerCharNonSubscribers: u.chargePerCharNonSubscribers ?? defaultNonSub,
                bio: u.bio || '',
                isNew: u.createdAt ? new Date(u.createdAt) >= cutoffDate : false,
                publicPhotos: publicPhotos.slice(0, 4),
                avgResponseTimeMinutes: u.avgResponseTimeMinutes ?? null,
                score: finalScore,
                isQualified,
                isOnline: !!u.isOnline,
                birthDate: u.birthDate ?? null,
                city: u.city ?? '',
                state: u.state ?? '',
                clientLevel: getClientLevel(clientRechargesMap.get(u.clerkId) || 0)
            };
        });

        // Na busca, não filtramos por perfil qualificado/completo para permitir que qualquer usuário profissional aprovado correspondente seja encontrado.
        const filteredUsers = usersWithScores;

        // Ordenação manual: Exact username matches primeiro, depois por score de relevância
        const sortedUsers = filteredUsers.sort((a, b) => {
            const aExact = a.username.toLowerCase() === cleanQuery.toLowerCase();
            const bExact = b.username.toLowerCase() === cleanQuery.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return b.score - a.score;
        });

        return NextResponse.json({
            users: sortedUsers
        });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error searching user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
