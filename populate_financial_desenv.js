const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat-desenv?retryWrites=true&w=majority";
const client = new MongoClient(uri);

// Auxiliar para gerar datas aleatórias entre duas datas
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function run() {
    try {
        await client.connect();
        console.log("Conectado ao MongoDB para carga financeira de desenvolvimento...");
        const db = client.db("mimo-chat-desenv");

        // Limpar coleções financeiras para começar do zero
        console.log("Limpando transações, microtransações e saques anteriores...");
        await db.collection("transactions").deleteMany({});
        await db.collection("microtransactions").deleteMany({});
        await db.collection("withdrawrequests").deleteMany({});

        // Obter os usuários mocks criados pelo populate_desenv
        const mockUsers = await db.collection("users").find({ clerkId: { $regex: /^mock_/ } }).toArray();
        if (mockUsers.length === 0) {
            console.log("Nenhum usuário mock encontrado. Rode primeiro 'node populate_desenv.js'.");
            return;
        }

        const females = mockUsers.filter(u => u.clerkId.includes('_f_'));
        const males = mockUsers.filter(u => u.clerkId.includes('_m_'));

        const transactionsToInsert = [];
        const microtransactionsToInsert = [];
        const withdrawsToInsert = [];

        // Definição de períodos contábeis
        const periodos = [
            {
                name: "Junho 2026",
                start: new Date(2026, 5, 1, 0, 0, 0),
                end: new Date(2026, 5, 30, 23, 59, 59),
                depositsTarget: 12000,
                withdrawsTarget: 7000,
                volumeMultiplier: 0.8
            },
            {
                name: "Julho 2026",
                start: new Date(2026, 6, 1, 0, 0, 0),
                end: new Date(2026, 6, 16, 12, 0, 0), // data atual (hoje é dia 16)
                depositsTarget: 17500,
                withdrawsTarget: 9500,
                volumeMultiplier: 1.0
            }
        ];

        for (const p of periodos) {
            console.log(`Gerando dados para ${p.name}...`);

            // --- 1. GERAR RECARGAS / DEPÓSITOS (Transactions) ---
            let currentDepositsSum = 0;
            let depositIndex = 1;
            while (currentDepositsSum < p.depositsTarget) {
                const user = males[Math.floor(Math.random() * males.length)]; // males compram créditos
                const val = Math.floor(Math.random() * (400 - 30 + 1) + 30); // R$ 30 a R$ 430
                const txDate = randomDate(p.start, p.end);
                const isPaid = Math.random() > 0.15; // 85% de sucesso

                const tx = {
                    userId: user.clerkId,
                    abacatePayId: `AP-MOCK-${p.name.replace(" ", "")}-${depositIndex}-${Math.floor(Math.random() * 100000)}`,
                    amount: val, // recharge salva em REAIS
                    status: isPaid ? 'PAID' : (Math.random() > 0.5 ? 'PENDING' : 'CANCELLED'),
                    type: Math.random() > 0.4 ? 'PIX' : 'CC',
                    source: 'recharge',
                    timestamp: txDate,
                    createdAt: txDate,
                    updatedAt: txDate
                };

                transactionsToInsert.push(tx);
                if (tx.status === 'PAID') {
                    currentDepositsSum += val;
                }
                depositIndex++;
            }

            // --- 2. GERAR ASSINATURAS (Transactions) ---
            const subCount = Math.floor(25 * p.volumeMultiplier);
            for (let i = 0; i < subCount; i++) {
                const male = males[Math.floor(Math.random() * males.length)];
                const female = females[Math.floor(Math.random() * females.length)];
                const priceCents = Math.floor(Math.random() * (9990 - 2990 + 1) + 2990); // R$ 29,90 a R$ 99,90 em centavos
                const txDate = randomDate(p.start, p.end);
                
                const platformFeeCents = Math.floor(priceCents * 0.1); // comissão de 10%
                
                const subTx = {
                    userId: male.clerkId, // quem pagou
                    relatedUserId: female.clerkId, // quem recebeu
                    amount: priceCents, // subscription salva em CENTAVOS
                    status: 'debit',
                    type: 'debit',
                    source: 'subscription',
                    timestamp: txDate,
                    metadata: {
                        platformFee: platformFeeCents,
                        subscriberDiscountPercentage: 0
                    },
                    createdAt: txDate,
                    updatedAt: txDate
                };
                
                transactionsToInsert.push(subTx);
            }

            // --- 3. GERAR SAQUES (WithdrawRequests + Transactions) ---
            let currentWithdrawSum = 0;
            let withdrawIndex = 1;
            while (currentWithdrawSum < p.withdrawsTarget) {
                const female = females[Math.floor(Math.random() * females.length)];
                const valCents = Math.floor(Math.random() * (60000 - 8000 + 1) + 8000); // R$ 80 a R$ 600 em centavos
                const txDate = randomDate(p.start, p.end);

                // Alguns saques recentes em Julho podem estar pendentes
                let status = 'concluido';
                if (p.name.includes("Julho")) {
                    const rnd = Math.random();
                    if (rnd < 0.15) status = 'pendente';
                    else if (rnd < 0.25) status = 'processando';
                    else if (rnd < 0.3) status = 'rejeitado';
                }

                const wr = {
                    _id: new ObjectId(),
                    userId: female.clerkId,
                    amount: valCents, // em centavos
                    fee: 0,
                    netAmount: valCents,
                    pixKey: female.email,
                    status: status,
                    createdAt: txDate,
                    updatedAt: txDate
                };

                withdrawsToInsert.push(wr);

                if (status === 'concluido') {
                    currentWithdrawSum += (valCents / 100);

                    // Cria transação contábil de débito da plataforma para a profissional
                    const wTx = {
                        userId: female.clerkId,
                        amount: valCents / 100, // em reais
                        status: 'debit',
                        type: 'debit',
                        source: 'withdrawal',
                        timestamp: txDate,
                        metadata: {
                            withdrawRequestId: wr._id.toString()
                        },
                        createdAt: txDate,
                        updatedAt: txDate
                    };
                    transactionsToInsert.push(wTx);
                }
            }

            // --- 4. GERAR MICROTRANSAÇÕES (Mídias, Chat, Mimos) ---
            
            // A. Desbloqueios de Mídia (image_unlock)
            const unlockCount = Math.floor(40 * p.volumeMultiplier);
            for (let i = 0; i < unlockCount; i++) {
                const male = males[Math.floor(Math.random() * males.length)];
                const female = females[Math.floor(Math.random() * females.length)];
                const amountCents = Math.floor(Math.random() * (3500 - 500 + 1) + 500); // R$ 5 a R$ 35
                const txDate = randomDate(p.start, p.end);
                const messageId = `msg-mock-${Math.floor(Math.random() * 1000000)}`;

                // 1. Débito do usuário
                const debit = {
                    userId: male.clerkId,
                    amount: amountCents, // em centavos
                    type: 'debit',
                    source: 'image_unlock',
                    relatedUserId: female.clerkId,
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                // 2. Crédito da profissional (líquido)
                const feeCents = Math.floor(amountCents * 0.1); // 10% comissão
                const credit = {
                    userId: female.clerkId,
                    amount: amountCents - feeCents,
                    type: 'credit',
                    source: 'image_unlock',
                    relatedUserId: male.clerkId,
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                // 3. Taxa retida da plataforma
                const fee = {
                    userId: 'platform',
                    amount: feeCents,
                    type: 'platform_fee',
                    source: 'image_unlock',
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                microtransactionsToInsert.push(debit, credit, fee);
            }

            // B. Mensagens Chat (message)
            const msgTxCount = Math.floor(100 * p.volumeMultiplier);
            for (let i = 0; i < msgTxCount; i++) {
                const male = males[Math.floor(Math.random() * males.length)];
                const female = females[Math.floor(Math.random() * females.length)];
                const amountCents = Math.floor(Math.random() * (150 - 15 + 1) + 15); // R$ 0.15 a R$ 1.50
                const txDate = randomDate(p.start, p.end);
                const messageId = `msg-mock-${Math.floor(Math.random() * 1000000)}`;

                const debit = {
                    userId: male.clerkId,
                    amount: amountCents,
                    type: 'debit',
                    source: 'message',
                    relatedUserId: female.clerkId,
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                const feeCents = Math.floor(amountCents * 0.1); // comissão de 10%
                const credit = {
                    userId: female.clerkId,
                    amount: amountCents - feeCents,
                    type: 'credit',
                    source: 'message',
                    relatedUserId: male.clerkId,
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                const fee = {
                    userId: 'platform',
                    amount: feeCents,
                    type: 'platform_fee',
                    source: 'message',
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                microtransactionsToInsert.push(debit, credit, fee);
            }

            // C. Mimos Enviados (gift)
            const giftCount = Math.floor(15 * p.volumeMultiplier);
            for (let i = 0; i < giftCount; i++) {
                const male = males[Math.floor(Math.random() * males.length)];
                const female = females[Math.floor(Math.random() * females.length)];
                const amountCents = Math.floor(Math.random() * (5000 - 1000 + 1) + 1000); // R$ 10 a R$ 50
                const txDate = randomDate(p.start, p.end);
                const messageId = `msg-mock-${Math.floor(Math.random() * 1000000)}`;

                const debit = {
                    userId: male.clerkId,
                    amount: amountCents,
                    type: 'debit',
                    source: 'gift',
                    relatedUserId: female.clerkId,
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                const feeCents = Math.floor(amountCents * 0.15); // comissão de 15% em mimos
                const credit = {
                    userId: female.clerkId,
                    amount: amountCents - feeCents,
                    type: 'credit',
                    source: 'gift',
                    relatedUserId: male.clerkId,
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                const fee = {
                    userId: 'platform',
                    amount: feeCents,
                    type: 'platform_fee',
                    source: 'gift',
                    messageId: messageId,
                    timestamp: txDate,
                    metadata: { messageId },
                    createdAt: txDate,
                    updatedAt: txDate
                };

                microtransactionsToInsert.push(debit, credit, fee);
            }
        }

        // Realizar inserção
        console.log(`Inserindo ${transactionsToInsert.length} transações no banco...`);
        await db.collection("transactions").insertMany(transactionsToInsert);

        console.log(`Inserindo ${microtransactionsToInsert.length} microtransações no banco...`);
        await db.collection("microtransactions").insertMany(microtransactionsToInsert);

        console.log(`Inserindo ${withdrawsToInsert.length} solicitações de saques no banco...`);
        await db.collection("withdrawrequests").insertMany(withdrawsToInsert);

        console.log("Carga financeira de desenvolvimento concluída com sucesso!");

    } catch (e) {
        console.error("Erro durante a população financeira:", e);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
