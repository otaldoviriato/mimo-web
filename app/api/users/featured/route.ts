import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem, Room, Message } from '@/models';
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

        const currentUser = await User.findOne({ clerkId: userId }).select('isProfessional').lean();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryFilter: any = {
            clerkId: { $ne: userId },
            isSuspended: { $ne: true },
            $or: [
                { lastSeen: { $gte: activeLimitDate } },
                { isOnline: true },
                { createdAt: { $gte: activeLimitDate } }
            ]
        };

        if (currentUser?.isProfessional) {
            queryFilter.isProfessional = { $ne: true };
            queryFilter.hideFromExplore = { $ne: true };
        } else {
            queryFilter.isProfessional = true;
            queryFilter.professionalStatus = 'approved';
            queryFilter.hideFromExplore = { $ne: true };
        }

        // Encontrar criadores/clientes em destaque
        const featuredUsers = await User.find(queryFilter)
        .select('clerkId username name email photoUrl coverUrl isProfessional identityStatus subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers bio createdAt avgResponseTimeMinutes isOnline lastSeen birthDate city state isHighSpender')
        .limit(200)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const photosByOwner = galleryItems.reduce((acc: Record<string, string[]>, item: any) => {
            if (!acc[item.ownerId]) {
                acc[item.ownerId] = [];
            }
            acc[item.ownerId].push(item.imageUrl);
            return acc;
        }, {});

        const settings = await AppSettings.findOne({ key: 'global' }).select('defaultPricePerCharSubscribers defaultPricePerCharNonSubscribers newProfileDaysThreshold exploreSortingCriteria chatInactivityHours').lean();
        const defaultSub = settings?.defaultPricePerCharSubscribers ?? 0.002;
        const defaultNonSub = settings?.defaultPricePerCharNonSubscribers ?? 0.005;
        const thresholdDays = settings?.newProfileDaysThreshold ?? 15;
        const exploreSortingCriteria = settings?.exploreSortingCriteria || ['activeConversations', 'messagesLastWeek', 'online', 'recentAccess', 'completeness'];
        const chatInactivityHours = settings?.chatInactivityHours ?? 48;

        const activeLimit = new Date(Date.now() - chatInactivityHours * 60 * 60 * 1000);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Agregação de conversas ativas
        const activeRoomsGroup = await Room.aggregate([
            {
                $match: {
                    participants: { $in: clerkIds },
                    $or: [
                        { lastMessageTime: { $gte: activeLimit } },
                        { lastMessageTime: { $exists: false }, createdAt: { $gte: activeLimit } }
                    ]
                }
            },
            {
                $unwind: "$participants"
            },
            {
                $match: {
                    participants: { $in: clerkIds }
                }
            },
            {
                $group: {
                    _id: "$participants",
                    count: { $sum: 1 }
                }
            }
        ]);

        const activeRoomsMap = new Map<string, number>();
        activeRoomsGroup.forEach((g: any) => activeRoomsMap.set(g._id, g.count));

        // Agregação de mensagens na última semana
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

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

        // Mapear usuários, calcular a completude do perfil e anexar até 4 fotos públicas
        const usersWithPhotos = featuredUsers.map(u => {
            const publicPhotos = photosByOwner[u.clerkId] || [];
            const photosCount = publicPhotos.length;

            // 1. Calcular completude (peso de 25% por requisito preenchido ou simplificado para clientes)
            const hasPhoto = !!u.photoUrl && u.photoUrl.trim() !== '';
            const hasCover = !!u.coverUrl && u.coverUrl.trim() !== '';
            const hasBio = !!u.bio && u.bio.trim().length >= 10;
            const hasPhotos = photosCount >= 3;

            let completeness = 0;
            if (currentUser?.isProfessional) {
                // Para clientes, a completude é 100% se tiver foto. Se for High Spender, ganha prioridade
                completeness = hasPhoto ? (u.isHighSpender ? 100 : 80) : 0;
            } else {
                let completedSteps = 0;
                if (hasPhoto) completedSteps++;
                if (hasCover) completedSteps++;
                if (hasBio) completedSteps++;
                if (hasPhotos) completedSteps++;
                completeness = completedSteps * 25;
            }

            // 2. Determinar timestamp de última atividade (online ou mais recente)
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
                score: completeness, // mantido para compatibilidade com a tipagem do frontend
                completeness,
                lastActiveTime,
                publicPhotosCount: photosCount,
                isOnline: !!u.isOnline,
                birthDate: u.birthDate ?? null,
                city: u.city ?? '',
                state: u.state ?? '',
                activeConversationsCount,
                messagesLastWeekCount,
            };
        });

        // Ordenar dinamicamente:
        const sorted = usersWithPhotos
            .sort((a, b) => {
                for (const criterion of exploreSortingCriteria) {
                    if (criterion === 'activeConversations') {
                        const diff = (b.activeConversationsCount || 0) - (a.activeConversationsCount || 0);
                        if (diff !== 0) return diff;
                    }
                    else if (criterion === 'messagesLastWeek') {
                        const diff = (b.messagesLastWeekCount || 0) - (a.messagesLastWeekCount || 0);
                        if (diff !== 0) return diff;
                    }
                    else if (criterion === 'online') {
                        const valA = a.isOnline ? 1 : 0;
                        const valB = b.isOnline ? 1 : 0;
                        const diff = valB - valA;
                        if (diff !== 0) return diff;
                    }
                    else if (criterion === 'recentAccess') {
                        const diff = (b.lastActiveTime || 0) - (a.lastActiveTime || 0);
                        if (diff !== 0) return diff;
                    }
                    else if (criterion === 'completeness') {
                        const diff = (b.completeness || 0) - (a.completeness || 0);
                        if (diff !== 0) return diff;
                    }
                }
                return 0;
            })
            .slice(0, 12);

        return NextResponse.json({ users: sorted });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error fetching featured users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
