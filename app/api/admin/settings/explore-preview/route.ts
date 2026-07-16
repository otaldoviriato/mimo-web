import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem, Room, Message } from '@/models';
import { AppSettings } from '@/models/AppSettings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function GET(request: NextRequest) {
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
        const { searchParams } = new URL(request.url);
        const criteriaParam = searchParams.get('criteria');
        let exploreSortingCriteria: string[];

        if (criteriaParam) {
            exploreSortingCriteria = criteriaParam.split(',').filter(Boolean);
        } else {
            exploreSortingCriteria = settings?.exploreSortingCriteria || ['activeConversations', 'messagesLastWeek', 'online', 'recentAccess', 'completeness'];
        }

        const chatInactivityHours = settings?.chatInactivityHours ?? 48;
        const thresholdDays = settings?.newProfileDaysThreshold ?? 15;

        // Buscar todos os profissionais reais ativos e aprovados
        const queryFilter: any = {
            isProfessional: true,
            professionalStatus: 'approved',
            isSuspended: { $ne: true },
            hideFromExplore: { $ne: true }
        };

        const professionals = await User.find(queryFilter)
            .select('clerkId username name email photoUrl coverUrl isProfessional subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers bio createdAt avgResponseTimeMinutes isOnline lastSeen birthDate city state isHighSpender')
            .lean() as any[];

        if (!professionals || professionals.length === 0) {
            return NextResponse.json({ users: [] });
        }

        const clerkIds = professionals.map(u => u.clerkId);

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

        // Agregação de conversas ativas
        const activeLimit = new Date(Date.now() - chatInactivityHours * 60 * 60 * 1000);
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

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

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
            };
        });

        // Ordenar dinamicamente:
        const sorted = usersWithMetrics.sort((a, b) => {
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
        });

        return NextResponse.json({ users: sorted });
    } catch (error: any) {
        console.error('Error fetching explore preview:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
