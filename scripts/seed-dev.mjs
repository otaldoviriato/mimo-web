/**
 * seed-dev.mjs — popula o banco de desenvolvimento com dados fictícios
 * Execução: node scripts/seed-dev.mjs
 */

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Ler .env.local manualmente ─────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const MONGODB_URI = envContent
    .split('\n')
    .find(l => l.startsWith('MONGODB_URI='))
    ?.split('=')
    .slice(1)
    .join('=')
    .trim();

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI não encontrada em .env.local');
    process.exit(1);
}

// ── Schemas ────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
    clerkId:       { type: String, required: true, unique: true },
    username:      { type: String, required: true, unique: true },
    name:          { type: String },
    email:         { type: String, required: true, unique: true },
    photoUrl:      { type: String },
    balance:       { type: Number, default: 0 },
    chargeMode:    { type: Boolean, default: false },
    chargePerChar: { type: Number, default: 0.002 },
    savedCards:    { type: Array, default: [] },
}, { timestamps: true });

const RoomSchema = new mongoose.Schema({
    participants:    { type: [String], required: true },
    lastMessage:     { type: String },
    lastMessageTime: { type: Date },
    unreadCount:     { type: Map, of: Number, default: new Map() },
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
    roomId:          { type: String, required: true },
    senderId:        { type: String, required: true },
    receiverId:      { type: String, required: true },
    content:         { type: String, required: true },
    charCount:       { type: Number, required: true },
    cost:            { type: Number, required: true },
    platformFee:     { type: Number, required: true },
    receiverEarnings:{ type: Number, required: true },
    timestamp:       { type: Date, default: Date.now },
    isRead:          { type: Boolean, default: false },
});

