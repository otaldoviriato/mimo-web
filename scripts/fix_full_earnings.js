const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function fixFullEarnings() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const messagesColl = db.collection('messages');

    const juliaClerkId = 'user_3EgoorTicbL6S03SoksdmCUTvL1';

    // 1. Buscar 100% das microtransações de crédito da profissional (ISSO É A FONTE DA VERDADE DO DINHEIRO!)
    const microTxs = await microTxsColl.find({ userId: juliaClerkId, type: 'credit' }).sort({ timestamp: 1 }).toArray();

    let totalRealMoney = 0;
    microTxs.forEach(t => totalRealMoney += (t.amount || 0));

    console.log(`=== FONTE DA VERDADE DO DINHEIRO ===`);
    console.log(`Total de Microtransações: ${microTxs.length}`);
    console.log(`Faturamento Total REAL: R$ ${(totalRealMoney / 100).toFixed(2)}`);

    // 2. Buscar o histórico de mensagens das salas entre a criadora e os clientes para saber QUANDO e COM QUEM houve troca de mensagens!
    const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean)));
    const roomIds = relatedUserIds.map(cId => [juliaClerkId, cId].sort().join('_'));

    const roomMessages = await messagesColl.find({ roomId: { $in: roomIds } }).sort({ timestamp: 1 }).toArray();
    console.log(`Total de mensagens registradas nas salas: ${roomMessages.length}`);

    // Como associar cada MicroTransaction às Sessões de Conversa ou Mensagens Avulsas:
    // Para cada cliente (relatedUserId):
    // Pegamos todas as mensagens trocadas na sala entre Julia e aquele cliente.
    // Identificamos quais blocos (janelas de 30m, 1h, 3h) foram BI-DIRECIONAIS (ou seja, a Julia enviou pelo menos 1 mensagem no bloco E o cliente enviou pelo menos 1 mensagem no bloco).
    // Cada bloco bi-direcional tem um startTime e endTime (janela temporal).
    // Se a MicroTransaction do cliente ocorreu DENTRO do horário de uma Sessão Bi-direcional daquele cliente (ou até X min antes/depois do desbloqueio da foto/vídeo):
    // Ela PERTENCE a essa Sessão de Conversa!
    // Se a MicroTransaction ocorreu fora de qualquer janela de sessão bi-direcional:
    // Ela é uma Mensagem/Mídia Avulsa!

    function analyzeWithTimeouts(timeoutMinutes) {
        const eventsByRoom = {};
        roomMessages.forEach(m => {
            const rId = m.roomId || [m.senderId, m.receiverId].sort().join('_');
            if (!eventsByRoom[rId]) eventsByRoom[rId] = [];
            eventsByRoom[rId].push(m);
        });

        // 1. Encontrar todas as janelas temporais de Sessões Bi-direcionais por sala
        const twoWayWindowsByRoom = {}; // rId -> list of { startTime, endTime, clientClerkId }

        Object.keys(eventsByRoom).forEach(rId => {
            const msgs = eventsByRoom[rId].sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
            let current = null;
            const sessions = [];

            msgs.forEach(m => {
                const ts = new Date(m.timestamp || m.createdAt);
                if (!current) {
                    current = { senders: new Set([m.senderId]), startTime: ts, endTime: ts, msgs: [m] };
                } else {
                    const diffMin = (ts - current.endTime) / (1000 * 60);
                    if (diffMin <= timeoutMinutes) {
                        current.endTime = ts;
                        current.senders.add(m.senderId);
                        current.msgs.push(m);
                    } else {
                        sessions.push(current);
                        current = { senders: new Set([m.senderId]), startTime: ts, endTime: ts, msgs: [m] };
                    }
                }
            });
            if (current) sessions.push(current);

            // Filtrar apenas as sessões onde senders.size >= 2 (bi-direcionais)
            const twoWayList = sessions.filter(s => s.senders.size >= 2);
            twoWayWindowsByRoom[rId] = twoWayList;
        });

        // 2. Agora, classificar CADA UMA das 909 MicroTransactions de crédito!
        let totalSessionsEarnings = 0;
        let totalStandaloneEarnings = 0;
        let matchedTxsCount = 0;
        let standaloneTxsCount = 0;

        const sessionsResultMap = new Map(); // sessionKey -> { totalAmount, txsCount, clientClerkId, startTime, endTime }

        microTxs.forEach(tx => {
            const txTs = new Date(tx.timestamp || tx.createdAt);
            const clientClerkId = tx.relatedUserId;
            const rId = [juliaClerkId, clientClerkId].sort().join('_');

            const windows = twoWayWindowsByRoom[rId] || [];
            // Verificar se a transação caiu dentro de uma janela de conversa bi-direcional (com margem de 15 min para desbloqueios)
            const matchedWindow = windows.find(w => {
                const marginMs = 15 * 60 * 1000;
                return txTs.getTime() >= (w.startTime.getTime() - marginMs) && txTs.getTime() <= (w.endTime.getTime() + marginMs);
            });

            if (matchedWindow) {
                totalSessionsEarnings += (tx.amount || 0);
                matchedTxsCount++;
                const key = `${rId}_${matchedWindow.startTime.getTime()}`;
                if (!sessionsResultMap.has(key)) {
                    sessionsResultMap.set(key, {
                        sessionId: key,
                        relatedUserId: clientClerkId,
                        startTime: matchedWindow.startTime,
                        endTime: matchedWindow.endTime,
                        totalEarnings: 0,
                        txsCount: 0
                    });
                }
                const sObj = sessionsResultMap.get(key);
                sObj.totalEarnings += (tx.amount || 0);
                sObj.txsCount += 1;
            } else {
                totalStandaloneEarnings += (tx.amount || 0);
                standaloneTxsCount++;
            }
        });

        const sum = totalSessionsEarnings + totalStandaloneEarnings;
        const pctSessions = ((totalSessionsEarnings / sum) * 100).toFixed(1);
        const pctStandalone = ((totalStandaloneEarnings / sum) * 100).toFixed(1);

        console.log(`\n-- TIMEOUT: ${timeoutMinutes < 60 ? `${timeoutMinutes} min` : `${timeoutMinutes/60}h`} --`);
        console.log(`  Sessões Bi-direcionais formadas com faturamento: ${sessionsResultMap.size}`);
        console.log(`  💬 Total em Sessões:   R$ ${(totalSessionsEarnings/100).toFixed(2)} (${pctSessions}%) | ${matchedTxsCount} txs`);
        console.log(`  📌 Total em Avulsas:   R$ ${(totalStandaloneEarnings/100).toFixed(2)} (${pctStandalone}%) | ${standaloneTxsCount} txs`);
        console.log(`  ==============================================`);
        console.log(`  SOMA TOTAL EXPLICADA: R$ ${(sum/100).toFixed(2)} (BATE 100% COM O VALOR DE R$ ${(totalRealMoney/100).toFixed(2)})`);
    }

    analyzeWithTimeouts(30);
    analyzeWithTimeouts(60);
    analyzeWithTimeouts(120);
    analyzeWithTimeouts(180);

    await mongoose.disconnect();
}

fixFullEarnings().catch(console.error);
