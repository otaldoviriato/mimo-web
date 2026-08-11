const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function diagnoseJulia() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const messagesColl = db.collection('messages');

    const juliaClerkId = 'user_3EgoorTicbL6S03SoksdmCUTvL1';

    const allJuliaTxs = await microTxsColl.find({ userId: juliaClerkId, type: 'credit' }).toArray();
    console.log(`=== DIAGNÓSTICO DA CARTEIRA DA JULIA ACCIOLI ===`);
    console.log(`Total de microtransações de crédito: ${allJuliaTxs.length}`);
    
    let totalAmt = 0;
    const sourceBreakdown = {};

    allJuliaTxs.forEach(tx => {
        totalAmt += (tx.amount || 0);
        const src = tx.source || 'desconhecido';
        if (!sourceBreakdown[src]) sourceBreakdown[src] = { count: 0, amount: 0 };
        sourceBreakdown[src].count++;
        sourceBreakdown[src].amount += (tx.amount || 0);
    });

    console.log(`Faturamento Total Registrado nas Microtransações: R$ ${(totalAmt / 100).toFixed(2)}`);
    console.log('\n--- DETALHAMENTO POR FONTE (SOURCE) ---');
    Object.keys(sourceBreakdown).forEach(src => {
        const item = sourceBreakdown[src];
        console.log(`  Source "${src.padEnd(15)}": ${item.count.toString().padStart(4)} txs | R$ ${(item.amount / 100).toFixed(2).padStart(8)} (${((item.amount / totalAmt) * 100).toFixed(1)}%)`);
    });

    // Quantas microtransações têm messageId vs sem messageId?
    const txsWithMsgId = allJuliaTxs.filter(t => t.messageId);
    const txsWithoutMsgId = allJuliaTxs.filter(t => !t.messageId);

    console.log(`\nMicrotransações COM messageId: ${txsWithMsgId.length} (R$ ${(txsWithMsgId.reduce((s,t)=>s+(t.amount||0),0)/100).toFixed(2)})`);
    console.log(`Microtransações SEM messageId: ${txsWithoutMsgId.length} (R$ ${(txsWithoutMsgId.reduce((s,t)=>s+(t.amount||0),0)/100).toFixed(2)})`);

    // Para as microtransações COM messageId, vamos verificar se a mensagem existe no banco de dados e qual seu senderId/isLockedImage!
    let matchedMsgs = 0;
    let unmatchedMsgs = 0;
    let imageUnlockAmount = 0;
    let giftAmount = 0;
    let textMessageAmount = 0;

    let inTwoWaySessionAmount = 0;
    let inSingleWayAmount = 0;

    for (const tx of allJuliaTxs) {
        if (tx.messageId) {
            const msg = await messagesColl.findOne({ _id: new mongoose.Types.ObjectId(tx.messageId.toString()) }) || await messagesColl.findOne({ _id: tx.messageId.toString() });
            if (msg) {
                matchedMsgs++;
                if (msg.isLockedImage) imageUnlockAmount += (tx.amount || 0);
                else if (msg.isGift) giftAmount += (tx.amount || 0);
                else textMessageAmount += (tx.amount || 0);
            } else {
                unmatchedMsgs++;
            }
        }
    }

    console.log(`\nMensagens encontradas na coleção 'messages': ${matchedMsgs}`);
    console.log(`Mensagens NÃO encontradas na coleção 'messages' (órfãs): ${unmatchedMsgs}`);
    console.log(`  --> Faturamento Mídias Privadas (Desbloqueio de Fotos/Vídeos): R$ ${(imageUnlockAmount / 100).toFixed(2)}`);
    console.log(`  --> Faturamento Presentes: R$ ${(giftAmount / 100).toFixed(2)}`);
    console.log(`  --> Faturamento Mensagens de Texto: R$ ${(textMessageAmount / 100).toFixed(2)}`);

    // Agora vamos inspecionar como a rota /api/users/me/wallet-sessions estava calculando para a Julia!
    // Na rota, nós buscávamos:
    // const roomMessages = await Message.find({ roomId: { $in: roomIds } });
    // E montávamos rawEvents!
    // Vamos simular a rota idêntica para ver exatamente o que a rota retornou!

    const relatedUserIds = Array.from(new Set(allJuliaTxs.map(t => t.relatedUserId).filter(Boolean)));
    const roomIds = relatedUserIds.map(cId => [juliaClerkId, cId].sort().join('_'));

    const roomMessages = await messagesColl.find({ roomId: { $in: roomIds } }).sort({ timestamp: 1 }).toArray();

    const creditAmountByMsgId = new Map();
    allJuliaTxs.forEach(tx => {
        if (tx.messageId) creditAmountByMsgId.set(tx.messageId.toString(), tx.amount || 0);
    });

    const rawEvents = roomMessages.map(msg => {
        const msgIdStr = msg._id.toString();
        const earnedAmount = creditAmountByMsgId.get(msgIdStr) ?? (msg.receiverId === juliaClerkId ? (msg.receiverEarnings || msg.cost || 0) : 0);
        const clientClerkId = msg.senderId === juliaClerkId ? msg.receiverId : msg.senderId;
        return {
            id: msgIdStr,
            relatedUserId: clientClerkId,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            roomId: msg.roomId,
            type: msg.isGift ? 'gift' : msg.isLockedImage ? 'image_unlock' : 'message',
            amount: earnedAmount,
            timestamp: new Date(msg.timestamp || msg.createdAt)
        };
    });

    // Adicionar transações sem messageId
    allJuliaTxs.filter(t => !t.messageId).forEach(tx => {
        rawEvents.push({
            id: tx._id.toString(),
            relatedUserId: tx.relatedUserId || 'desconhecido',
            senderId: tx.relatedUserId || 'cliente',
            receiverId: juliaClerkId,
            type: tx.source || 'other',
            amount: tx.amount || 0,
            timestamp: new Date(tx.timestamp || tx.createdAt)
        });
    });

    // Agrupar rawEvents em 180 min
    const { groupEventsIntoSessions } = require('../lib/sessionGrouping');
    const grouped = groupEventsIntoSessions(rawEvents, 180);

    let twoWaySum = 0;
    let singleWaySum = 0;

    grouped.forEach(s => {
        if (s.isTwoWaySession && s.items.length >= 2 && s.totalEarnings > 0) {
            twoWaySum += s.totalEarnings;
        } else {
            s.items.forEach(i => {
                if (i.amount > 0) singleWaySum += i.amount;
            });
        }
    });

    console.log(`\n=== RESULTADO DA SIMULAÇÃO DA ROTA PARA JULIA (180 min) ===`);
    console.log(`Sessões Bi-direcionais (2 partes): R$ ${(twoWaySum / 100).toFixed(2)} (${((twoWaySum / (twoWaySum + singleWaySum)) * 100).toFixed(1)}%)`);
    console.log(`Mensagens Avulsas (1 parte ou órfãs): R$ ${(singleWaySum / 100).toFixed(2)} (${((singleWaySum / (twoWaySum + singleWaySum)) * 100).toFixed(1)}%)`);

    await mongoose.disconnect();
}

diagnoseJulia().catch(console.error);
