import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { MicroTransaction } from '@/models/MicroTransaction';
import { AppSettings } from '@/models/AppSettings';
import { buildEarningsSessions } from '@/lib/earningsSessions';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

        const timeoutMinutes = settings?.earningsSessionInactivityMinutes ?? 120;
        const minimumEarningsCents = settings?.earningsSessionMinimumCents ?? 1000;

        const { searchParams } = new URL(request.url);
        const filterUserId = searchParams.get('userId');

        let query: any = {};
        if (filterUserId) {
            query.participants = filterUserId;
        }

        // 2. Buscar todas as salas (ou filtradas por participante)
        const rooms = await Room.find(query).sort({ updatedAt: -1 }).lean() as any[];

        // Coletar todos os Clerk IDs dos participantes das salas
        const participantClerkIds = Array.from(
            new Set(rooms.flatMap(room => room.participants))
        ) as string[];

        // Buscar detalhes dos usuários envolvidos
        const usersList = await User.find({ clerkId: { $in: participantClerkIds } })
            .select('clerkId name username email photoUrl')
            .lean();

        const now = new Date();

        // 3. Mapear cada sala (Relacionamento) com estatísticas totais
        const enrichedRooms = await Promise.all(rooms.map(async (room) => {
            const sortedParticipants = [...room.participants].sort();
            const roomIdStr = sortedParticipants.join('_');

            // Usuário A e Usuário B
            const clerkIdA = room.participants[0];
            const clerkIdB = room.participants[1];

            const userAObj = usersList.find(u => u.clerkId === clerkIdA);
            const userBObj = usersList.find(u => u.clerkId === clerkIdB);

            const userA = {
                clerkId: clerkIdA,
                name: userAObj?.name || userAObj?.username || `Usuário (${clerkIdA.substring(0, 8)})`,
                email: userAObj?.email || 'N/A',
                photoUrl: userAObj?.photoUrl || null
            };

            const userB = {
                clerkId: clerkIdB,
                name: userBObj?.name || userBObj?.username || `Usuário (${clerkIdB.substring(0, 8)})`,
                email: userBObj?.email || 'N/A',
                photoUrl: userBObj?.photoUrl || null
            };

            // Contar total de mensagens da sala no MongoDB
            const messagesCount = await Message.countDocuments({ roomId: roomIdStr });

            // Calcular o faturamento total da conversa (soma de cost de todas as mensagens)
            const revenueSumResult = await Message.aggregate([
                { $match: { roomId: roomIdStr } },
                { $group: { _id: null, total: { $sum: '$cost' } } }
            ]);
            const totalRevenue = revenueSumResult.length > 0 ? (revenueSumResult[0].total / 100) : 0; // convertido para reais

            // Formatação do tempo do último contato
            const contactDate = room.lastMessageTime ? new Date(room.lastMessageTime) : new Date(room.updatedAt);
            const diffMs = now.getTime() - contactDate.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMin / 60);

            let timeAgo = contactDate.toLocaleDateString('pt-BR');
            if (diffMin < 60) {
                timeAgo = diffMin <= 1 ? 'Agora' : `Há ${diffMin} min`;
            } else if (diffHrs < 24) {
                timeAgo = `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
            } else if (diffHrs < 48) {
                timeAgo = 'Ontem';
            }

            return {
                id: room._id.toString(),
                userA,
                userB,
                messagesCount,
                lastMessage: room.lastMessage || 'Nenhuma mensagem enviada',
                time: timeAgo,
                totalRevenue,
            };
        }));

        // 4. Buscar e agrupar mensagens para a lista de Sessões de Conversa
        const groupedSessions = filterUserId ? buildEarningsSessions(
            filterUserId,
            (await Message.find({
                isSystem: { $ne: true },
                $or: [{ senderId: filterUserId }, { receiverId: filterUserId }]
            })
                .sort({ timestamp: 1 })
                .select('_id roomId senderId receiverId isGift isLockedImage isVideo timestamp createdAt')
                .lean() as any[]).map(message => ({
                    id: message._id.toString(),
                    roomId: message.roomId,
                    senderId: message.senderId,
                    receiverId: message.receiverId,
                    timestamp: message.timestamp || message.createdAt,
                    isGift: message.isGift,
                    isLockedImage: message.isLockedImage,
                    isVideo: message.isVideo,
                })),
            (await MicroTransaction.find({
                userId: filterUserId,
                type: 'credit',
                source: { $in: ['message', 'image_unlock', 'gift'] }
            })
                .sort({ timestamp: 1 })
                .select('_id amount source relatedUserId messageId metadata timestamp createdAt')
                .lean() as any[]).map(transaction => ({
                    id: transaction._id.toString(),
                    amount: transaction.amount,
                    source: transaction.source,
                    relatedUserId: transaction.relatedUserId,
                    timestamp: transaction.timestamp || transaction.createdAt,
                    messageId: transaction.messageId?.toString()
                        || transaction.metadata?.messageId?.toString(),
                })),
            timeoutMinutes,
            minimumEarningsCents,
        ) : [];

        // Enriquecer sessões com dados dos participantes A e B
        const enrichedSessions = groupedSessions.map((session) => {
            const clerkIdA = filterUserId!;
            const clerkIdB = session.relatedUserId;

            const userAObj = usersList.find(u => u.clerkId === clerkIdA);
            const userBObj = usersList.find(u => u.clerkId === clerkIdB);

            const userA = {
                clerkId: clerkIdA,
                name: userAObj?.name || userAObj?.username || `Usuário (${clerkIdA.substring(0, 8)})`,
                email: userAObj?.email || 'N/A',
                photoUrl: userAObj?.photoUrl || null
            };

            const userB = {
                clerkId: clerkIdB,
                name: userBObj?.name || userBObj?.username || `Usuário (${clerkIdB.substring(0, 8)})`,
                email: userBObj?.email || 'N/A',
                photoUrl: userBObj?.photoUrl || null
            };

            const startStr = session.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const endStr = session.endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = session.startTime.toLocaleDateString('pt-BR');

            return {
                id: session.sessionId,
                roomId: session.roomId,
                userA,
                userB,
                startTime: session.startTime,
                endTime: session.endTime,
                timeRangeLabel: `${dateStr} às ${startStr} - ${endStr}`,
                durationMinutes: session.durationMinutes,
                messagesCount: session.messagesCount,
                professionalMessages: session.professionalMessages,
                clientMessages: session.clientMessages,
                mediaCount: session.mediaCount,
                giftCount: session.giftCount,
                totalRevenue: session.totalEarnings / 100, // em Reais
                messageRevenue: session.messageEarnings / 100,
                mediaRevenue: session.mediaEarnings / 100,
                giftRevenue: session.giftEarnings / 100,
                itemsCount: session.transactionIds.length
            };
        });

        return NextResponse.json({
            rooms: enrichedRooms,
            sessions: enrichedSessions,
            timeoutMinutes,
            minimumEarningsCents
        });

    } catch (error: any) {
        console.error('Erro na API de salas do admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
