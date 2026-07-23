import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Auxiliar para calcular variação percentual
function calculateChange(current: number, previous: number): { change: string; isPositive: boolean } {
    if (previous === 0) {
        return {
            change: current > 0 ? '+100%' : '0%',
            isPositive: current >= 0,
        };
    }
    const diff = ((current - previous) / previous) * 100;
    const sign = diff >= 0 ? '+' : '';
    return {
        change: `${sign}${diff.toFixed(1)}%`,
        isPositive: diff >= 0,
    };
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        // 1. Validar se o usuário é administrador
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings 
            ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN 
            : userId === FALLBACK_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        // 2. Determinar o período comparativo
        const searchParams = request.nextUrl.searchParams;
        let period = searchParams.get('period') || '';
        
        const validPeriods = ['none', 'week', 'month'];
        if (!validPeriods.includes(period)) {
            period = settings?.comparisonPeriod || 'none';
        }

        const now = new Date();
        let startDate: Date | null = null;
        let prevStartDate: Date | null = null;

        if (period === 'week') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        }

        // --- CÁLCULO DE MÉTRICAS ---

        const onboardingCompletedFilter = {
            $or: [
                { onboardingStep: 'completed' },
                { name: { $exists: true, $ne: '' }, onboardingStep: { $exists: false } }
            ]
        };

        const activeUserThresholdDays = settings?.activeUserThresholdDays || 7;
        const activeThresholdDate = new Date(now.getTime() - activeUserThresholdDays * 24 * 60 * 60 * 1000);

        // A. Clientes Ativos & B. Profissionais Ativos
        let activeClients = 0;
        let activeClientsChange = '';
        let isActiveClientsPositive = true;

        let activeProfessionals = 0;
        let activeProfessionalsChange = '';
        let isActiveProfessionalsPositive = true;

        const baseClientFilter = {
            ...onboardingCompletedFilter,
            isProfessional: { $ne: true }
        };

        const baseProfessionalFilter = {
            ...onboardingCompletedFilter,
            isProfessional: true
        };

        if (startDate && prevStartDate) {
            const currActiveClients = await User.countDocuments({
                ...baseClientFilter,
                lastAccessAt: { $gte: startDate }
            });
            const prevActiveClients = await User.countDocuments({
                ...baseClientFilter,
                lastAccessAt: { $gte: prevStartDate, $lt: startDate }
            });
            const resClients = calculateChange(currActiveClients, prevActiveClients);
            activeClients = currActiveClients;
            activeClientsChange = resClients.change;
            isActiveClientsPositive = resClients.isPositive;

            const currActiveProfs = await User.countDocuments({
                ...baseProfessionalFilter,
                lastAccessAt: { $gte: startDate }
            });
            const prevActiveProfs = await User.countDocuments({
                ...baseProfessionalFilter,
                lastAccessAt: { $gte: prevStartDate, $lt: startDate }
            });
            const resProfs = calculateChange(currActiveProfs, prevActiveProfs);
            activeProfessionals = currActiveProfs;
            activeProfessionalsChange = resProfs.change;
            isActiveProfessionalsPositive = resProfs.isPositive;
        } else {
            activeClients = await User.countDocuments({
                ...baseClientFilter,
                lastAccessAt: { $gte: activeThresholdDate }
            });
            activeProfessionals = await User.countDocuments({
                ...baseProfessionalFilter,
                lastAccessAt: { $gte: activeThresholdDate }
            });
        }

        // C. Conversas Ativas
        let activeChats = 0;
        let chatsChange = '';
        let isChatsPositive = true;

        if (startDate && prevStartDate) {
            const currActiveRooms = await Message.distinct('roomId', { timestamp: { $gte: startDate } });
            activeChats = currActiveRooms.length;

            const prevActiveRooms = await Message.distinct('roomId', { timestamp: { $gte: prevStartDate, $lt: startDate } });
            const res = calculateChange(currActiveRooms.length, prevActiveRooms.length);
            chatsChange = res.change;
            isChatsPositive = res.isPositive;
        } else {
            const allActiveRooms = await Message.distinct('roomId');
            activeChats = allActiveRooms.length;
        }

        // D. Mensagens Enviadas
        let totalMessages = 0;
        let messagesChange = '';
        let isMessagesPositive = true;

        if (startDate && prevStartDate) {
            const currMessages = await Message.countDocuments({ timestamp: { $gte: startDate } });
            totalMessages = currMessages;

            const prevMessages = await Message.countDocuments({ timestamp: { $gte: prevStartDate, $lt: startDate } });
            const res = calculateChange(currMessages, prevMessages);
            messagesChange = res.change;
            isMessagesPositive = res.isPositive;
        } else {
            totalMessages = await Message.countDocuments();
        }

        // --- GRÁFICO DE DESEMPENHO (Últimos 7 dias) ---
        const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const activityData = [];

        for (let i = 6; i >= 0; i--) {
            const dStart = new Date();
            dStart.setHours(0, 0, 0, 0);
            dStart.setDate(dStart.getDate() - i);

            const dEnd = new Date(dStart);
            dEnd.setDate(dEnd.getDate() + 1);

            const dayLabel = weekdayNames[dStart.getDay()];

            const msgsCount = await Message.countDocuments({ timestamp: { $gte: dStart, $lt: dEnd } });
            const usrsCount = await User.countDocuments({ ...onboardingCompletedFilter, createdAt: { $gte: dStart, $lt: dEnd } });

            activityData.push({
                label: dayLabel,
                messages: msgsCount,
                users: usrsCount,
            });
        }

        // --- LISTAS COMPARATIVAS DE PRINCIPAIS USUÁRIOS ATIVOS ---
        const activeUsersList = await User.find({
            ...onboardingCompletedFilter,
            lastAccessAt: { $gte: activeThresholdDate }
        })
            .select('clerkId username name photoUrl isProfessional')
            .lean() as any[];

        const activeClerkIds = activeUsersList.map(u => u.clerkId);

        let activeClientsData: any[] = [];
        let activeProfessionalsData: any[] = [];

        if (activeClerkIds.length > 0) {
            // 1. Quantidade de salas ativas por usuário (com bidirecionalidade obrigatória nas últimas 48h)
            const activeRoomsLimit = new Date(Date.now() - 48 * 60 * 60 * 1000);

            // Buscar salas ativas na janela de tempo
            const activeRoomsDocs = await Room.find({
                participants: { $in: activeClerkIds },
                lastMessageTime: { $gte: activeRoomsLimit }
            }).select('participants').lean();

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
                ]);

                // Montar mapa userId → count de salas bilaterais ativas
                for (const { _id: vId } of biSendersAgg) {
                    const participants = roomVirtualMap.get(vId) ?? [];
                    for (const p of participants) {
                        if (activeClerkIds.includes(p)) {
                            activeRoomsMap.set(p, (activeRoomsMap.get(p) ?? 0) + 1);
                        }
                    }
                }
            }


            // 2. Total recarregado por clientes (em reais)
            const depositsAgg = await Transaction.aggregate([
                { $match: { userId: { $in: activeClerkIds }, source: 'recharge', status: 'PAID' } },
                { $group: { _id: '$userId', total: { $sum: '$amount' } } }
            ]);
            const depositsMap = new Map<string, number>(depositsAgg.map(d => [d._id, d.total]));

            // Agregação de recargas nos últimos 30 dias para obter o nível do cliente
            const startOf30Days = new Date();
            startOf30Days.setDate(startOf30Days.getDate() - 30);
            const recharges30DaysAgg = await Transaction.aggregate([
                { $match: { userId: { $in: activeClerkIds }, source: 'recharge', status: 'PAID', timestamp: { $gte: startOf30Days } } },
                { $group: { _id: '$userId', total: { $sum: '$amount' } } }
            ]);
            const recharges30DaysMap = new Map<string, number>(recharges30DaysAgg.map(r => [r._id, r.total]));

            const globalSettings = await AppSettings.findOne({ key: 'global' }).select('clientLevels').lean() as any;

            const getClientLevel = (amount: number): any => {
                if (!globalSettings?.clientLevels || globalSettings.clientLevels.length === 0) {
                    let levelName = 'Novo';
                    let color = '#64748B';
                    let icon = 'Medal';
                    if (amount > 0 && amount <= 100) { levelName = 'Bronze'; color = '#D97706'; }
                    else if (amount > 100 && amount <= 500) { levelName = 'Prata'; color = '#64748B'; }
                    else if (amount > 500 && amount <= 1000) { levelName = 'Ouro'; color = '#EAB308'; icon = 'Crown'; }
                    else if (amount > 1000) { levelName = 'VIP'; color = '#000000'; icon = 'Crown'; }
                    return { name: levelName, color, icon };
                }
                const sortedLevels = [...globalSettings.clientLevels].sort((a: any, b: any) => b.minAmount - a.minAmount);
                for (const lvl of sortedLevels) {
                    if (amount >= lvl.minAmount) {
                        return { name: lvl.name, color: lvl.color, icon: lvl.icon };
                    }
                }
                return { name: 'Novo', color: '#64748B', icon: 'Medal' };
            };

            // 3. Faturamento obtido por profissionais (em reais)
            const earningsAgg = await MicroTransaction.aggregate([
                { $match: { userId: { $in: activeClerkIds }, type: 'credit' } },
                { $group: { _id: '$userId', total: { $sum: '$amount' } } }
            ]);
            const earningsMap = new Map<string, number>(earningsAgg.map(e => [e._id, e.total / 100]));

            const subscriptionEarningsAgg = await Transaction.aggregate([
                { $match: { userId: { $in: activeClerkIds }, type: 'credit', source: 'subscription', status: 'COMPLETED' } },
                { $group: { _id: '$userId', total: { $sum: '$amount' } } }
            ]);
            const subscriptionEarningsMap = new Map<string, number>(subscriptionEarningsAgg.map(s => [s._id, s.total / 100]));

            // 4. Mensagens trocadas por usuário
            const messagesAgg = await Message.aggregate([
                { $match: { isSystem: { $ne: true }, $or: [{ senderId: { $in: activeClerkIds } }, { receiverId: { $in: activeClerkIds } }] } },
                { $project: { parties: { $setUnion: [['$senderId'], ['$receiverId']] } } },
                { $unwind: '$parties' },
                { $match: { parties: { $in: activeClerkIds } } },
                { $group: { _id: '$parties', total: { $sum: 1 } } }
            ]);
            const messagesMap = new Map<string, number>(messagesAgg.map(m => [m._id, m.total]));

            // 5. Mensagens trocadas na última semana
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const messagesLastWeekAgg = await Message.aggregate([
                { $match: { isSystem: { $ne: true }, timestamp: { $gte: oneWeekAgo }, $or: [{ senderId: { $in: activeClerkIds } }, { receiverId: { $in: activeClerkIds } }] } },
                { $project: { parties: { $setUnion: [['$senderId'], ['$receiverId']] } } },
                { $unwind: '$parties' },
                { $match: { parties: { $in: activeClerkIds } } },
                { $group: { _id: '$parties', total: { $sum: 1 } } }
            ]);
            const messagesLastWeekMap = new Map<string, number>(messagesLastWeekAgg.map(m => [m._id, m.total]));

            // Agrupar Clientes
            activeClientsData = activeUsersList
                .filter(u => !u.isProfessional)
                .map(u => {
                    const totalRecharged = depositsMap.get(u.clerkId) || 0;
                    const activeRoomsCount = activeRoomsMap.get(u.clerkId) || 0;
                    const totalMessages = messagesMap.get(u.clerkId) || 0;
                    const messagesLastWeek = messagesLastWeekMap.get(u.clerkId) || 0;
                    return {
                        clerkId: u.clerkId,
                        username: u.username,
                        name: u.name || u.username,
                        photoUrl: u.photoUrl || null,
                        activeRoomsCount,
                        totalRecharged,
                        totalMessages,
                        messagesLastWeek,
                        clientLevel: getClientLevel(recharges30DaysMap.get(u.clerkId) || 0)
                    };
                })
                .sort((a, b) => b.activeRoomsCount - a.activeRoomsCount || b.totalRecharged - a.totalRecharged)
                .slice(0, 5);

            // Agrupar Profissionais
            activeProfessionalsData = activeUsersList
                .filter(u => u.isProfessional)
                .map(u => {
                    const totalEarned = (earningsMap.get(u.clerkId) || 0) + (subscriptionEarningsMap.get(u.clerkId) || 0);
                    const activeRoomsCount = activeRoomsMap.get(u.clerkId) || 0;
                    const totalMessages = messagesMap.get(u.clerkId) || 0;
                    const messagesLastWeek = messagesLastWeekMap.get(u.clerkId) || 0;
                    return {
                        clerkId: u.clerkId,
                        username: u.username,
                        name: u.name || u.username,
                        photoUrl: u.photoUrl || null,
                        activeRoomsCount,
                        totalEarned,
                        totalMessages,
                        messagesLastWeek
                    };
                })
                .sort((a, b) => b.activeRoomsCount - a.activeRoomsCount || b.totalEarned - a.totalEarned)
                .slice(0, 5);
        }

        // --- ÚLTIMOS DEPÓSITOS (Apenas recharge PAID) ---
        const rawTransactions = await Transaction.find({
            source: 'recharge',
            status: 'PAID'
        })
            .sort({ timestamp: -1 })
            .limit(5)
            .lean() as any[];

        const txClerkIds = rawTransactions.map(tx => tx.userId).filter(Boolean) as string[];

        const txUsersList = await User.find({ clerkId: { $in: txClerkIds } })
            .select('clerkId name username')
            .lean();

        const mappedTransactions = rawTransactions.map(tx => {
            const relatedUser = txUsersList.find(u => u.clerkId === tx.userId);
            const userName = relatedUser 
                ? (relatedUser.name || `@${relatedUser.username}`) 
                : `Usuário (${tx.userId.substring(0, 8)}...)`;

            const valInReais = tx.amount || 0;
            const typeLabel = tx.type === 'PIX' ? 'Recarga Pix' : 'Recarga Cartão';

            // Formatação do tempo
            const txDate = tx.timestamp ? new Date(tx.timestamp) : new Date();
            const diffMs = now.getTime() - txDate.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMin / 60);

            let timeAgo = txDate.toLocaleDateString('pt-BR');
            if (diffMin < 60) {
                timeAgo = diffMin <= 1 ? 'Agora mesmo' : `Há ${diffMin} min`;
            } else if (diffHrs < 24) {
                timeAgo = `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
            } else if (diffHrs < 48) {
                timeAgo = 'Ontem';
            }

            return {
                id: tx._id?.toString(),
                displayId: tx.abacatePayId || tx._id?.toString() || `TX-${Math.floor(Math.random() * 100000)}`,
                user: userName,
                userId: tx.userId,
                val: valInReais,
                type: typeLabel,
                source: tx.source,
                time: timeAgo,
                status: 'Aprovado',
                timestamp: txDate,
                fee: 0,
                net: valInReais
            };
        });

        // 3. Responder
        return NextResponse.json({
            period,
            metrics: {
                activeClients: {
                    value: activeClients.toLocaleString('pt-BR'),
                    change: period !== 'none' ? activeClientsChange : null,
                    isPositive: isActiveClientsPositive
                },
                activeProfessionals: {
                    value: activeProfessionals.toLocaleString('pt-BR'),
                    change: period !== 'none' ? activeProfessionalsChange : null,
                    isPositive: isActiveProfessionalsPositive
                },
                activeChats: {
                    value: activeChats.toLocaleString('pt-BR'),
                    change: period !== 'none' ? chatsChange : null,
                    isPositive: isChatsPositive
                },
                messages: {
                    value: totalMessages.toLocaleString('pt-BR'),
                    change: period !== 'none' ? messagesChange : null,
                    isPositive: isMessagesPositive
                }
            },
            activityData,
            recentTransactions: mappedTransactions,
            activeClientsData,
            activeProfessionalsData,
        });

    } catch (error: any) {
        console.error('Erro na API de estatísticas da Dashboard:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
