import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';
import { groupEventsIntoSessions, RawEventInput } from '@/lib/sessionGrouping';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId });
        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        // 1. Obter parâmetro de timeout global (default 30 min)
        const settings = await AppSettings.findOne({ key: 'global' }).lean();
        const timeoutMinutes = settings?.chatSessionTimeoutMinutes ?? 30;

        // 2. Buscar microtransações de crédito da profissional
        const microTxs = await MicroTransaction.find({
            userId: clerkId,
            type: 'credit',
            source: { $in: ['message', 'image_unlock', 'gift'] }
        })
        .sort({ timestamp: 1 })
        .lean();

        if (!microTxs || microTxs.length === 0) {
            return NextResponse.json({
                sessions: [],
                standaloneItems: [],
                totalSessionsEarnings: 0,
                totalStandaloneEarnings: 0,
                timeoutMinutes
            });
        }

        // 3. Mapear os ganhos de crédito por messageId
        const creditAmountByMessageId = new Map<string, number>();
        const orphanTxs: any[] = []; // Microtransações sem mensagem associada (ex: presentes diretos)

        microTxs.forEach((tx: any) => {
            if (tx.messageId) {
                creditAmountByMessageId.set(tx.messageId.toString(), tx.amount || 0);
            } else {
                orphanTxs.push(tx);
            }
        });

        // 4. Identificar clientes envolvidos e montar os roomIds correspondentes
        const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean))) as string[];
        const roomIds = relatedUserIds.map(clientClerkId => [clerkId, clientClerkId].sort().join('_'));

        // 5. Buscar o histórico COMPLETO de mensagens das salas (incluindo as mensagens da profissional)
        const roomMessages = await Message.find({ roomId: { $in: roomIds } })
            .select('_id roomId senderId receiverId content cost receiverEarnings isGift isLockedImage timestamp createdAt')
            .sort({ timestamp: 1 })
            .lean();

        // 6. Buscar dados dos clientes para avatar e nome
        const clients = await User.find({ clerkId: { $in: relatedUserIds } })
            .select('clerkId name username photoUrl')
            .lean();

        const clientMap = new Map<string, { name: string; username: string; photoUrl: string | null }>();
        clients.forEach(c => {
            clientMap.set(c.clerkId, {
                name: c.name || c.username || 'Cliente',
                username: c.username || 'cliente',
                photoUrl: c.photoUrl || null
            });
        });

        // 7. Mapear todas as mensagens das salas em RawEventInput
        const rawEvents: RawEventInput[] = roomMessages.map((msg: any) => {
            const msgIdStr = msg._id.toString();
            const earnedAmount = creditAmountByMessageId.get(msgIdStr) ?? (msg.receiverId === clerkId ? (msg.receiverEarnings || msg.cost || 0) : 0);
            const clientClerkId = msg.senderId === clerkId ? msg.receiverId : msg.senderId;

            const isMine = msg.senderId === clerkId;
            const description = msg.isGift
                ? (isMine ? 'Presente enviado' : 'Presente recebido')
                : msg.isLockedImage
                ? (isMine ? 'Mídia privada enviada' : 'Mídia privada desbloqueada')
                : (isMine ? 'Mensagem enviada' : 'Mensagem recebida');

            return {
                id: msgIdStr,
                relatedUserId: clientClerkId,
                senderId: msg.senderId,
                receiverId: msg.receiverId,
                roomId: msg.roomId,
                type: msg.isGift ? 'gift' : msg.isLockedImage ? 'image_unlock' : 'message',
                amount: earnedAmount,
                timestamp: msg.timestamp || msg.createdAt,
                description
            };
        });

        // Adicionar também transações órfãs (presentes sem mensagem associada)
        orphanTxs.forEach((tx: any) => {
            rawEvents.push({
                id: tx._id.toString(),
                relatedUserId: tx.relatedUserId || 'desconhecido',
                senderId: tx.relatedUserId || 'cliente',
                receiverId: clerkId,
                type: (['message', 'image_unlock', 'gift'].includes(tx.source) ? tx.source : 'other') as any,
                amount: tx.amount || 0,
                timestamp: tx.timestamp || tx.createdAt,
                description: tx.source === 'gift' ? 'Presente recebido' : 'Crédito de conversa'
            });
        });

        // 8. Agrupar em sessões de conversa usando a janela de 30 min
        const allGroupedSessions = groupEventsIntoSessions(rawEvents, timeoutMinutes);

        // 9. Filtrar Sessões de Conversa VÁLIDAS:
        // Uma Sessão de Conversa exige bi-direcionalidade (isTwoWaySession === true: mensagens de AMBOS os participantes no bloco) E que tenha gerado ganho acumulado > 0.
        const twoWaySessions = allGroupedSessions.filter(s => s.isTwoWaySession && s.items.length >= 2 && s.totalEarnings > 0);
        const singleSideSessions = allGroupedSessions.filter(s => !s.isTwoWaySession || s.items.length < 2 || !twoWaySessions.includes(s));

        const enrichedSessions = twoWaySessions.map(session => {
            const clientInfo = clientMap.get(session.relatedUserId);
            // Filtrar apenas os itens da sessão que representam faturamento (amount > 0) para exibir na composição
            const paidItems = session.items.filter(item => item.amount > 0);

            return {
                ...session,
                clientName: clientInfo?.name || 'Cliente Mimo',
                clientUsername: clientInfo?.username || 'cliente',
                clientPhotoUrl: clientInfo?.photoUrl || null,
                items: paidItems.length > 0 ? paidItems : session.items
            };
        });

        // 10. Extrair apenas os itens PAGOS (amount > 0) de blocos sem bi-direcionalidade para Mensagens Avulsas
        const standaloneItemsMap = new Map<string, any>();
        singleSideSessions.forEach(session => {
            const clientInfo = clientMap.get(session.relatedUserId);
            session.items.forEach(item => {
                if (item.amount > 0 && !standaloneItemsMap.has(item.id)) {
                    standaloneItemsMap.set(item.id, {
                        id: item.id,
                        type: item.type,
                        amount: item.amount,
                        timestamp: item.timestamp,
                        description: item.description,
                        relatedUserId: session.relatedUserId,
                        clientName: clientInfo?.name || 'Cliente Mimo',
                        clientUsername: clientInfo?.username || 'cliente',
                        clientPhotoUrl: clientInfo?.photoUrl || null
                    });
                }
            });
        });

        const standaloneItems = Array.from(standaloneItemsMap.values());
        standaloneItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const totalSessionsEarnings = enrichedSessions.reduce((sum, s) => sum + s.totalEarnings, 0);
        const totalStandaloneEarnings = standaloneItems.reduce((sum, item) => sum + item.amount, 0);

        return NextResponse.json({
            sessions: enrichedSessions,
            standaloneItems,
            totalSessionsEarnings,
            totalStandaloneEarnings,
            timeoutMinutes
        });

    } catch (error: any) {
        console.error('Erro ao gerar extrato de sessões da carteira:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
