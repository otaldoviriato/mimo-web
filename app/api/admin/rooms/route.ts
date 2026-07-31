import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';
import { groupEventsIntoSessions, RawEventInput } from '@/lib/sessionGrouping';

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

        const timeoutMinutes = settings?.chatSessionTimeoutMinutes ?? 30;

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
        let messageQuery: any = {};
        if (filterUserId) {
            messageQuery.$or = [
                { senderId: filterUserId },
                { receiverId: filterUserId }
            ];
        }

        const rawMessages = await Message.find(messageQuery)
            .sort({ timestamp: 1 })
            .select('_id roomId senderId receiverId cost receiverEarnings content isGift isLockedImage timestamp')
            .lean();

        const rawEvents: RawEventInput[] = rawMessages.map((msg: any) => ({
            id: msg._id.toString(),
            relatedUserId: filterUserId
                ? (msg.senderId === filterUserId ? msg.receiverId : msg.senderId)
                : msg.senderId,
            roomId: msg.roomId,
            type: msg.isGift ? 'gift' : msg.isLockedImage ? 'image_unlock' : 'message',
            amount: msg.cost || 0, // valor pago pelo cliente em centavos
            timestamp: msg.timestamp || msg.createdAt,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            description: msg.content
        }));

        const groupedSessions = groupEventsIntoSessions(rawEvents, timeoutMinutes);

        // Enriquecer sessões com dados dos participantes A e B
        const enrichedSessions = groupedSessions.map((session) => {
            let clerkIdA = filterUserId || session.items[0]?.senderId || 'user_a';
            let clerkIdB = session.relatedUserId;

            if (!clerkIdB || clerkIdB === clerkIdA) {
                clerkIdB = session.items[0]?.receiverId || 'user_b';
            }

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
                mediaCount: session.mediaCount,
                giftCount: session.giftCount,
                totalRevenue: session.totalEarnings / 100, // em Reais
                itemsCount: session.items.length
            };
        });

        return NextResponse.json({
            rooms: enrichedRooms,
            sessions: enrichedSessions,
            timeoutMinutes
        });

    } catch (error: any) {
        console.error('Erro na API de salas do admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
