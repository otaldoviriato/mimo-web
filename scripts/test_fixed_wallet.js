const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function testFixedWallet() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const messagesColl = db.collection('messages');

    const juliaClerkId = 'user_3EgoorTicbL6S03SoksdmCUTvL1';

    const microTxs = await microTxsColl.find({ userId: juliaClerkId, type: 'credit' }).toArray();
    const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean)));

    const roomIds = relatedUserIds.map(cId => [juliaClerkId, cId].sort().join('_'));

    const roomMessages = await messagesColl.find({ roomId: { $in: roomIds } })
        .sort({ timestamp: 1 })
        .toArray();

    const rawEvents = roomMessages.map(msg => {
        const ts = new Date(msg.timestamp || msg.createdAt);
        const earnedAmount = msg.receiverId === juliaClerkId ? (msg.receiverEarnings || msg.cost || 0) : 0;
        const clientClerkId = msg.senderId === juliaClerkId ? msg.receiverId : msg.senderId;

        const isMine = msg.senderId === juliaClerkId;
        const description = msg.isGift
            ? (isMine ? 'Presente enviado' : 'Presente recebido')
            : msg.isLockedImage
            ? (isMine ? 'Mídia privada enviada' : 'Mídia privada desbloqueada')
            : (isMine ? 'Mensagem enviada' : 'Mensagem recebida');

        return {
            id: msg._id.toString(),
            relatedUserId: clientClerkId,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            roomId: msg.roomId,
            type: msg.isGift ? 'gift' : msg.isLockedImage ? 'image_unlock' : 'message',
            amount: earnedAmount,
            timestamp: ts,
            description
        };
    });

    function groupEvents(events, timeoutMinutes) {
        const eventsByRoom = {};
        events.forEach(e => {
            if (!eventsByRoom[e.roomId]) eventsByRoom[e.roomId] = [];
            eventsByRoom[e.roomId].push(e);
        });

        const allSessions = [];

        Object.keys(eventsByRoom).forEach(rId => {
            const roomEvts = eventsByRoom[rId].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            let current = null;

            roomEvts.forEach(evt => {
                if (!current) {
                    current = {
                        sessionId: `${rId}_${evt.timestamp.getTime()}`,
                        relatedUserId: evt.relatedUserId,
                        senders: new Set([evt.senderId]),
                        startTime: evt.timestamp,
                        endTime: evt.timestamp,
                        items: [evt],
                        totalEarnings: evt.amount
                    };
                } else {
                    const diffMin = (evt.timestamp.getTime() - current.endTime.getTime()) / (1000 * 60);
                    if (diffMin <= timeoutMinutes) {
                        current.endTime = evt.timestamp;
                        current.senders.add(evt.senderId);
                        current.items.push(evt);
                        current.totalEarnings += evt.amount;
                    } else {
                        current.isTwoWaySession = current.senders.size >= 2;
                        current.durationMinutes = Math.max(1, Math.round((current.endTime.getTime() - current.startTime.getTime()) / (1000 * 60)));
                        allSessions.push(current);

                        current = {
                            sessionId: `${rId}_${evt.timestamp.getTime()}`,
                            relatedUserId: evt.relatedUserId,
                            senders: new Set([evt.senderId]),
                            startTime: evt.timestamp,
                            endTime: evt.timestamp,
                            items: [evt],
                            totalEarnings: evt.amount
                        };
                    }
                }
            });

            if (current) {
                current.isTwoWaySession = current.senders.size >= 2;
                current.durationMinutes = Math.max(1, Math.round((current.endTime.getTime() - current.startTime.getTime()) / (1000 * 60)));
                allSessions.push(current);
            }
        });

        return allSessions;
    }

    const sessions = groupEvents(rawEvents, 180);
    const twoWaySessions = sessions.filter(s => s.isTwoWaySession && s.items.length >= 2 && s.totalEarnings > 0);
    const singleWaySessions = sessions.filter(s => !s.isTwoWaySession || s.items.length < 2 || !twoWaySessions.includes(s));

    console.log(`\n=== ANÁLISE DE SESSÕES DA JULIA (180 min) ===`);
    console.log(`Sessões Bi-direcionais Válidas: ${twoWaySessions.length}`);

    // Distribuição de valores das sessões
    const lowValueSessions = twoWaySessions.filter(s => s.totalEarnings < 100); // < R$ 1,00
    const midValueSessions = twoWaySessions.filter(s => s.totalEarnings >= 100 && s.totalEarnings < 500); // R$ 1,00 a R$ 5,00
    const highValueSessions = twoWaySessions.filter(s => s.totalEarnings >= 500); // >= R$ 5,00

    console.log(`Sessões com ganho < R$ 1,00: ${lowValueSessions.length} (Total: R$ ${(lowValueSessions.reduce((s,x)=>s+x.totalEarnings,0)/100).toFixed(2)})`);
    console.log(`Sessões com ganho R$ 1,00 a R$ 5,00: ${midValueSessions.length} (Total: R$ ${(midValueSessions.reduce((s,x)=>s+x.totalEarnings,0)/100).toFixed(2)})`);
    console.log(`Sessões com ganho >= R$ 5,00: ${highValueSessions.length} (Total: R$ ${(highValueSessions.reduce((s,x)=>s+x.totalEarnings,0)/100).toFixed(2)})`);

    await mongoose.disconnect();
}

testFixedWallet().catch(console.error);
