const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function diagnoseMediaAndSessions() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const messagesColl = db.collection('messages');

    const juliaClerkId = 'user_3EgoorTicbL6S03SoksdmCUTvL1';

    const microTxs = await microTxsColl.find({ userId: juliaClerkId, type: 'credit' }).sort({ timestamp: 1 }).toArray();
    const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean)));
    const roomIds = relatedUserIds.map(cId => [juliaClerkId, cId].sort().join('_'));

    const roomMessages = await messagesColl.find({ roomId: { $in: roomIds } }).sort({ timestamp: 1 }).toArray();

    console.log(`=== ANÁLISE COMPLETA DE MÍDIAS E SESSÕES (JULIA ACCIOLI) ===`);
    console.log(`Total de microtransações: ${microTxs.length}`);
    console.log(`Total de mensagens registradas nas salas: ${roomMessages.length}`);

    // Mapear cada mensagem da sala por ID e por timestamp
    const msgById = new Map();
    roomMessages.forEach(m => msgById.set(m._id.toString(), m));

    // 1. INVESTIGAÇÃO DO PROBLEMA 1: MOMENTO DO ENVIO DA MÍDIA VS MOMENTO DO DESBLOQUEIO
    let imageUnlocksCount = 0;
    let imageUnlocksMatchedToSentTime = 0;

    microTxs.forEach(tx => {
        if (tx.source === 'image_unlock' || tx.source === 'gift') {
            imageUnlocksCount++;
            const txTs = new Date(tx.timestamp || tx.createdAt);

            // Tentar localizar a mensagem original associada
            let origMsg = null;
            if (tx.messageId) origMsg = msgById.get(tx.messageId.toString());

            if (!origMsg) {
                // Tentar encontrar mensagem de mídia enviada na mesma sala perto do horário
                const rId = [juliaClerkId, tx.relatedUserId].sort().join('_');
                const roomMsgs = roomMessages.filter(m => (m.roomId === rId || (!m.roomId && (m.senderId === tx.relatedUserId || m.receiverId === tx.relatedUserId))));
                // Encontrar a mensagem de mídia que foi enviada antes ou no mesmo momento do desbloqueio
                origMsg = roomMsgs.slice().reverse().find(m => {
                    const mTs = new Date(m.timestamp || m.createdAt);
                    return (m.isLockedImage || m.isGift) && mTs <= txTs;
                });
            }

            if (origMsg) {
                imageUnlocksMatchedToSentTime++;
            }
        }
    });

    console.log(`\n--- PROBLEMA 1: MÍDIAS DESBLOQUEADAS E PRESENTES ---`);
    console.log(`Total de transações de mídia/presente: ${imageUnlocksCount}`);
    console.log(`Mídias associadas ao momento do envio original na conversa: ${imageUnlocksMatchedToSentTime}`);

    // 2. INVESTIGAÇÃO DO PROBLEMA 2: SESSÕES COM APENAS 1 MENSAGEM OU 1 MINUTO DE DURAÇÃO
    // Vamos simular o agrupador de mensagens das salas usando a data de envio original das mensagens de mídia!

    // Montar todos os eventos da sala usandos a data ORIGINAL de envio da mensagem!
    const roomEvents = roomMessages.map(m => {
        const mTs = new Date(m.timestamp || m.createdAt);
        return {
            id: m._id.toString(),
            roomId: m.roomId || [m.senderId, m.receiverId].sort().join('_'),
            senderId: m.senderId,
            receiverId: m.receiverId,
            timestamp: mTs,
            cost: m.cost || 0,
            receiverEarnings: m.receiverEarnings || 0,
            isLockedImage: !!m.isLockedImage,
            isGift: !!m.isGift
        };
    });

    // Mapear também o valor faturado da microtransação para o momento de envio da mensagem original
    // Para cada microtransação, encontrar o timestamp do ENVIO ORIGINAL da mensagem
    const txByMsgId = new Map();
    microTxs.forEach(tx => {
        if (tx.messageId) txByMsgId.set(tx.messageId.toString(), tx.amount || 0);
    });

    // Agrupar por sala e por janela de inatividade (30m, 60m, 180m)
    function testGrouping(timeoutMin) {
        let twoWaySessionsCount = 0;
        let singleMessageSessionsCount = 0;
        let oneMinuteSessionsCount = 0;
        let totalSessionsEarnings = 0;
        let totalStandaloneEarnings = 0;

        const eventsByRoom = {};
        roomEvents.forEach(e => {
            if (!eventsByRoom[e.roomId]) eventsByRoom[e.roomId] = [];
            eventsByRoom[e.roomId].push(e);
        });

        Object.keys(eventsByRoom).forEach(rId => {
            const msgs = eventsByRoom[rId].sort((a, b) => a.timestamp - b.timestamp);
            let current = null;
            const sessions = [];

            msgs.forEach(m => {
                if (!current) {
                    current = { senders: new Set([m.senderId]), startTime: m.timestamp, endTime: m.timestamp, items: [m] };
                } else {
                    const diffMin = (m.timestamp - current.endTime) / (1000 * 60);
                    if (diffMin <= timeoutMin) {
                        current.endTime = m.timestamp;
                        current.senders.add(m.senderId);
                        current.items.push(m);
                    } else {
                        sessions.push(current);
                        current = { senders: new Set([m.senderId]), startTime: m.timestamp, endTime: m.timestamp, items: [m] };
                    }
                }
            });
            if (current) sessions.push(current);

            sessions.forEach(s => {
                const isTwoWay = s.senders.size >= 2;
                const totalMsgsCount = s.items.length;
                const durationMin = Math.round((s.endTime - s.startTime) / (1000 * 60));

                // Calcular o dinheiro acumulado nessa sessão através do faturamento das mensagens/mídias contidas nela
                let sEarnings = 0;
                s.items.forEach(item => {
                    const earned = txByMsgId.get(item.id) || (item.receiverId === juliaClerkId ? (item.receiverEarnings || item.cost || 0) : 0);
                    sEarnings += earned;
                });

                // REGRA RÍGIDA DE SESSÃO: Uma Sessão de Conversa EXIGE senders.size >= 2 AND totalMsgsCount >= 2 AND sEarnings > 0!
                if (isTwoWay && totalMsgsCount >= 2 && sEarnings > 0) {
                    twoWaySessionsCount++;
                    totalSessionsEarnings += sEarnings;
                    if (durationMin <= 1) oneMinuteSessionsCount++;
                } else {
                    if (totalMsgsCount === 1) singleMessageSessionsCount++;
                    totalStandaloneEarnings += sEarnings;
                }
            });
        });

        // Adicionar também o faturamento de microtransações de presentes/mídias sem mensagem direta nas salas
        const totalRealMoney = microTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
        const sum = totalSessionsEarnings + totalStandaloneEarnings;

        console.log(`\n-- TESTE COM TIMEOUT DE ${timeoutMin} MINUTOS --`);
        console.log(`  Sessões Bi-direcionais Válidas (>= 2 mensagens de remetentes diferentes): ${twoWaySessionsCount}`);
        console.log(`  Sessões com apenas 1 mensagem descartadas de Sessões (corretamente como avulsas): ${singleMessageSessionsCount}`);
        console.log(`  Sessões de 1 min com troca rápida de mensagens: ${oneMinuteSessionsCount}`);
        console.log(`  💬 Faturamento em Sessões de Conversa: R$ ${(totalSessionsEarnings/100).toFixed(2)} (${((totalSessionsEarnings/sum)*100).toFixed(1)}%)`);
        console.log(`  📌 Faturamento em Mensagens Avulsas:   R$ ${(totalStandaloneEarnings/100).toFixed(2)} (${((totalStandaloneEarnings/sum)*100).toFixed(1)}%)`);
    }

    testGrouping(30);
    testGrouping(60);
    testGrouping(180);

    await mongoose.disconnect();
}

diagnoseMediaAndSessions().catch(console.error);
