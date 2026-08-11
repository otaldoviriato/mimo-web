const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function testAllCreatorsFix() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const messagesColl = db.collection('messages');
    const usersColl = db.collection('users');

    const topCreators = await microTxsColl.aggregate([
        { $match: { type: 'credit' } },
        { $group: { _id: '$userId', count: { $sum: 1 }, totalEarnings: { $sum: '$amount' } } },
        { $sort: { totalEarnings: -1 } },
        { $limit: 5 }
    ]).toArray();

    console.log('=== TESTANDO NOVO MOTOR PERFEITO DE MÍDIAS E SESSÕES NO TOP 5 ===\n');

    for (const creator of topCreators) {
        const clerkId = creator._id;
        const userObj = await usersColl.findOne({ clerkId });
        const name = userObj?.name || userObj?.username || clerkId;

        const microTxs = await microTxsColl.find({ userId: clerkId, type: 'credit' }).sort({ timestamp: 1 }).toArray();
        const totalRealMoney = microTxs.reduce((s, t) => s + (t.amount || 0), 0);

        const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean)));
        const roomIds = relatedUserIds.map(cId => [clerkId, cId].sort().join('_'));

        const roomMessages = await messagesColl.find({ roomId: { $in: roomIds } }).sort({ timestamp: 1 }).toArray();

        // Agrupar microtransações por sala
        const txsByRoom = {};
        microTxs.forEach(tx => {
            const rId = [clerkId, tx.relatedUserId].sort().join('_');
            if (!txsByRoom[rId]) txsByRoom[rId] = [];
            txsByRoom[rId].push(tx);
        });

        // Agrupar mensagens por sala
        const msgsByRoom = {};
        roomMessages.forEach(m => {
            const rId = m.roomId || [m.senderId, m.receiverId].sort().join('_');
            if (!msgsByRoom[rId]) msgsByRoom[rId] = [];
            msgsByRoom[rId].push(m);
        });

        let totalSessionsEarnings = 0;
        let totalStandaloneEarnings = 0;

        Object.keys(txsByRoom).forEach(rId => {
            const txs = txsByRoom[rId];
            const msgs = msgsByRoom[rId] || [];

            const creatorMsgs = msgs.filter(m => m.senderId === clerkId);

            if (creatorMsgs.length === 0) {
                // Criadora nunca respondeu nada nessa sala -> Avulsas
                txs.forEach(t => totalStandaloneEarnings += (t.amount || 0));
            } else {
                // Mapear sessões válidas na sala (timeout 180 min, >= 2 msgs e senders.size >= 2)
                const sortedMsgs = msgs.slice().sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
                let current = null;
                const validSessions = [];

                sortedMsgs.forEach(m => {
                    const ts = new Date(m.timestamp || m.createdAt);
                    if (!current) {
                        current = { senders: new Set([m.senderId]), startTime: ts, endTime: ts, msgs: [m] };
                    } else {
                        const diffMin = (ts - current.endTime) / (1000 * 60);
                        if (diffMin <= 180) {
                            current.endTime = ts;
                            current.senders.add(m.senderId);
                            current.msgs.push(m);
                        } else {
                            if (current.senders.size >= 2 && current.msgs.length >= 2) validSessions.push(current);
                            current = { senders: new Set([m.senderId]), startTime: ts, endTime: ts, msgs: [m] };
                        }
                    }
                });
                if (current && current.senders.size >= 2 && current.msgs.length >= 2) validSessions.push(current);

                // Atribuir cada transação à sessão mais próxima daquela sala
                txs.forEach(tx => {
                    const txTs = new Date(tx.timestamp || tx.createdAt).getTime();

                    if (validSessions.length === 0) {
                        totalStandaloneEarnings += (tx.amount || 0);
                        return;
                    }

                    let closestSession = null;
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

                    // Janela flexível para desbloqueios de mídia no mesmo ciclo de conversa daquela sala
                    if (closestSession && minDiffMs <= 24 * 60 * 60 * 1000) {
                        totalSessionsEarnings += (tx.amount || 0);
                    } else {
                        totalStandaloneEarnings += (tx.amount || 0);
                    }
                });
            }
        });

        const sum = totalSessionsEarnings + totalStandaloneEarnings;
        const pctS = ((totalSessionsEarnings / sum) * 100).toFixed(1);
        const pctA = ((totalStandaloneEarnings / sum) * 100).toFixed(1);

        console.log(`Criadora: ${name}`);
        console.log(`  Faturamento REAL: R$ ${(totalRealMoney / 100).toFixed(2)}`);
        console.log(`  💬 Sessões de Conversa: R$ ${(totalSessionsEarnings / 100).toFixed(2)} (${pctS}%)`);
        console.log(`  📌 Mensagens Avulsas:   R$ ${(totalStandaloneEarnings / 100).toFixed(2)} (${pctA}%)`);
        console.log(`  SOMA (100% Explicado): R$ ${(sum / 100).toFixed(2)}\n`);
    }

    await mongoose.disconnect();
}

testAllCreatorsFix().catch(console.error);
