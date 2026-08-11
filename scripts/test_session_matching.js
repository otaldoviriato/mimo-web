const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function testSessionMatching() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const microTxsColl = db.collection('microtransactions');
    const messagesColl = db.collection('messages');

    const juliaClerkId = 'user_3EgoorTicbL6S03SoksdmCUTvL1';

    const microTxs = await microTxsColl.find({ userId: juliaClerkId, type: 'credit' }).sort({ timestamp: 1 }).toArray();
    const totalMoney = microTxs.reduce((s, t) => s + (t.amount || 0), 0);

    const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean)));
    const roomIds = relatedUserIds.map(cId => [juliaClerkId, cId].sort().join('_'));

    const roomMessages = await messagesColl.find({ roomId: { $in: roomIds } }).sort({ timestamp: 1 }).toArray();

    // Regra A: Janela de Inatividade com margem de 12 horas ou 24 horas para desbloqueios de mídia no mesmo dia da conversa
    // Regra B: Se o cliente e a criadora já possuem conversa bi-direcional naquela sala no mesmo dia (mesmo ciclo de 24h), o desbloqueio de mídia pertence à Sessão de Conversa daquele dia!

    console.log(`=== TESTANDO REGRAS DE ASSOCIAÇÃO PARA JULIA ACCIOLI ===`);
    console.log(`Faturamento Total REAL: R$ ${(totalMoney / 100).toFixed(2)}`);

    // Testar Regra B: Agrupar eventos de cada cliente por DIA (ou janela estendida para mídias)
    // Se no mesmo dia (ou janela de 12h) houve troca de mensagens bi-direcional entre a criadora e aquele cliente, o faturamento daquele dia (mensagens + mídias desbloqueadas + presentes) pertence à Sessão daquele dia!

    function analyzeByDailySessions() {
        const txsByClientAndDay = {};

        microTxs.forEach(tx => {
            const date = new Date(tx.timestamp || tx.createdAt);
            const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const key = `${tx.relatedUserId}_${dayKey}`;

            if (!txsByClientAndDay[key]) {
                txsByClientAndDay[key] = {
                    clientClerkId: tx.relatedUserId,
                    dayKey,
                    txs: [],
                    amount: 0
                };
            }
            txsByClientAndDay[key].txs.push(tx);
            txsByClientAndDay[key].amount += (tx.amount || 0);
        });

        // Verificar para cada grupo dia/cliente se a criadora enviou pelo menos 1 mensagem no mesmo dia ou num raio de 24h
        let sessionTotal = 0;
        let standaloneTotal = 0;
        let sessionCount = 0;

        Object.keys(txsByClientAndDay).forEach(key => {
            const group = txsByClientAndDay[key];
            const rId = [juliaClerkId, group.clientClerkId].sort().join('_');

            // Mensagens na sala naquele dia ou próximo
            const dayMsgs = roomMessages.filter(m => {
                if (m.roomId !== rId) return false;
                const mDate = new Date(m.timestamp || m.createdAt).toISOString().split('T')[0];
                return mDate === group.dayKey;
            });

            const senders = new Set(dayMsgs.map(m => m.senderId));
            const hasCreatorReply = senders.has(juliaClerkId);

            if (hasCreatorReply && dayMsgs.length >= 2) {
                sessionTotal += group.amount;
                sessionCount++;
            } else {
                standaloneTotal += group.amount;
            }
        });

        const pctS = ((sessionTotal / totalMoney) * 100).toFixed(1);
        const pctA = ((standaloneTotal / totalMoney) * 100).toFixed(1);

        console.log(`\n-- REGRA: SESSÃO DIÁRIA / BLOCO DE CONVERSA POR CICLO DE CONVERSA --`);
        console.log(`  Sessões de Conversa Formadas: ${sessionCount}`);
        console.log(`  💬 Total em Sessões: R$ ${(sessionTotal/100).toFixed(2)} (${pctS}%)`);
        console.log(`  📌 Total em Avulsas: R$ ${(standaloneTotal/100).toFixed(2)} (${pctA}%)`);
    }

    analyzeByDailySessions();

    await mongoose.disconnect();
}

testSessionMatching().catch(console.error);
