const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function testPerfectMediaMatching() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const messagesColl = db.collection('messages');

    const juliaClerkId = 'user_3EgoorTicbL6S03SoksdmCUTvL1';

    const microTxs = await microTxsColl.find({ userId: juliaClerkId, type: 'credit' }).sort({ timestamp: 1 }).toArray();
    const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean)));
    const roomIds = relatedUserIds.map(cId => [juliaClerkId, cId].sort().join('_'));

    const roomMessages = await messagesColl.find({ roomId: { $in: roomIds } }).sort({ timestamp: 1 }).toArray();

    // Regra Perfeita de Associação de Mídias e Desbloqueios com a Sala:
    // Para cada sala (roomId):
    // 1. Identificar todas as Sessões Bi-direcionais VÁLIDAS daquela sala (conversas com >= 2 msgs entre criadora e cliente).
    // 2. Para cada transação de crédito daquele cliente (seja mensagem de texto, unlocking de foto/vídeo ou presente):
    //    Se a sala possui Sessões Bi-direcionais de Conversa:
    //    Encontrar a Sessão Bi-direcional mais próxima no tempo daquela sala (ou se a foto/vídeo foi enviada durante a sessão, ou se a conversa ocorreu no mesmo dia/ciclo).
    //    Se a criadora atua ativamente naquela sala com o cliente, a transação PERTENCE à Sessão de Conversa daquele cliente!
    //    Se a sala NUNCA teve resposta da criadora (0 respostas da criadora), a transação é Avulsa!

    let totalSessionsEarnings = 0;
    let totalStandaloneEarnings = 0;
    let sessionsCount = 0;
    let standaloneCount = 0;

    // Agrupar microtransações por sala
    const txsByRoom = {};
    microTxs.forEach(tx => {
        const rId = [juliaClerkId, tx.relatedUserId].sort().join('_');
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

    Object.keys(txsByRoom).forEach(rId => {
        const txs = txsByRoom[rId];
        const msgs = msgsByRoom[rId] || [];

        // Respostas da criadora na sala
        const creatorMsgs = msgs.filter(m => m.senderId === juliaClerkId);

        if (creatorMsgs.length === 0) {
            // Criadora nunca respondeu na sala -> 100% das transações dessa sala são Avulsas
            txs.forEach(t => {
                totalStandaloneEarnings += (t.amount || 0);
                standaloneCount++;
            });
        } else {
            // Criadora conversou na sala!
            // Agrupar as mensagens da sala em Sessões Bi-direcionais (janela de inatividade de 180 min)
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

            // Mapear cada transação de crédito (mensagem, mídia privada ou presente) para a sessão válida daquela sala
            txs.forEach(tx => {
                const txTs = new Date(tx.timestamp || tx.createdAt).getTime();

                if (validSessions.length === 0) {
                    totalStandaloneEarnings += (tx.amount || 0);
                    standaloneCount++;
                    return;
                }

                // Se houver sessões na sala, encontrar a sessão mais próxima temporalmente
                // Uma foto/vídeo ou presente enviado/desbloqueado em uma sala ativa com conversa pertence à sessão mais próxima daquela sala
                let closestSession = null;
                let minDiffMs = Infinity;

                validSessions.forEach(s => {
                    // Distância do timestamp da transação à janela da sessão [startTime, endTime]
                    let diffMs = 0;
                    if (txTs < s.startTime.getTime()) diffMs = s.startTime.getTime() - txTs;
                    else if (txTs > s.endTime.getTime()) diffMs = txTs - s.endTime.getTime();

                    if (diffMs < minDiffMs) {
                        minDiffMs = diffMs;
                        closestSession = s;
                    }
                });

                // Se a transação ocorreu em até 24 horas da conversa mais próxima daquela sala, ela PERTENCE a essa Sessão de Conversa!
                if (closestSession && minDiffMs <= 24 * 60 * 60 * 1000) {
                    totalSessionsEarnings += (tx.amount || 0);
                    sessionsCount++;
                } else {
                    totalStandaloneEarnings += (tx.amount || 0);
                    standaloneCount++;
                }
            });
        }
    });

    const sum = totalSessionsEarnings + totalStandaloneEarnings;
    const pctS = ((totalSessionsEarnings / sum) * 100).toFixed(1);
    const pctA = ((totalStandaloneEarnings / sum) * 100).toFixed(1);

    console.log(`=== RESULTADO DO MOTOR PERFEITO DE ASSOCIAÇÃO DE MÍDIAS ===`);
    console.log(`Faturamento Total REAL: R$ ${(sum / 100).toFixed(2)}`);
    console.log(`💬 Total em Sessões de Conversa: R$ ${(totalSessionsEarnings / 100).toFixed(2)} (${pctS}%) | ${sessionsCount} txs`);
    console.log(`📌 Total em Mensagens Avulsas:   R$ ${(totalStandaloneEarnings / 100).toFixed(2)} (${pctA}%) | ${standaloneCount} txs`);

    await mongoose.disconnect();
}

testPerfectMediaMatching().catch(console.error);
