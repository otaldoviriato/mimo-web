const mongoose = require('mongoose');

const BASE_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/?retryWrites=true&w=majority';

async function runAnalysis() {
    console.log('=== LISTANDO BANCOS DE DADOS NO CLUSTER ===');
    await mongoose.connect(BASE_URI);
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    console.log('Bancos de dados encontrados no cluster:', databases.map(d => d.name));

    // Para cada banco de dados no cluster, vamos checar mensagens e coleções!
    for (const dbInfo of databases) {
        if (['admin', 'local'].includes(dbInfo.name)) continue;

        const conn = mongoose.createConnection(`mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/${dbInfo.name}?retryWrites=true&w=majority`);
        await new Promise(r => conn.once('open', r));

        const db = conn.db;
        const collections = await db.listCollections().toArray();
        const collNames = collections.map(c => c.name);

        console.log(`\n--------------------------------------------------`);
        console.log(`BANCO: "${dbInfo.name}" | Tamanho: ${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Coleções:`, collNames);

        if (collNames.includes('messages')) {
            const msgsCount = await db.collection('messages').countDocuments();
            const txsCount = collNames.includes('microtransactions') ? await db.collection('microtransactions').countDocuments() : 0;
            const roomsCount = collNames.includes('rooms') ? await db.collection('rooms').countDocuments() : 0;
            console.log(`  --> Mensagens: ${msgsCount}`);
            console.log(`  --> Microtransações: ${txsCount}`);
            console.log(`  --> Salas (Rooms): ${roomsCount}`);

            if (msgsCount > 0) {
                console.log(`\n*** ANALISANDO BANCO "${dbInfo.name}" ***`);
                await analyzeTargetDb(db);
            }
        }
        await conn.close();
    }

    await mongoose.disconnect();
}

