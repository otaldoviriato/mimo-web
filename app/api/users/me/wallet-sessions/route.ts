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

        // 3. Buscar mensagens associadas para usar a data/hora ORIGINAL do envio da mídia/mensagem
        const messageIds = microTxs.map(t => t.messageId).filter(Boolean) as string[];
        const originalMessages = await Message.find({ _id: { $in: messageIds } })
            .select('_id timestamp')
            .lean();

        const messageTimestampMap = new Map<string, Date>();
        originalMessages.forEach((m: any) => {
            if (m.timestamp) {
                messageTimestampMap.set(m._id.toString(), new Date(m.timestamp));
            }
        });

        // 4. Buscar informações dos clientes envolvidos
        const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean))) as string[];
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

        // 5. Mapear para entrada de eventos brutos (usando timestamp da mensagem original para mídias)
        const events: RawEventInput[] = microTxs.map((tx: any) => {
            const originalTimestamp = tx.messageId ? messageTimestampMap.get(tx.messageId.toString()) : null;
            const eventTimestamp = originalTimestamp || tx.timestamp || tx.createdAt;

            return {
                id: tx._id.toString(),
                relatedUserId: tx.relatedUserId || 'desconhecido',
                type: (['message', 'image_unlock', 'gift'].includes(tx.source) ? tx.source : 'other') as any,
                amount: tx.amount || 0,
                timestamp: eventTimestamp,
                description: tx.source === 'message'
                    ? 'Mensagem enviada'
                    : tx.source === 'image_unlock'
                    ? 'Mídia privada desbloqueada'
                    : tx.source === 'gift'
                    ? 'Presente recebido'
                    : 'Crédito de conversa'
            };
        });

        // 6. Agrupar em sessões de conversa (intervalo <= timeoutMinutes)
        const allGroupedSessions = groupEventsIntoSessions(events, timeoutMinutes);

        // 7. Separar em Sessões de Conversa (troca contínua) e Mensagens/Mídias Avulsas
        const multiItemSessions = allGroupedSessions.filter(s => s.items.length > 1);
        const singleItemSessions = allGroupedSessions.filter(s => s.items.length === 1);

        const enrichedSessions = multiItemSessions.map(session => {
            const clientInfo = clientMap.get(session.relatedUserId);
            return {
                ...session,
                clientName: clientInfo?.name || 'Cliente Mimo',
                clientUsername: clientInfo?.username || 'cliente',
                clientPhotoUrl: clientInfo?.photoUrl || null
            };
        });

        const standaloneItems = singleItemSessions.map(session => {
            const clientInfo = clientMap.get(session.relatedUserId);
            const item = session.items[0];
            return {
                id: item.id,
                type: item.type,
                amount: item.amount,
                timestamp: item.timestamp,
                description: item.description,
                relatedUserId: session.relatedUserId,
                clientName: clientInfo?.name || 'Cliente Mimo',
                clientUsername: clientInfo?.username || 'cliente',
                clientPhotoUrl: clientInfo?.photoUrl || null
            };
        });

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
