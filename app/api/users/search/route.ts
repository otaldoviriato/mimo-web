import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem, Transaction, Room } from '@/models';
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

        const cleanQuery = query.trim().replace(/^@/, '');
        const searchTerms = cleanQuery
            .split(/\s+/)
            .map((term) => term.replace(/^@/, '').slice(0, 40))
            .filter(Boolean)
            .slice(0, 5);

        if (searchTerms.length === 0) {
            return NextResponse.json({ error: 'Search query required' }, { status: 400 });
        }

        const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        await connectToDatabase();

        const [currentUser, userRooms] = await Promise.all([
            User.findOne({ clerkId: userId }).select('isProfessional').lean(),
            Room.find({ participants: userId }).select('participants').lean<Array<{ participants: string[] }>>().exec(),
        ]);
        const talkedUserIds = new Set(
            userRooms.flatMap((room) => room.participants).filter((participantId) => participantId !== userId),
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryFilter: any = {
            clerkId: { $ne: userId },
            isSuspended: { $ne: true }
        };

        if (currentUser?.isProfessional) {
            return NextResponse.json({ users: [] });
        }

        queryFilter.isProfessional = true;
        queryFilter.professionalStatus = 'approved';

        const foundUsers = await User.find({
            $and: searchTerms.map((term) => {
                const regex = new RegExp(escapeRegex(term), 'i');
                return {
                    $or: [
                        { username: { $regex: regex } },
                        { name: { $regex: regex } },
                    ],
                };
            }),
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

        const settings = await AppSettings.findOne({ key: 'global' }).select('conversationPricePerEquivalentCharCents subscriberDiscountPercentage newProfileDaysThreshold newClientHoursThreshold activeRechargedClientDaysThreshold activeUnrechargedClientHoursThreshold').lean() as any;
        const defaultNonSub = (settings?.conversationPricePerEquivalentCharCents ?? 5) / 100;
        const defaultSub = defaultNonSub * (1 - (settings?.subscriberDiscountPercentage ?? 20) / 100);
        const thresholdDays = settings?.newProfileDaysThreshold ?? 15;
        const newClientHoursThreshold = settings?.newClientHoursThreshold ?? 24;
        const activeRechargedClientDaysThreshold = settings?.activeRechargedClientDaysThreshold ?? 30;
        const activeUnrechargedClientHoursThreshold = settings?.activeUnrechargedClientHoursThreshold ?? 24;

        // 1. Agregação de recargas históricas para os usuários listados (se for profissional)
        const clientHasRechargeMap = new Map<string, boolean>();
        if (currentUser?.isProfessional) {
            const rechargeAgg = await Transaction.aggregate([
                {
                    $match: {
                        userId: { $in: clerkIds },
                        source: 'recharge',
                        status: { $in: ['PAID', 'COMPLETED', 'paid', 'completed'] }
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
                if (item.total > 0) clientHasRechargeMap.set(item._id, true);
            });
        }


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

            const cutoffDatePro = new Date();
            cutoffDatePro.setDate(cutoffDatePro.getDate() - thresholdDays);

            const cutoffDateClient = new Date(Date.now() - newClientHoursThreshold * 60 * 60 * 1000);
            const rechargedClientActiveCutoff = new Date(Date.now() - activeRechargedClientDaysThreshold * 24 * 60 * 60 * 1000);
            const unrechargedClientActiveCutoff = new Date(Date.now() - activeUnrechargedClientHoursThreshold * 60 * 60 * 1000);

            const lastActiveDate = u.lastSeen ? new Date(u.lastSeen) : (u.createdAt ? new Date(u.createdAt) : new Date(0));
            const isOnlineNow = !!u.isOnline;
            const hasRecharge = clientHasRechargeMap.get(u.clerkId) ?? false;

            let isInactive = false;
            let tier = 1;

            if (currentUser?.isProfessional) {
                if (hasRecharge) {
                    const isActive = isOnlineNow || lastActiveDate >= rechargedClientActiveCutoff;
                    isInactive = !isActive;
                    tier = isActive ? 1 : 3;
                } else {
                    const isActive = isOnlineNow || lastActiveDate >= unrechargedClientActiveCutoff;
                    isInactive = !isActive;
                    tier = isActive ? 2 : 3;
                }
            } else {
                const isActive = isOnlineNow || lastActiveDate >= rechargedClientActiveCutoff;
                isInactive = !isActive;
                tier = isActive ? 1 : 3;
            }

            const isNew = u.isProfessional
                ? (u.createdAt ? new Date(u.createdAt) >= cutoffDatePro : false)
                : (u.createdAt ? new Date(u.createdAt) >= cutoffDateClient : false);

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
                chargePerCharSubscribers: defaultSub,
                chargePerCharNonSubscribers: defaultNonSub,
                bio: u.bio || '',
                isNew,
                publicPhotos: publicPhotos.slice(0, 4),
                avgResponseTimeMinutes: u.avgResponseTimeMinutes ?? null,
                score,
                isOnline: isOnlineNow,
                isAvailable: u.isAvailable !== false,
                lastSeen: u.lastSeen ?? null,
                birthDate: u.birthDate ?? null,
                city: u.city ?? '',
                state: u.state ?? '',
                hasChat: talkedUserIds.has(u.clerkId),
                hasRecharge,
                tier,
                isInactive
            };
        });

        // Na busca textual, qualquer perfil profissional aprovado pode ser encontrado.
        const filteredUsers = usersWithScores;

        // Ordenação manual: Por Tier (1 -> 2 -> 3), Perfis sem conversa aberta primeiro, exact username matches depois, depois por score
        const sortedUsers = filteredUsers.sort((a, b) => {
            if (a.tier !== b.tier) {
                return a.tier - b.tier;
            }
            if (a.hasChat !== b.hasChat) {
                return a.hasChat ? 1 : -1;
            }
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