async function analyzeTargetDb(db) {
    const messagesColl = db.collection('messages');
    const allMessages = await messagesColl.find({})
        .project({ _id: 1, roomId: 1, senderId: 1, receiverId: 1, cost: 1, receiverEarnings: 1, isGift: 1, isLockedImage: 1, timestamp: 1, createdAt: 1 })
        .sort({ roomId: 1, timestamp: 1 })
        .toArray();

    console.log(`Total de mensagens carregadas: ${allMessages.length}`);

    const messagesByRoom = {};
    allMessages.forEach(msg => {
        let rId = msg.roomId;
        if (!rId && msg.senderId && msg.receiverId) {
            rId = [msg.senderId, msg.receiverId].sort().join('_');
        }
        if (!rId) rId = 'desconhecido';
        if (!messagesByRoom[rId]) messagesByRoom[rId] = [];
        messagesByRoom[rId].push({
            ...msg,
            ts: new Date(msg.timestamp || msg.createdAt)
        });
    });

    const roomIds = Object.keys(messagesByRoom);
    console.log(`Salas ativas no banco: ${roomIds.length}`);

    // 1. Análise dos Gaps de Tempo entre mensagens consecutivas
    const allGapsMinutes = [];
    const responseGapsMinutes = []; // Apenas quando há troca de remetente (User A -> User B)

    roomIds.forEach(rId => {
        const msgs = messagesByRoom[rId].sort((a, b) => a.ts.getTime() - b.ts.getTime());
        for (let i = 1; i < msgs.length; i++) {
            const prev = msgs[i - 1];
            const curr = msgs[i];
            const diffMin = (curr.ts.getTime() - prev.ts.getTime()) / (1000 * 60);

            if (diffMin >= 0) {
                allGapsMinutes.push(diffMin);
                if (prev.senderId && curr.senderId && prev.senderId !== curr.senderId) {
                    responseGapsMinutes.push(diffMin);
                }
            }
        }
    });

    allGapsMinutes.sort((a, b) => a - b);
    responseGapsMinutes.sort((a, b) => a - b);

    function getPercentile(arr, p) {
        if (arr.length === 0) return 0;
        const idx = Math.floor((p / 100) * arr.length);
        return arr[Math.min(idx, arr.length - 1)];
    }

    function formatMinutes(min) {
        if (min < 60) return `${min.toFixed(1)} min`;
        if (min < 1440) return `${(min / 60).toFixed(1)} horas`;
        return `${(min / 1440).toFixed(1)} dias`;
    }

    console.log('\n=== DISTRIBUIÇÃO E PERCENTIS DOS INTERVALOS ENTRE MENSAGENS ===');
    console.log(`Total de pares de mensagens consecutivas: ${allGapsMinutes.length}`);
    console.log(`P10 (10% mais rápidos): ${formatMinutes(getPercentile(allGapsMinutes, 10))}`);
    console.log(`P25 (Primeiro quartil): ${formatMinutes(getPercentile(allGapsMinutes, 25))}`);
    console.log(`P50 (MEDIANA): ${formatMinutes(getPercentile(allGapsMinutes, 50))}`);
    console.log(`P75 (Terceiro quartil): ${formatMinutes(getPercentile(allGapsMinutes, 75))}`);
    console.log(`P80: ${formatMinutes(getPercentile(allGapsMinutes, 80))}`);
    console.log(`P90: ${formatMinutes(getPercentile(allGapsMinutes, 90))}`);
    console.log(`P95: ${formatMinutes(getPercentile(allGapsMinutes, 95))}`);

    console.log('\n=== TEMPO DE RESPOSTA ENTRE RESPOSTAS DO CLIENTE E CRIADORA ===');
    console.log(`Total de respostas alternadas analisadas: ${responseGapsMinutes.length}`);
    console.log(`P25 da Resposta: ${formatMinutes(getPercentile(responseGapsMinutes, 25))}`);
    console.log(`P50 (MEDIANA da Resposta): ${formatMinutes(getPercentile(responseGapsMinutes, 50))}`);
    console.log(`P75 da Resposta: ${formatMinutes(getPercentile(responseGapsMinutes, 75))}`);
    console.log(`P90 da Resposta: ${formatMinutes(getPercentile(responseGapsMinutes, 90))}`);

    const thresholds = [15, 30, 60, 120, 180, 360, 720, 1440, 2880, 4320];
    console.log('\n=== PORCENTAGEM DE MENSAGENS QUE OCORREM DENTRO DE CADA LIMITE ===');
    thresholds.forEach(t => {
        const countAll = allGapsMinutes.filter(g => g <= t).length;
        const pctAll = ((countAll / (allGapsMinutes.length || 1)) * 100).toFixed(1);
        const countResp = responseGapsMinutes.filter(g => g <= t).length;
        const pctResp = ((countResp / (responseGapsMinutes.length || 1)) * 100).toFixed(1);
        const label = t < 60 ? `${t}m` : `${t/60}h`;
        console.log(`<= ${label.padEnd(5)}: ${pctAll.padStart(5)}% de todos os gaps | ${pctResp.padStart(5)}% das respostas trocadas`);
    });

    // 2. Simulação com Diferentes Limites e Regras
    console.log('\n=== SIMULAÇÃO DE ESTRUTURAÇÃO DE SESSÕES (DIFERENTES CORTES E REGRAS) ===');

    const testTimeouts = [30, 60, 120, 180, 360, 720, 1440, 2880];

    for (const timeoutMinutes of testTimeouts) {
        let totalSessions = 0;
        let twoWaySessionsCount = 0;
        let singleWaySessionsCount = 0;
        let totalPaidMsgs = 0;
        let paidMsgsInTwoWay = 0;
        let paidMsgsInSingleWay = 0;

        roomIds.forEach(rId => {
            const msgs = messagesByRoom[rId].sort((a, b) => a.ts.getTime() - b.ts.getTime());
            
            let currentSession = null;
            const roomSessions = [];

            for (const msg of msgs) {
                if (!currentSession) {
                    currentSession = {
                        senders: new Set([msg.senderId].filter(Boolean)),
                        msgs: [msg],
                        endTime: msg.ts
                    };
                } else {
                    const diffMin = (msg.ts.getTime() - currentSession.endTime.getTime()) / (1000 * 60);
                    if (diffMin <= timeoutMinutes) {
                        currentSession.endTime = msg.ts;
                        if (msg.senderId) currentSession.senders.add(msg.senderId);
                        currentSession.msgs.push(msg);
                    } else {
                        roomSessions.push(currentSession);
                        currentSession = {
                            senders: new Set([msg.senderId].filter(Boolean)),
                            msgs: [msg],
                            endTime: msg.ts
                        };
                    }
                }
            }
            if (currentSession) roomSessions.push(currentSession);

            roomSessions.forEach(s => {
                totalSessions++;
                const isTwoWay = s.senders.size >= 2;
                if (isTwoWay) {
                    twoWaySessionsCount++;
                } else {
                    singleWaySessionsCount++;
                }

                s.msgs.forEach(m => {
                    const isPaid = (m.cost && m.cost > 0) || (m.receiverEarnings && m.receiverEarnings > 0);
                    if (isPaid) {
                        totalPaidMsgs++;
                        if (isTwoWay) paidMsgsInTwoWay++;
                        else paidMsgsInSingleWay++;
                    }
                });
            });
        });

        const pctTwoWay = totalSessions > 0 ? ((twoWaySessionsCount / totalSessions) * 100).toFixed(1) : 0;
        const pctPaidTwoWay = totalPaidMsgs > 0 ? ((paidMsgsInTwoWay / totalPaidMsgs) * 100).toFixed(1) : 0;
        const pctPaidSingle = totalPaidMsgs > 0 ? ((paidMsgsInSingleWay / totalPaidMsgs) * 100).toFixed(1) : 0;

        const label = timeoutMinutes < 60 ? `${timeoutMinutes} min` : `${timeoutMinutes/60} horas`;
        console.log(`\n-- CORTE DE INATIVIDADE: ${label} --`);
        console.log(`  Sessões Totais: ${totalSessions}`);
        console.log(`  Sessões Bi-direcionais (2 partes): ${twoWaySessionsCount} (${pctTwoWay}%)`);
        console.log(`  Faturamento em Sessões de Conversa: ${paidMsgsInTwoWay} msgs (${pctPaidTwoWay}% do faturamento)`);
        console.log(`  Faturamento em Mensagens Avulsas:   ${paidMsgsInSingleWay} msgs (${pctPaidSingle}% do faturamento)`);
    }

    // 3. Investigação Específica do porquê de mensagens avulsas
    console.log('\n=== INVESTIGAÇÃO DETALHADA DAS SALAS ===');
    let singleMessageRooms = 0;
    let roomsWithOnlyOneSender = 0;

    roomIds.forEach(rId => {
        const msgs = messagesByRoom[rId];
        if (msgs.length === 1) singleMessageRooms++;
        const senders = new Set(msgs.map(m => m.senderId).filter(Boolean));
        if (senders.size <= 1) roomsWithOnlyOneSender++;
    });

    console.log(`Salas com apenas 1 mensagem no histórico inteiro: ${singleMessageRooms} de ${roomIds.length} (${((singleMessageRooms/roomIds.length)*100).toFixed(1)}%)`);
    console.log(`Salas onde SOMENTE 1 participante mandou mensagem no histórico inteiro: ${roomsWithOnlyOneSender} de ${roomIds.length} (${((roomsWithOnlyOneSender/roomIds.length)*100).toFixed(1)}%)`);
}

runAnalysis().catch(err => {
    console.error('Erro na execução:', err);
    process.exit(1);
});
