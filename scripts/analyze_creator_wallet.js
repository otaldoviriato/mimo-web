const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function analyzeCreatorWallet() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const usersColl = db.collection('users');
    const messagesColl = db.collection('messages');

    // Buscar profissionais com mais microtransações
    const topCreators = await microTxsColl.aggregate([
        { $match: { type: 'credit' } },
        { $group: { _id: '$userId', count: { $sum: 1 }, totalEarnings: { $sum: '$amount' } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]).toArray();

    console.log('=== TOP 5 CRIADORAS COM MAIS TRANSAÇÕES DE CRÉDITO EM PRODUÇÃO ===');
    for (const creator of topCreators) {
        const userObj = await usersColl.findOne({ clerkId: creator._id });
        console.log(`\nCriadora: ${userObj?.name || userObj?.username || creator._id}`);
        console.log(`ClerkId: ${creator._id}`);
        console.log(`Transações totais: ${creator.count} | Faturamento: R$ ${(creator.totalEarnings / 100).toFixed(2)}`);

        // Simular agrupamento de 30 min, 1h, 3h, 12h, 24h para esta criadora
        const clientTxs = await microTxsColl.find({ userId: creator._id, type: 'credit' }).toArray();
        const relatedUserIds = Array.from(new Set(clientTxs.map(t => t.relatedUserId).filter(Boolean)));
        const roomIds = relatedUserIds.map(cId => [creator._id, cId].sort().join('_'));

        const roomMsgs = await messagesColl.find({ roomId: { $in: roomIds } }).sort({ timestamp: 1 }).toArray();

        // Quantas mensagens essa criadora envia em comparação com os clientes nessa sala?
        const myMsgs = roomMsgs.filter(m => m.senderId === creator._id).length;
        const clientMsgs = roomMsgs.filter(m => m.senderId !== creator._id).length;
        console.log(`  --> Respostas enviadas pela Criadora nas salas: ${myMsgs}`);
        console.log(`  --> Mensagens enviadas pelos Clientes nas salas:  ${clientMsgs}`);

        const testTimeouts = [30, 60, 180, 720, 1440];
        for (const t of testTimeouts) {
            // Agrupar por sala
            const msgsByRoom = {};
            roomMsgs.forEach(m => {
                const rId = m.roomId || [m.senderId, m.receiverId].sort().join('_');
                if (!msgsByRoom[rId]) msgsByRoom[rId] = [];
                msgsByRoom[rId].push(m);
            });

            let twoWaySessions = 0;
            let singleWaySessions = 0;
            let twoWayEarnings = 0;
            let singleWayEarnings = 0;

            Object.keys(msgsByRoom).forEach(rId => {
                const msgs = msgsByRoom[rId].sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
                let curr = null;
                const sessions = [];

                msgs.forEach(m => {
                    const ts = new Date(m.timestamp || m.createdAt);
                    if (!curr) {
                        curr = { senders: new Set([m.senderId]), msgs: [m], endTs: ts };
                    } else {
                        const diffMin = (ts - curr.endTs) / (1000 * 60);
                        if (diffMin <= t) {
                            curr.endTs = ts;
                            curr.senders.add(m.senderId);
                            curr.msgs.push(m);
                        } else {
                            sessions.push(curr);
                            curr = { senders: new Set([m.senderId]), msgs: [m], endTs: ts };
                        }
                    }
                });
                if (curr) sessions.push(curr);

                sessions.forEach(s => {
                    const isTwoWay = s.senders.size >= 2;
                    let earnings = 0;
                    s.msgs.forEach(m => {
                        if (m.receiverId === creator._id) {
                            earnings += (m.receiverEarnings || m.cost || 0);
                        }
                    });

                    if (isTwoWay && earnings > 0) {
                        twoWaySessions++;
                        twoWayEarnings += earnings;
                    } else if (earnings > 0) {
                        singleWaySessions++;
                        singleWayEarnings += earnings;
                    }
                });
            });

            const label = t < 60 ? `${t}m` : `${t/60}h`;
            console.log(`  [Timeout: ${label.padEnd(4)}] -> Sessões (2 partes): ${twoWaySessions} (R$ ${(twoWayEarnings/100).toFixed(2)}) | Avulsas: ${singleWaySessions} itens (R$ ${(singleWayEarnings/100).toFixed(2)})`);
        }
    }

    await mongoose.disconnect();
}

analyzeCreatorWallet().catch(console.error);
