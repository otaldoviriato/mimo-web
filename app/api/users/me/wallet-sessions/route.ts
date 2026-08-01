import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Message } from '@/models/Message';

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

        // 1. Buscar TODAS as microtransações de crédito da criadora (FONTE ABSOLUTA DA VERDADE DO FATURAMENTO)
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
                standaloneGroups: [],
                totalSessionsEarnings: 0,
                totalStandaloneEarnings: 0,
                timeoutMinutes: 180
            });
        }

        // 2. Mapear os clientes envolvidos e buscar mensagens das salas
        const relatedUserIds = Array.from(new Set(microTxs.map((t: any) => t.relatedUserId).filter(Boolean))) as string[];
        const roomIds = relatedUserIds.map(clientClerkId => [clerkId, clientClerkId].sort().join('_'));

        const roomMessages = await Message.find({ roomId: { $in: roomIds } })
            .select('_id roomId senderId receiverId content cost receiverEarnings isGift isLockedImage timestamp createdAt')
            .sort({ timestamp: 1 })
            .lean();

        // 3. Buscar dados dos clientes para fotos e nomes
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

        // 4. Agrupar mensagens por sala para mapear janelas de resposta da criadora
        const msgsByRoom = new Map<string, any[]>();
        roomMessages.forEach((m: any) => {
            const rId = m.roomId || [m.senderId, m.receiverId].sort().join('_');
            if (!msgsByRoom.has(rId)) msgsByRoom.set(rId, []);
            msgsByRoom.get(rId)!.push(m);
        });

        // 5. Agrupar Microtransações por Sala e identificar Sessões vs Avulsas
        const sessionsMap = new Map<string, any>(); // key: roomId_sessionTimestamp -> Session Object
        const standaloneItems: any[] = [];

        microTxs.forEach((tx: any) => {
            const clientClerkId = tx.relatedUserId || 'desconhecido';
            const rId = [clerkId, clientClerkId].sort().join('_');
            const txTs = new Date(tx.timestamp || tx.createdAt).getTime();

            const roomMsgs = msgsByRoom.get(rId) || [];
            const creatorMsgs = roomMsgs.filter(m => m.senderId === clerkId);

            // Verificar se houve resposta/conversa da criadora com o cliente em até 12h da transação (ciclo de conversa)
            const matchedCreatorMsg = creatorMsgs.find(cm => {
                const cmTs = new Date(cm.timestamp || cm.createdAt).getTime();
                return Math.abs(txTs - cmTs) <= 12 * 60 * 60 * 1000;
            });

            const clientInfo = clientMap.get(clientClerkId);
            const itemDesc = tx.source === 'gift'
                ? 'Presente recebido'
                : tx.source === 'image_unlock'
                ? 'Mídia privada desbloqueada'
                : 'Mensagem recebida';

            const txItem = {
                id: tx._id.toString(),
                type: tx.source || 'message',
                amount: tx.amount || 0,
                timestamp: tx.timestamp || tx.createdAt,
                description: itemDesc,
                relatedUserId: clientClerkId,
                clientName: clientInfo?.name || 'Cliente Mimo',
                clientUsername: clientInfo?.username || 'cliente',
                clientPhotoUrl: clientInfo?.photoUrl || null
            };

            if (matchedCreatorMsg && roomMsgs.length >= 2) {
                // Pertence a uma Sessão de Conversa Bi-direcional
                const sessionDateKey = new Date(txTs).toISOString().split('T')[0]; // Agrupar por ciclo/dia de conversa
                const sessionKey = `${rId}_${sessionDateKey}`;

                if (!sessionsMap.has(sessionKey)) {
                    sessionsMap.set(sessionKey, {
                        sessionId: sessionKey,
                        relatedUserId: clientClerkId,
                        clientName: clientInfo?.name || 'Cliente Mimo',
                        clientUsername: clientInfo?.username || 'cliente',
                        clientPhotoUrl: clientInfo?.photoUrl || null,
                        startTime: tx.timestamp || tx.createdAt,
                        endTime: tx.timestamp || tx.createdAt,
                        durationMinutes: 30,
                        messagesCount: 0,
                        mediaCount: 0,
                        giftCount: 0,
                        totalEarnings: 0,
                        items: []
                    });
                }

                const sObj = sessionsMap.get(sessionKey);
                sObj.totalEarnings += (tx.amount || 0);
                sObj.items.push(txItem);
                
                if (tx.source === 'gift') sObj.giftCount += 1;
                else if (tx.source === 'image_unlock') sObj.mediaCount += 1;
                else sObj.messagesCount += 1;

                if (new Date(txItem.timestamp) < new Date(sObj.startTime)) sObj.startTime = txItem.timestamp;
                if (new Date(txItem.timestamp) > new Date(sObj.endTime)) sObj.endTime = txItem.timestamp;
                sObj.durationMinutes = Math.max(1, Math.round((new Date(sObj.endTime).getTime() - new Date(sObj.startTime).getTime()) / (1000 * 60)));

            } else {
                // É uma mensagem/mídia avulsa sem réplica/conversa da criadora
                standaloneItems.push(txItem);
            }
        });

        const enrichedSessions = Array.from(sessionsMap.values());
        enrichedSessions.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

        standaloneItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // 6. Consolidação Visual das Mensagens Avulsas POR CLIENTE
        const standaloneByClient = new Map<string, any>();

        standaloneItems.forEach(item => {
            const clientId = item.relatedUserId;
            if (!standaloneByClient.has(clientId)) {
                standaloneByClient.set(clientId, {
                    clientId,
                    clientName: item.clientName,
                    clientUsername: item.clientUsername,
                    clientPhotoUrl: item.clientPhotoUrl,
                    totalAmount: 0,
                    itemsCount: 0,
                    lastTimestamp: item.timestamp,
                    items: []
                });
            }

            const group = standaloneByClient.get(clientId);
            group.totalAmount += item.amount;
            group.itemsCount += 1;
            group.items.push(item);
            if (new Date(item.timestamp) > new Date(group.lastTimestamp)) {
                group.lastTimestamp = item.timestamp;
            }
        });

        const standaloneGroups = Array.from(standaloneByClient.values());
        standaloneGroups.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());

        const totalSessionsEarnings = enrichedSessions.reduce((sum, s) => sum + s.totalEarnings, 0);
        const totalStandaloneEarnings = standaloneItems.reduce((sum, item) => sum + item.amount, 0);

        return NextResponse.json({
            sessions: enrichedSessions,
            standaloneItems,
            standaloneGroups,
            totalSessionsEarnings,
            totalStandaloneEarnings,
            timeoutMinutes: 180
        });

    } catch (error: any) {
        console.error('Erro ao gerar extrato de sessões da carteira:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
