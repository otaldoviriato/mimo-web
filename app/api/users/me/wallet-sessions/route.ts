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

        // 2. Buscar TODAS as microtransações de crédito da criadora (FONTE ABSOLUTA DA VERDADE DO DINHEIRO)
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

        // 5. Agrupar microtransações e mensagens por sala (roomId)
        const txsByRoom = new Map<string, any[]>();
        microTxs.forEach((tx: any) => {
            const rId = [clerkId, tx.relatedUserId || 'desconhecido'].sort().join('_');
            if (!txsByRoom.has(rId)) txsByRoom.set(rId, []);
            txsByRoom.get(rId)!.push(tx);
        });

        const msgsByRoom = new Map<string, any[]>();
        roomMessages.forEach((m: any) => {
            const rId = m.roomId || [m.senderId, m.receiverId].sort().join('_');
            if (!msgsByRoom.has(rId)) msgsByRoom.set(rId, []);
            msgsByRoom.get(rId)!.push(m);
        });

        const sessionsMap = new Map<string, any>();
        const standaloneItems: any[] = [];

        // 6. Processar sala por sala com validação rígida de sessões bi-direcionais
        txsByRoom.forEach((txs, rId) => {
            const msgs = msgsByRoom.get(rId) || [];
            const creatorMsgs = msgs.filter((m: any) => m.senderId === clerkId);

            if (creatorMsgs.length === 0) {
                // Se a criadora nunca enviou nenhuma mensagem na sala -> 100% das transações são Avulsas
                txs.forEach((tx: any) => {
                    const clientClerkId = tx.relatedUserId || 'desconhecido';
                    const clientInfo = clientMap.get(clientClerkId);
                    standaloneItems.push({
                        id: tx._id.toString(),
                        type: tx.source || 'message',
                        amount: tx.amount || 0,
                        timestamp: tx.timestamp || tx.createdAt,
                        description: tx.source === 'gift' ? 'Presente recebido' : tx.source === 'image_unlock' ? 'Mídia privada desbloqueada' : 'Mensagem recebida',
                        relatedUserId: clientClerkId,
                        clientName: clientInfo?.name || 'Cliente Mimo',
                        clientUsername: clientInfo?.username || 'cliente',
                        clientPhotoUrl: clientInfo?.photoUrl || null
                    });
                });
            } else {
                // Mapear sessões válidas na sala (janela de inatividade, bi-direcionalidade e >= 2 mensagens)
                const sortedMsgs = msgs.slice().sort((a, b) => new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime());
                let currentSession: any = null;
                const validSessions: any[] = [];

                sortedMsgs.forEach((m: any) => {
                    const mTs = new Date(m.timestamp || m.createdAt);
                    if (!currentSession) {
                        currentSession = {
                            senders: new Set([m.senderId]),
                            startTime: mTs,
                            endTime: mTs,
                            messages: [m]
                        };
                    } else {
                        const diffMin = (mTs.getTime() - currentSession.endTime.getTime()) / (1000 * 60);
                        if (diffMin <= timeoutMinutes) {
                            currentSession.endTime = mTs;
                            currentSession.senders.add(m.senderId);
                            currentSession.messages.push(m);
                        } else {
                            if (currentSession.senders.size >= 2 && currentSession.messages.length >= 2) {
                                validSessions.push(currentSession);
                            }
                            currentSession = {
                                senders: new Set([m.senderId]),
                                startTime: mTs,
                                endTime: mTs,
                                messages: [m]
                            };
                        }
                    }
                });
                if (currentSession && currentSession.senders.size >= 2 && currentSession.messages.length >= 2) {
                    validSessions.push(currentSession);
                }

                // Atribuir cada transação de crédito (mensagem, desbloqueio de mídia ou presente) à sessão bi-direcional correspondente
                txs.forEach((tx: any) => {
                    const txTs = new Date(tx.timestamp || tx.createdAt).getTime();
                    const clientClerkId = tx.relatedUserId || 'desconhecido';
                    const clientInfo = clientMap.get(clientClerkId);

                    const txItem = {
                        id: tx._id.toString(),
                        type: tx.source || 'message',
                        amount: tx.amount || 0,
                        timestamp: tx.timestamp || tx.createdAt,
                        description: tx.source === 'gift' ? 'Presente recebido' : tx.source === 'image_unlock' ? 'Mídia privada desbloqueada' : 'Mensagem recebida',
                        relatedUserId: clientClerkId,
                        clientName: clientInfo?.name || 'Cliente Mimo',
                        clientUsername: clientInfo?.username || 'cliente',
                        clientPhotoUrl: clientInfo?.photoUrl || null
                    };

                    if (validSessions.length === 0) {
                        standaloneItems.push(txItem);
                        return;
                    }

                    // Encontrar a sessão bi-direcional mais próxima no tempo daquela sala
                    let closestSession: any = null;
                    let minDiffMs = Infinity;

                    validSessions.forEach(s => {
                        let diffMs = 0;
                        if (txTs < s.startTime.getTime()) diffMs = s.startTime.getTime() - txTs;
                        else if (txTs > s.endTime.getTime()) diffMs = txTs - s.endTime.getTime();

                        if (diffMs < minDiffMs) {
                            minDiffMs = diffMs;
                            closestSession = s;
                        }
                    });

                    // Janela de 24 horas para desbloqueio de mídias/mensagens no mesmo ciclo de conversa daquela sala
                    if (closestSession && minDiffMs <= 24 * 60 * 60 * 1000) {
                        const sessionKey = `${rId}_${closestSession.startTime.getTime()}`;

                        if (!sessionsMap.has(sessionKey)) {
                            sessionsMap.set(sessionKey, {
                                sessionId: sessionKey,
                                relatedUserId: clientClerkId,
                                clientName: clientInfo?.name || 'Cliente Mimo',
                                clientUsername: clientInfo?.username || 'cliente',
                                clientPhotoUrl: clientInfo?.photoUrl || null,
                                startTime: closestSession.startTime,
                                endTime: closestSession.endTime,
                                durationMinutes: Math.max(1, Math.round((closestSession.endTime.getTime() - closestSession.startTime.getTime()) / (1000 * 60))),
                                messagesCount: closestSession.messages.filter((m: any) => !m.isLockedImage && !m.isGift).length,
                                mediaCount: closestSession.messages.filter((m: any) => m.isLockedImage).length,
                                giftCount: closestSession.messages.filter((m: any) => m.isGift).length,
                                totalEarnings: 0,
                                items: []
                            });
                        }

                        const sObj = sessionsMap.get(sessionKey);
                        sObj.totalEarnings += (tx.amount || 0);
                        sObj.items.push(txItem);

                        if (new Date(txItem.timestamp) < new Date(sObj.startTime)) sObj.startTime = txItem.timestamp;
                        if (new Date(txItem.timestamp) > new Date(sObj.endTime)) sObj.endTime = txItem.timestamp;
                        sObj.durationMinutes = Math.max(1, Math.round((new Date(sObj.endTime).getTime() - new Date(sObj.startTime).getTime()) / (1000 * 60)));

                    } else {
                        standaloneItems.push(txItem);
                    }
                });
            }
        });

        const enrichedSessions = Array.from(sessionsMap.values()).filter(s => s.totalEarnings > 0);
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
