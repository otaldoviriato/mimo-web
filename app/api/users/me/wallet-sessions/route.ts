import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';

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

        // 1. Obter parâmetro de timeout global (default 180 min se não definido)
        const settings = await AppSettings.findOne({ key: 'global' }).lean();
        const timeoutMinutes = settings?.chatSessionTimeoutMinutes ?? 180;

        // 2. Buscar TODAS as microtransações de crédito da criadora (FONTE DA VERDADE DO DINHEIRO)
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
                timeoutMinutes
            });
        }

        // 3. Mapear os clientes envolvidos e buscar mensagens das salas
        const relatedUserIds = Array.from(new Set(microTxs.map((t: any) => t.relatedUserId).filter(Boolean))) as string[];
        const roomIds = relatedUserIds.map(clientClerkId => [clerkId, clientClerkId].sort().join('_'));

        const roomMessages = await Message.find({ roomId: { $in: roomIds } })
            .select('_id roomId senderId receiverId content cost receiverEarnings isGift isLockedImage timestamp createdAt')
            .sort({ timestamp: 1 })
            .lean();

        // Mapear mensagens por ID e por sala para consulta rápida
        const msgById = new Map<string, any>();
        const msgsByRoom = new Map<string, any[]>();

        roomMessages.forEach((m: any) => {
            msgById.set(m._id.toString(), m);
            const rId = m.roomId || [m.senderId, m.receiverId].sort().join('_');
            if (!msgsByRoom.has(rId)) msgsByRoom.set(rId, []);
            msgsByRoom.get(rId)!.push(m);
        });

        // 4. Buscar dados dos clientes para fotos e nomes
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

        // 5. Mapear as janelas temporais de Sessões Bi-direcionais VÁLIDAS para cada sala
        // REGRA RÍGIDA: Uma Sessão de Conversa DEVE ter pelo menos 2 mensagens trocadas E participação de ambos os participantes.
        const validSessionsByRoom = new Map<string, any[]>();

        msgsByRoom.forEach((roomMsgs, rId) => {
            const sortedMsgs = roomMsgs.slice().sort((a, b) => new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime());
            let currentSession: any = null;
            const roomSessions: any[] = [];

            sortedMsgs.forEach((msg: any) => {
                const mTs = new Date(msg.timestamp || msg.createdAt);

                if (!currentSession) {
                    currentSession = {
                        roomId: rId,
                        clientClerkId: msg.senderId === clerkId ? msg.receiverId : msg.senderId,
                        senders: new Set([msg.senderId]),
                        startTime: mTs,
                        endTime: mTs,
                        messages: [msg]
                    };
                } else {
                    const diffMin = (mTs.getTime() - currentSession.endTime.getTime()) / (1000 * 60);
                    if (diffMin <= timeoutMinutes) {
                        currentSession.endTime = mTs;
                        currentSession.senders.add(msg.senderId);
                        currentSession.messages.push(msg);
                    } else {
                        roomSessions.push(currentSession);
                        currentSession = {
                            roomId: rId,
                            clientClerkId: msg.senderId === clerkId ? msg.receiverId : msg.senderId,
                            senders: new Set([msg.senderId]),
                            startTime: mTs,
                            endTime: mTs,
                            messages: [msg]
                        };
                    }
                }
            });

            if (currentSession) roomSessions.push(currentSession);

            // Filtrar apenas sessões que tenham pelo menos 2 mensagens E remetentes bi-direcionais
            const validTwoWaySessions = roomSessions.filter(s => s.senders.size >= 2 && s.messages.length >= 2);
            validSessionsByRoom.set(rId, validTwoWaySessions);
        });

        // 6. Atribuir CADA MicroTransaction à sua Sessão de Conversa (usando o momento de ENVIO original da mídia)
        const sessionsResultMap = new Map<string, any>();
        const standaloneItems: any[] = [];

        microTxs.forEach((tx: any) => {
            const clientClerkId = tx.relatedUserId || 'desconhecido';
            const rId = [clerkId, clientClerkId].sort().join('_');
            const txTs = new Date(tx.timestamp || tx.createdAt);

            // CORREÇÃO PONTO 1: Tentar encontrar o momento de ENVIO ORIGINAL da mensagem/mídia no chat
            let origMsgTimestamp = txTs;
            if (tx.messageId && msgById.has(tx.messageId.toString())) {
                const orig = msgById.get(tx.messageId.toString());
                origMsgTimestamp = new Date(orig.timestamp || orig.createdAt);
            } else if (tx.source === 'image_unlock' || tx.source === 'gift') {
                // Se o desbloqueio aconteceu depois, procurar a mídia enviada no chat na mesma sala antes ou na conversa
                const roomMsgs = msgsByRoom.get(rId) || [];
                const matchedMedia = roomMsgs.slice().reverse().find(m => {
                    const mTs = new Date(m.timestamp || m.createdAt);
                    return (m.isLockedImage || m.isGift) && mTs.getTime() <= txTs.getTime();
                });
                if (matchedMedia) {
                    origMsgTimestamp = new Date(matchedMedia.timestamp || matchedMedia.createdAt);
                }
            }

            // Verificar se o momento de envio original caiu dentro de alguma Sessão Bi-direcional VÁLIDA
            const roomSessions = validSessionsByRoom.get(rId) || [];
            const matchedSession = roomSessions.find(s => {
                const marginMs = 15 * 60 * 1000; // Margem de 15 min de tolerância
                return origMsgTimestamp.getTime() >= (s.startTime.getTime() - marginMs) && origMsgTimestamp.getTime() <= (s.endTime.getTime() + marginMs);
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

            if (matchedSession) {
                // Pertence a uma Sessão de Conversa Bi-direcional VÁLIDA
                const sessionKey = `${rId}_${matchedSession.startTime.getTime()}`;

                if (!sessionsResultMap.has(sessionKey)) {
                    sessionsResultMap.set(sessionKey, {
                        sessionId: sessionKey,
                        relatedUserId: clientClerkId,
                        clientName: clientInfo?.name || 'Cliente Mimo',
                        clientUsername: clientInfo?.username || 'cliente',
                        clientPhotoUrl: clientInfo?.photoUrl || null,
                        startTime: matchedSession.startTime,
                        endTime: matchedSession.endTime,
                        durationMinutes: Math.max(1, Math.round((matchedSession.endTime.getTime() - matchedSession.startTime.getTime()) / (1000 * 60))),
                        messagesCount: matchedSession.messages.filter((m: any) => !m.isLockedImage && !m.isGift).length,
                        mediaCount: matchedSession.messages.filter((m: any) => m.isLockedImage).length,
                        giftCount: matchedSession.messages.filter((m: any) => m.isGift).length,
                        totalEarnings: 0,
                        items: []
                    });
                }

                const sObj = sessionsResultMap.get(sessionKey);
                sObj.totalEarnings += (tx.amount || 0);
                sObj.items.push(txItem);

                if (new Date(txItem.timestamp) < new Date(sObj.startTime)) sObj.startTime = txItem.timestamp;
                if (new Date(txItem.timestamp) > new Date(sObj.endTime)) sObj.endTime = txItem.timestamp;
                sObj.durationMinutes = Math.max(1, Math.round((new Date(sObj.endTime).getTime() - new Date(sObj.startTime).getTime()) / (1000 * 60)));

            } else {
                // É uma mensagem ou mídia avulsa fora de sessão bi-direcional
                standaloneItems.push(txItem);
            }
        });

        // Filtrar apenas sessões que tiveram ganho acumulado > 0
        const enrichedSessions = Array.from(sessionsResultMap.values()).filter(s => s.totalEarnings > 0);
        enrichedSessions.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

        standaloneItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // 7. Consolidação Visual das Mensagens Avulsas POR CLIENTE
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
            timeoutMinutes
        });

    } catch (error: any) {
        console.error('Erro ao gerar extrato de sessões da carteira:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
