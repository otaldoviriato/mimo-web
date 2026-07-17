import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, GalleryItem, Room, Message, Transaction } from '@/models';
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

        const settings = await AppSettings.findOne({ key: 'global' }).select('defaultPricePerCharSubscribers defaultPricePerCharNonSubscribers newProfileDaysThreshold exploreSortingCriteria chatInactivityHours clientLevels').lean() as any;
        const defaultSub = settings?.defaultPricePerCharSubscribers ?? 0.002;
        const defaultNonSub = settings?.defaultPricePerCharNonSubscribers ?? 0.005;
        const thresholdDays = settings?.newProfileDaysThreshold ?? 15;
        const exploreSortingCriteria = settings?.exploreSortingCriteria || ['activeConversations', 'messagesLastWeek', 'online', 'recentAccess', 'completeness'];
        const chatInactivityHours = settings?.chatInactivityHours ?? 48;

        const activeLimit = new Date(Date.now() - chatInactivityHours * 60 * 60 * 1000);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Agregação de conversas ativas (com bidirecionalidade obrigatória)
        const activeRoomsDocs = await Room.find({
            participants: { $in: clerkIds },
            lastMessageTime: { $gte: activeLimit }
        }).select('participants').lean() as any[];

        const activeRoomsMap = new Map<string, number>();

        if (activeRoomsDocs.length > 0) {
            // Montar virtualRoomIds (formato usado pelas mensagens: p1_p2 ordenado)
            const roomVirtualMap = new Map<string, string[]>(); // virtualRoomId → participants
            for (const room of activeRoomsDocs) {
                const vId = (room.participants as string[]).slice().sort().join('_');
                roomVirtualMap.set(vId, room.participants as string[]);
            }
            const virtualRoomIds = Array.from(roomVirtualMap.keys());

            // Quais roomIds têm mensagens de pelo menos 2 remetentes distintos?
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

            // Montar mapa userId → count de salas bilaterais ativas
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

        const getClientLevel = (amount: number): any => {
            if (!settings?.clientLevels || settings.clientLevels.length === 0) {
                let levelName = 'Novo';
                let color = '#64748B';
                let icon = 'Medal';
                if (amount > 0 && amount <= 100) { levelName = 'Bronze'; color = '#D97706'; }
                else if (amount > 100 && amount <= 500) { levelName = 'Prata'; color = '#64748B'; }
                else if (amount > 500 && amount <= 1000) { levelName = 'Ouro'; color = '#EAB308'; icon = 'Crown'; }
                else if (amount > 1000) { levelName = 'VIP'; color = '#000000'; icon = 'Crown'; }
                return { name: levelName, color, icon };
            }
            const sortedLevels = [...settings.clientLevels].sort((a: any, b: any) => b.minAmount - a.minAmount);
            for (const lvl of sortedLevels) {
                if (amount >= lvl.minAmount) {
                    return { name: lvl.name, color: lvl.color, icon: lvl.icon };
                }
            }
            return { name: 'Novo', color: '#64748B', icon: 'Medal' };
        };

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

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);

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
                clientLevel: getClientLevel(clientRechargesMap.get(u.clerkId) || 0)
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
