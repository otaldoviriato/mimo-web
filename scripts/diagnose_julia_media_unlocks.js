const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function diagnoseJuliaMediaUnlocks() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const messagesColl = db.collection('messages');

    const juliaClerkId = 'user_3EgoorTicbL6S03SoksdmCUTvL1';

    // 1. Buscar todas as microtransações da Julia do tipo image_unlock
    const imageTxs = await microTxsColl.find({
        userId: juliaClerkId,
        type: 'credit',
        source: 'image_unlock'
    }).sort({ timestamp: 1 }).toArray();

    const totalImageEarnings = imageTxs.reduce((s, t) => s + (t.amount || 0), 0);

    console.log(`=== INSPECIONANDO MÍDIAS DESBLOQUEADAS DA JULIA ACCIOLI ===`);
    console.log(`Total de transações de mídias desbloqueadas: ${imageTxs.length}`);
    console.log(`Faturamento total de mídias desbloqueadas: R$ ${(totalImageEarnings / 100).toFixed(2)}`);

    // Quantas têm messageId?
    const withMsgId = imageTxs.filter(t => t.messageId);
    console.log(`Com messageId preenchido: ${withMsgId.length}`);
    console.log(`Sem messageId preenchido: ${imageTxs.length - withMsgId.length}`);

    // Buscar mensagens nas salas da Julia
    const relatedUserIds = Array.from(new Set(imageTxs.map(t => t.relatedUserId).filter(Boolean)));
    const roomIds = relatedUserIds.map(cId => [juliaClerkId, cId].sort().join('_'));

    const roomMsgs = await messagesColl.find({ roomId: { $in: roomIds } }).sort({ timestamp: 1 }).toArray();
    console.log(`Total de mensagens registradas nessas salas: ${roomMsgs.length}`);

    // Vamos inspecionar por cliente por que as mídias trancadas não estavam associando!
    const clientSummary = {};

    for (const tx of imageTxs) {
        const cId = tx.relatedUserId || 'desconhecido';
        const rId = [juliaClerkId, cId].sort().join('_');
        const txTs = new Date(tx.timestamp || tx.createdAt);

        if (!clientSummary[cId]) {
            clientSummary[cId] = {
                clientClerkId: cId,
                totalTxs: 0,
                totalAmount: 0,
                matchedWithSession: 0,
                unmatchedAmount: 0
            };
        }
        clientSummary[cId].totalTxs++;
        clientSummary[cId].totalAmount += (tx.amount || 0);

        // Buscar mensagens da sala desse cliente
        const msgsInRoom = roomMsgs.filter(m => (m.roomId === rId || (!m.roomId && (m.senderId === cId || m.receiverId === cId))));
        const creatorMsgs = msgsInRoom.filter(m => m.senderId === juliaClerkId);

        // Verificar se a sala teve conversa entre Julia e o Cliente
        const hasConversation = creatorMsgs.length > 0 && msgsInRoom.length >= 2;

        // Imprimir detalhes da transação de mídia e das mensagens da sala
        if (clientSummary[cId].totalTxs <= 3) {
            console.log(`\n------------------------------------------------`);
            console.log(`Cliente: ${cId}`);
            console.log(`Transação Mídia Desbloqueada: R$ ${(tx.amount / 100).toFixed(2)} às ${txTs.toISOString()}`);
            console.log(`Mensagens totais na sala desse cliente: ${msgsInRoom.length} (Mensagens da Julia: ${creatorMsgs.length})`);
            if (msgsInRoom.length > 0) {
                console.log(`Primeira msg da sala: ${new Date(msgsInRoom[0].timestamp || msgsInRoom[0].createdAt).toISOString()}`);
                console.log(`Última msg da sala:    ${new Date(msgsInRoom[msgsInRoom.length - 1].timestamp || msgsInRoom[msgsInRoom.length - 1].createdAt).toISOString()}`);
            }
        }
    }

    console.log('\n=== FIM DA INSPEÇÃO ===');
    await mongoose.disconnect();
}

diagnoseJuliaMediaUnlocks().catch(console.error);
