const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');

// 1. Carregar variáveis do .env.local
const envLocalPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] ? match[2].trim() : '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            if (value.startsWith('\\$')) value = value.slice(1);
            process.env[key] = value;
        }
    });
    console.log('Variáveis de ambiente do .env.local carregadas!');
} else {
    console.error('Arquivo .env.local não encontrado no caminho:', envLocalPath);
    process.exit(1);
}

// Configurar variáveis auxiliares
const MONGODB_URI = process.env.MONGODB_URI;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_ENV = process.env.ASAAS_ENV || 'sandbox';
const ASAAS_URL = ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';

if (!MONGODB_URI || !ASAAS_API_KEY) {
    console.error('Faltando MONGODB_URI ou ASAAS_API_KEY nas variáveis!');
    process.exit(1);
}

// 2. Definir Schemas inline
const UserSchema = new mongoose.Schema({
    clerkId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    balance: { type: Number, default: 0 },
    pixKey: { type: String }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const WithdrawRequestSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    pixKey: { type: String, required: true },
    status: { type: String, enum: ['pendente', 'processando', 'concluido', 'rejeitado'], default: 'pendente' },
    asaasTransferId: { type: String }
}, { timestamps: true });
const WithdrawRequest = mongoose.models.WithdrawRequest || mongoose.model('WithdrawRequest', WithdrawRequestSchema);

const TransactionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true },
    type: { type: String, required: true },
    source: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed }
});
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);

// Funções de Pix
function detectPixKeyType(pixKey) {
    const cleanKey = pixKey.trim();
    const evpRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (evpRegex.test(cleanKey)) return 'EVP';
    if (cleanKey.includes('@')) return 'EMAIL';
    const digitsOnly = cleanKey.replace(/\D/g, '');
    if (digitsOnly.length === 11) return 'CPF';
    if (digitsOnly.length === 14) return 'CNPJ';
    if (cleanKey.startsWith('+') || digitsOnly.length === 10 || digitsOnly.length === 11 || digitsOnly.length === 12 || digitsOnly.length === 13) return 'PHONE';
    return 'EVP';
}

function normalizePixKey(pixKey, type) {
    const cleanKey = pixKey.trim();
    if (type === 'PHONE') {
        const digitsOnly = cleanKey.replace(/\D/g, '');
        if (cleanKey.startsWith('+')) return `+${digitsOnly}`;
        if (digitsOnly.length === 10 || digitsOnly.length === 11) return `+55${digitsOnly}`;
        return `+${digitsOnly}`;
    }
    if (type === 'CPF' || type === 'CNPJ') return cleanKey.replace(/\D/g, '');
    return cleanKey;
}

