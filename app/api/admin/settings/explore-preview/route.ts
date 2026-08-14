import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem, Room, Message } from '@/models';
import { AppSettings } from '@/models/AppSettings';
import { AcquisitionEvent } from '@/models/AcquisitionEvent';
import { EXPLORE_DISCOVERY_IMPRESSIONS, rankExploreUsers } from '@/lib/exploreRanking';
import { getQualifiedConversationCounts } from '@/lib/exploreMetrics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Verificar permissão administrativa
        const settings = await AppSettings.findOne({ key: 'global' }).lean();
        const adminClerkIds = settings?.adminClerkIds || [FALLBACK_ADMIN];
        const isAdmin = adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        // Ler critérios passados por query params ou pegar do banco
        const activeLimitDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Buscar profissionais aprovadas e com atividade nos últimos 30 dias.
        const queryFilter: any = {
            isProfessional: true,
            professionalStatus: 'approved',
            isSuspended: { $ne: true },
            hideFromExplore: { $ne: true },
            $or: [
                { lastSeen: { $gte: activeLimitDate } },
                { isOnline: true },
                { createdAt: { $gte: activeLimitDate } },
            ],
        };

        const professionals = await User.find(queryFilter)
            .select('clerkId username name email photoUrl coverUrl isProfessional subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers bio createdAt avgResponseTimeMinutes isOnline lastSeen birthDate city state isHighSpender')
            .lean() as any[];

        if (!professionals || professionals.length === 0) {
            return NextResponse.json({ users: [] });
        }

        const clerkIds = professionals.map(u => u.clerkId);

        const [exploreEvents, qualifiedConversations] = await Promise.all([
            AcquisitionEvent.aggregate([
                {
                    $match: {
                        professionalId: { $in: clerkIds },
                        eventType: { $in: ['explore_profile_impression', 'explore_profile_viewed'] }
                    }
                },
                {
                    $group: {
                        _id: { professionalId: '$professionalId', eventType: '$eventType' },
                        count: { $sum: 1 }
                    }
                }
            ]),
            getQualifiedConversationCounts(
                clerkIds,
                settings?.earningsSessionInactivityMinutes ?? 120,
                settings?.earningsSessionMinimumCents ?? 1000,
            ),
        ]);

        const exploreImpressionsMap = new Map<string, number>();
        const exploreProfileViewsMap = new Map<string, number>();
        for (const event of exploreEvents) {
            const target = event._id.eventType === 'explore_profile_impression'
                ? exploreImpressionsMap
                : exploreProfileViewsMap;
            target.set(event._id.professionalId, event.count);
        }
        const qualifiedConversationsMap = qualifiedConversations;

        // Buscar fotos públicas livres da galeria
        const galleryItems = await GalleryItem.find({
            ownerId: { $in: clerkIds },
            galleryType: 'public',
            visibility: 'public',
            mediaType: 'photo'
        })
        .sort({ createdAt: -1 })
        .lean();

        const photosByOwner = galleryItems.reduce((acc: Record<string, string[]>, item: any) => {
            if (!acc[item.ownerId]) {
                acc[item.ownerId] = [];
            }
            acc[item.ownerId].push(item.imageUrl);
            return acc;
        }, {});

        // Agregação de conversas ativas (com bidirecionalidade obrigatória nas últimas 48h)
        const activeLimit = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const activeRoomsDocs = await Room.find({
            participants: { $in: clerkIds },
            lastMessageTime: { $gte: activeLimit }
        }).select('participants').lean() as any[];

        const activeRoomsMap = new Map<string, number>();

        if (activeRoomsDocs.length > 0) {
            const roomVirtualMap = new Map<string, string[]>();
            for (const room of activeRoomsDocs) {
                const vId = (room.participants as string[]).slice().sort().join('_');
                roomVirtualMap.set(vId, room.participants as string[]);
            }
            const virtualRoomIds = Array.from(roomVirtualMap.keys());

            const biSendersAgg = await Message.aggregate([
                {
                    $match: {
                        roomId: { $in: virtualRoomIds },
                        isSystem: { $ne: true }
                    }
                },
                { $group: { _id: { roomId: '$roomId', senderId: '$senderId' } } },
                { $group: { _id: '$_id.roomId', senderCount: { $sum: 1 } } },
                { $match: { senderCount: { $gte: 2 } } }
            ]) as any[];

            for (const { _id: vId } of biSendersAgg) {
                const participants = roomVirtualMap.get(vId) ?? [];
                for (const p of participants) {
                    if (clerkIds.includes(p)) {
                        activeRoomsMap.set(p, (activeRoomsMap.get(p) ?? 0) + 1);
                    }
                }
            }
        }



        // Agregação de mensagens na última semana
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const messagesGroup = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: { $in: clerkIds } },
                        { receiverId: { $in: clerkIds } }
                    ],
                    timestamp: { $gte: oneWeekAgo },
                    isSystem: { $ne: true }
                }
            },
            {
                $project: {
                    professionals: {
                        $filter: {
                            input: ["$senderId", "$receiverId"],
                            as: "id",
                            cond: { $in: ["$$id", clerkIds] }
                        }
                    }
                }
            },
            {
                $unwind: "$professionals"
            },
            {
                $group: {
                    _id: "$professionals",
                    count: { $sum: 1 }
                }
            }
        ]);

        const messagesLastWeekMap = new Map<string, number>();
        messagesGroup.forEach((g: any) => messagesLastWeekMap.set(g._id, g.count));

        const defaultSub = settings?.defaultPricePerCharSubscribers ?? 0.002;
        const defaultNonSub = settings?.defaultPricePerCharNonSubscribers ?? 0.005;

        // Mapear usuários e preencher métricas
        const usersWithMetrics = professionals.map(u => {
            const publicPhotos = photosByOwner[u.clerkId] || [];
            const photosCount = publicPhotos.length;

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

            let lastActiveTime = 0;
            if (u.isOnline) {
                lastActiveTime = Date.now();
            } else if (u.lastSeen) {
                lastActiveTime = new Date(u.lastSeen).getTime();
            } else if (u.createdAt) {
                lastActiveTime = new Date(u.createdAt).getTime();
            }

            const activeConversationsCount = activeRoomsMap.get(u.clerkId) || 0;
            const messagesLastWeekCount = messagesLastWeekMap.get(u.clerkId) || 0;
            const exploreImpressionsCount = exploreImpressionsMap.get(u.clerkId) || 0;
            const exploreProfileViewsCount = exploreProfileViewsMap.get(u.clerkId) || 0;
            const qualifiedConversationsCount = qualifiedConversationsMap.get(u.clerkId) || 0;

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
                chargePerCharSubscribers: defaultSub,
                chargePerCharNonSubscribers: defaultNonSub,
                bio: u.bio || '',
                isNew: exploreImpressionsCount < EXPLORE_DISCOVERY_IMPRESSIONS,
                publicPhotos: publicPhotos.slice(0, 4),
                avgResponseTimeMinutes: u.avgResponseTimeMinutes ?? null,
                score: completeness,
                completeness,
                lastActiveTime,
                publicPhotosCount: photosCount,
                isOnline: !!u.isOnline,
                lastSeen: u.lastSeen || null,
                birthDate: u.birthDate ?? null,
                city: u.city ?? '',
                state: u.state ?? '',
                activeConversationsCount,
                messagesLastWeekCount,
                exploreImpressionsCount,
                exploreProfileViewsCount,
                qualifiedConversationsCount,
            };
        });

        // Ordenar dinamicamente:
        const sorted = rankExploreUsers(usersWithMetrics);

        return NextResponse.json({ users: sorted });
    } catch (error: any) {
        console.error('Error fetching explore preview:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