const User    = mongoose.models.User    || mongoose.model('User',    UserSchema);
const Room    = mongoose.models.Room    || mongoose.model('Room',    RoomSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

// ── ID do usuário logado ───────────────────────────────────────────────────
const MY_CLERK_ID = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

// ── Usuários fictícios ─────────────────────────────────────────────────────
const MOCK_USERS = [
    {
        clerkId:       'mock_user_ana_silva_001',
        username:      'anasilva',
        name:          'Ana Silva',
        email:         'ana.silva@mock.com',
        photoUrl:      'https://api.dicebear.com/7.x/avataaars/svg?seed=AnaS',
        balance:       150.50,
        chargeMode:    true,
        chargePerChar: 0.003,
    },
    {
        clerkId:       'mock_user_carlos_002',
        username:      'carlosmendes',
        name:          'Carlos Mendes',
        email:         'carlos.mendes@mock.com',
        photoUrl:      'https://api.dicebear.com/7.x/avataaars/svg?seed=CarloM',
        balance:       80.00,
        chargeMode:    false,
        chargePerChar: 0.002,
    },
    {
        clerkId:       'mock_user_juliana_003',
        username:      'juhcosta',
        name:          'Juliana Costa',
        email:         'juliana.costa@mock.com',
        photoUrl:      'https://api.dicebear.com/7.x/avataaars/svg?seed=JuliC',
        balance:       320.00,
        chargeMode:    true,
        chargePerChar: 0.005,
    },
    {
        clerkId:       'mock_user_rafael_004',
        username:      'rfernandes',
        name:          'Rafael Fernandes',
        email:         'rafael.fernandes@mock.com',
        photoUrl:      'https://api.dicebear.com/7.x/avataaars/svg?seed=RafaF',
        balance:       45.20,
        chargeMode:    false,
        chargePerChar: 0.002,
    },
    {
        clerkId:       'mock_user_beatriz_005',
        username:      'biasouza',
        name:          'Beatriz Souza',
        email:         'beatriz.souza@mock.com',
        photoUrl:      'https://api.dicebear.com/7.x/avataaars/svg?seed=BeaS',
        balance:       500.00,
        chargeMode:    true,
        chargePerChar: 0.004,
    },
];

// ── Conversas mock ─────────────────────────────────────────────────────────
const CONVERSATIONS = [
    {
        with: 'mock_user_ana_silva_001',
        messages: [
            { from: 'mock_user_ana_silva_001', text: 'Oi! Vi seu perfil aqui no Mimo 👋', minutesAgo: 60 },
            { from: MY_CLERK_ID,              text: 'Oi Ana! Tudo bem? Pode me mandar mensagem sim!', minutesAgo: 58 },
            { from: 'mock_user_ana_silva_001', text: 'Que ótimo! Queria saber mais sobre suas criações.', minutesAgo: 55 },
            { from: MY_CLERK_ID,              text: 'Claro, posso te contar tudo 😊 O que quer saber?', minutesAgo: 52 },
            { from: 'mock_user_ana_silva_001', text: 'Você faz artes digitais né? Preciso de um logo.', minutesAgo: 10 },
        ],
    },
    {
        with: 'mock_user_carlos_002',
        messages: [
            { from: MY_CLERK_ID,              text: 'Carlos! Vi que você é especialista em marketing.', minutesAgo: 240 },
            { from: 'mock_user_carlos_002',   text: 'Isso mesmo! Posso ajudar com estratégias de crescimento.', minutesAgo: 235 },
            { from: MY_CLERK_ID,              text: 'Perfeito. Tenho um projeto pra lançar semana que vem.', minutesAgo: 230 },
            { from: 'mock_user_carlos_002',   text: 'Me conta mais! Tô disponível agora.', minutesAgo: 90 },
        ],
    },
    {
        with: 'mock_user_juliana_003',
        messages: [
            { from: 'mock_user_juliana_003',  text: 'Olá! Vi que você tem interesse em finanças 💰', minutesAgo: 1440 },
            { from: MY_CLERK_ID,             text: 'Siiiim! Você faz consultoria?', minutesAgo: 1430 },
            { from: 'mock_user_juliana_003',  text: 'Faço! R$0,005/caractere. Vale muito a pena.', minutesAgo: 1420 },
            { from: MY_CLERK_ID,             text: 'Vou pensar e te aviso!', minutesAgo: 1415 },
            { from: 'mock_user_juliana_003',  text: 'Quando quiser pode chamar 😊', minutesAgo: 5 },
        ],
    },
    {
        with: 'mock_user_beatriz_005',
        messages: [
            { from: 'mock_user_beatriz_005',  text: 'Boa tarde! Tudo bem?', minutesAgo: 2880 },
            { from: MY_CLERK_ID,             text: 'Tudo ótimo! E você?', minutesAgo: 2870 },
            { from: 'mock_user_beatriz_005',  text: 'Aqui tá corrido mas bem! 😄', minutesAgo: 2869 },
        ],
    },
];

// ── Helper: gerar roomId ────────────────────────────────────────────────────
function roomId(a, b) {
    return [a, b].sort().join('_');
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log('🔌 Conectando ao MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
    console.log('✅ Conectado! DB:', mongoose.connection.name);

    // 1. Upsert do próprio usuário logado
    console.log('\n👤 Upserting usuário logado...');
    await User.findOneAndUpdate(
        { clerkId: MY_CLERK_ID },
        {
            $setOnInsert: {
                clerkId: MY_CLERK_ID,
                username: 'eu_usuario_dev',
                name: 'Meu Usuário Dev',
                email: `${MY_CLERK_ID}@mimo.dev`,
                balance: 100,
                chargeMode: false,
                chargePerChar: 0.002,
            }
        },
        { upsert: true, new: true }
    );
    console.log('  ✅ Usuário logado OK');

    // 2. Upsert usuários mock
    console.log('\n👥 Inserindo usuários mock...');
    for (const u of MOCK_USERS) {
        await User.findOneAndUpdate(
            { clerkId: u.clerkId },
            { $setOnInsert: { ...u, savedCards: [] } },
            { upsert: true, new: true }
        );
        console.log(`  ✅ @${u.username} (${u.name})`);
    }

    // 3. Criar rooms e mensagens
    console.log('\n💬 Criando salas e mensagens...');
    for (const conv of CONVERSATIONS) {
        const rid = roomId(MY_CLERK_ID, conv.with);
        const msgs = conv.messages;
        const lastMsg = msgs[msgs.length - 1];
        const lastTime = new Date(Date.now() - lastMsg.minutesAgo * 60 * 1000);

        // Calcular unreadMap
        const unreadMap = {};
        if (lastMsg.from !== MY_CLERK_ID) {
            unreadMap[MY_CLERK_ID] = msgs.filter(m => m.from !== MY_CLERK_ID).length;
        }

        // Upsert room: find primeiro, depois update ou insert
        let room = await Room.findOne({
            participants: { $all: [MY_CLERK_ID, conv.with] }
        });
        if (!room) {
            room = await Room.create({
                participants: [MY_CLERK_ID, conv.with],
                lastMessage: lastMsg.text,
                lastMessageTime: lastTime,
                unreadCount: unreadMap,
            });
            console.log(`  🏠 Sala criada: ${rid.substring(0, 40)}...`);
        } else {
            await Room.updateOne(
                { _id: room._id },
                { $set: { lastMessage: lastMsg.text, lastMessageTime: lastTime, unreadCount: unreadMap } }
            );
            console.log(`  🔄 Sala atualizada: ${rid.substring(0, 40)}...`);
        }

        // Inserir mensagens (apenas se a sala está vazia)
        const existingCount = await Message.countDocuments({ roomId: rid });
        if (existingCount === 0) {
            const msgDocs = msgs.map((m, i) => ({
                roomId: rid,
                senderId: m.from,
                receiverId: m.from === MY_CLERK_ID ? conv.with : MY_CLERK_ID,
                content: m.text,
                charCount: m.text.length,
                cost: m.text.length * 0.002,
                platformFee: m.text.length * 0.002 * 0.1,
                receiverEarnings: m.text.length * 0.002 * 0.9,
                timestamp: new Date(Date.now() - m.minutesAgo * 60 * 1000),
                isRead: i < msgs.length - 1,
            }));
            await Message.insertMany(msgDocs);
            console.log(`     📨 ${msgDocs.length} mensagens inseridas`);
        } else {
            console.log(`     ⏭️  Sala já tinha ${existingCount} mensagens, pulando`);
        }
    }

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log(`   • ${MOCK_USERS.length} usuários mock`);
    console.log(`   • ${CONVERSATIONS.length} conversas`);
    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
});