// 3. Execução dos testes
async function runTests() {
    try {
        console.log('Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado com sucesso!');

        // Criar ou encontrar um usuário de teste
        let user = await User.findOne({ username: 'test_user_pixels' });
        if (!user) {
            user = await User.create({
                clerkId: 'user_test_clerk_id_pixels_123',
                username: 'test_user_pixels',
                balance: 5000,
                pixKey: 'viriatoceo@gmail.com'
            });
            console.log('Usuário de teste criado:', user.username);
        } else {
            user.balance = 5000;
            user.pixKey = 'viriatoceo@gmail.com';
            await user.save();
            console.log('Usuário de teste resetado.');
        }

        // --- TESTE 1: Criação do Saque Pendente ---
        console.log('\n--- Teste 1: Criando solicitação de saque pendente ---');
        const withdraw = await WithdrawRequest.create({
            userId: user.clerkId,
            amount: 5000,
            pixKey: user.pixKey,
            status: 'pendente'
        });
        console.log(`Solicitação criada! ID: ${withdraw._id}, Status: ${withdraw.status}`);

        // --- TESTE 2: Simulação de Aprovação e Chamada da API do Asaas ---
        console.log('\n--- Teste 2: Simulando aprovação de saque e chamada API Asaas ---');
        const pixType = detectPixKeyType(withdraw.pixKey);
        const normalizedKey = normalizePixKey(withdraw.pixKey, pixType);
        const transferValue = withdraw.amount / 100;

        console.log(`Preparando transferência via Pix no Asaas (${ASAAS_ENV}):`);
        console.log(`- Valor: R$ ${transferValue}`);
        console.log(`- Tipo de Chave: ${pixType}`);
        console.log(`- Chave Normalizada: ${normalizedKey}`);

        let asaasTransferId = null;

        try {
            const response = await axios.post(`${ASAAS_URL}/transfers`, {
                value: transferValue,
                pixAddressKey: normalizedKey,
                pixAddressKeyType: pixType,
                description: 'Saque MimoChat - Teste Local'
            }, {
                headers: {
                    access_token: ASAAS_API_KEY,
                    accept: 'application/json',
                    'content-type': 'application/json'
                }
            });

            console.log('Sucesso ao chamar API do Asaas!');
            console.log('Dados da Transferência:', response.data);
            asaasTransferId = response.data.id;

            withdraw.status = 'processando';
            withdraw.asaasTransferId = asaasTransferId;
            await withdraw.save();
            console.log(`Solicitação de saque atualizada no banco. Status: ${withdraw.status}, AsaasTransferID: ${withdraw.asaasTransferId}`);
        } catch (apiError) {
            const responseData = apiError.response ? apiError.response.data : null;
            console.error('Erro na chamada da API do Asaas:', responseData || apiError.message);
            console.log('Como estamos em Sandbox, criaremos um ID fictício para validar a lógica restante.');
            asaasTransferId = 'transfer_ficticia_' + Date.now();
            
            withdraw.status = 'processando';
            withdraw.asaasTransferId = asaasTransferId;
            await withdraw.save();
            console.log(`Solicitação de saque atualizada com ID fictício. Status: ${withdraw.status}, AsaasTransferID: ${withdraw.asaasTransferId}`);
        }

        // --- TESTE 3: Simulação de Recebimento do Webhook (Sucesso) ---
        console.log('\n--- Teste 3: Simulando evento TRANSFER_DONE no webhook ---');
        const webhookWithdraw = await WithdrawRequest.findOne({ asaasTransferId: asaasTransferId });
        if (webhookWithdraw && webhookWithdraw.status === 'processando') {
            webhookWithdraw.status = 'concluido';
            await webhookWithdraw.save();
            console.log(`Webhook: status do saque atualizado para '${webhookWithdraw.status}'`);

            const tx = await Transaction.create({
                userId: webhookWithdraw.userId,
                amount: webhookWithdraw.amount / 100,
                status: 'COMPLETED',
                type: 'debit',
                source: 'withdrawal',
                timestamp: new Date(),
                metadata: {
                    withdrawRequestId: webhookWithdraw._id.toString(),
                    pixKey: webhookWithdraw.pixKey,
                    asaasTransferId: asaasTransferId
                }
            });
            console.log(`Webhook: Transação de débito macro criada! ID: ${tx._id}, Valor: R$ ${tx.amount}`);
        }

        // --- TESTE 4: Simulação de Falha no Webhook ---
        console.log('\n--- Teste 4: Simulando evento TRANSFER_FAILED no webhook ---');
        const failWithdraw = await WithdrawRequest.create({
            userId: user.clerkId,
            amount: 3500,
            pixKey: user.pixKey,
            status: 'processando',
            asaasTransferId: 'transfer_falha_teste_999'
        });
        console.log(`Saque de teste de falha criado. ID: ${failWithdraw._id}, Status: ${failWithdraw.status}, Balanço inicial do usuário: R$ ${user.balance / 100}`);

        const webhookFailWithdraw = await WithdrawRequest.findOne({ asaasTransferId: 'transfer_falha_teste_999' });
        if (webhookFailWithdraw && webhookFailWithdraw.status === 'processando') {
            const updatedUser = await User.findOneAndUpdate(
                { clerkId: webhookFailWithdraw.userId },
                { $inc: { balance: webhookFailWithdraw.amount } },
                { new: true }
            );
            console.log(`Webhook: Saldo devolvido para o usuário! Novo saldo: R$ ${updatedUser.balance / 100}`);

            webhookFailWithdraw.status = 'rejeitado';
            await webhookFailWithdraw.save();
            console.log(`Webhook: status do saque atualizado para '${webhookFailWithdraw.status}'`);
        }

        // Limpeza
        console.log('\nLimpando dados de teste...');
        await WithdrawRequest.deleteMany({ userId: 'user_test_clerk_id_pixels_123' });
        await Transaction.deleteMany({ userId: 'user_test_clerk_id_pixels_123' });
        await User.deleteOne({ clerkId: 'user_test_clerk_id_pixels_123' });
        console.log('Limpeza concluída!');

    } catch (err) {
        console.error('Erro durante a execução dos testes:', err);
    } finally {
        console.log('Fechando conexão do MongoDB...');
        await mongoose.connection.close();
        console.log('Conexão fechada. Fim do teste!');
    }
}

runTests();
