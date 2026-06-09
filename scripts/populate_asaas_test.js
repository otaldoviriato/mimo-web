const mongoose = require('mongoose');

// Para rodar: node scripts/populate_asaas_test.js <prod_mongodb_uri> <asaas_clerk_id>
// Exemplo: node scripts/populate_asaas_test.js "mongodb+srv://..." "user_2a1b..."

const args = process.argv.slice(2);
const mongoUri = args[0] || process.env.MONGODB_URI;
const clerkIdAsaas = args[1];

if (!mongoUri) {
  console.error("Erro: MONGODB_URI não fornecida. Passe como primeiro argumento ou defina no ambiente.");
  process.exit(1);
}

if (!clerkIdAsaas) {
  console.error("Erro: O Clerk ID do usuário de testes do Asaas não foi fornecido.");
  console.log("Instruções:");
  console.log("1. Cadastre o e-mail 'homologacao-asaas@mimochat.com.br' como Test User no Clerk Dashboard.");
  console.log("2. Copie o User ID gerado pelo Clerk (ex: user_2tXy...).");
  console.log("3. Rode este script passando a URI do banco de produção e o User ID do Clerk.");
  console.log("\nExemplo de comando:");
  console.log("node scripts/populate_asaas_test.js \"SUA_URI_DE_PRODUCAO\" \"clerk_user_id_do_asaas\"");
  process.exit(1);
}

async function run() {
  try {
    console.log("Conectando via Mongoose ao banco de dados...");
    await mongoose.connect(mongoUri);
    console.log("Conectado com sucesso!");
    
    const db = mongoose.connection.db;
    const dbName = mongoose.connection.name;
    console.log(`Usando banco de dados: ${dbName}`);

    // 1. Criar ou Atualizar o Criador de Conteúdo Modelo (Profissional)
    const creatorClerkId = "creator_modelo_homologacao";
    const creatorUsername = "modelo_homologacao";
    console.log("Criando criador de conteúdo modelo...");
    
    const creatorUser = {
      clerkId: creatorClerkId,
      username: creatorUsername,
      name: "Mariana Oliveira (Modelo)",
      email: "mariana.modelo@mimochat.com.br",
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      balance: 150000, // Saldo fictício
      isProfessional: true,
      chargePerCharSubscribers: 0.01,
      chargePerCharNonSubscribers: 0.02,
      savedCards: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("users").findOneAndUpdate(
      { username: creatorUsername }, // Busca por username para evitar duplicados
      { $set: creatorUser },
      { upsert: true }
    );
    console.log(`✅ Criador modelo pronto: @${creatorUsername}`);

    // 2. Criar ou Atualizar o Usuário Fã do Asaas (Busca por e-mail para evitar erro 11000)
    console.log("Criando/atualizando usuário fã de homologação do Asaas...");
    const asaasUser = {
      clerkId: clerkIdAsaas,
      username: "homologacao_asaas",
      name: "Suporte Asaas (Homologação)",
      email: "homologacao-asaas@mimochat.com.br",
      photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop",
      balance: 50000, // Fornecer saldo fictício para eles simularem
      isProfessional: false,
      chargePerCharSubscribers: 0.002,
      chargePerCharNonSubscribers: 0.005,
      savedCards: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("users").findOneAndUpdate(
      { email: asaasUser.email }, // Busca por e-mail garante que atualizaremos o registro existente!
      { $set: asaasUser },
      { upsert: true }
    );
    console.log(`✅ Usuário Asaas pronto: ${asaasUser.email}`);

    // 3. Criar a Sala de Conversa (Room) entre o Asaas e o Criador Modelo
    console.log("Criando sala de conversa de simulação...");
    const roomFilter = {
      participants: { $all: [clerkIdAsaas, creatorClerkId] }
    };

    const existingRoom = await db.collection("rooms").findOne(roomFilter);
    let roomId;

    if (existingRoom) {
      roomId = existingRoom._id.toString();
      console.log(`Sala de conversa já existe. ID: ${roomId}`);
    } else {
      const newRoom = {
        participants: [clerkIdAsaas, creatorClerkId],
        lastMessage: "Olá! Seja bem-vindo ao MimoChat. Como posso te ajudar hoje?",
        lastMessageTime: new Date(),
        unreadCount: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const roomRes = await db.collection("rooms").insertOne(newRoom);
      roomId = roomRes.insertedId.toString();
      console.log(`✅ Nova sala criada. ID: ${roomId}`);
    }

    // 4. Inserir mensagens de exemplo na sala
    console.log("Populando mensagens na conversa...");
    
    // Limpar mensagens antigas da sala de homologação para evitar duplicidade
    await db.collection("messages").deleteMany({ roomId: roomId });

    const messages = [
      {
        roomId: roomId,
        senderId: creatorClerkId,
        receiverId: clerkIdAsaas,
        content: "Olá! Seja bem-vindo ao meu MimoChat. Aqui você pode tirar dúvidas diretamente comigo, mandar sugestões ou apoiar meu canal enviando Mimos virtuais. Fique à vontade!",
        charCount: 167,
        cost: 0,
        platformFee: 0,
        receiverEarnings: 0,
        timestamp: new Date(Date.now() - 3600000 * 2), // 2 horas atrás
        isRead: true
      },
      {
        roomId: roomId,
        senderId: clerkIdAsaas,
        receiverId: creatorClerkId,
        content: "Oi Mariana! Que legal a plataforma. Obrigado por me receber aqui.",
        charCount: 65,
        cost: 0.13, // 65 * 0.002
        platformFee: 0.013,
        receiverEarnings: 0.117,
        timestamp: new Date(Date.now() - 3600000), // 1 hora atrás
        isRead: true
      },
      {
        roomId: roomId,
        senderId: creatorClerkId,
        receiverId: clerkIdAsaas,
        content: "Imagina! Se quiser apoiar meu trabalho ou desbloquear conteúdos exclusivos, você pode simular o checkout com cartão de crédito ou Pix de testes do Asaas clicando no ícone de Mimos.",
        charCount: 172,
        cost: 0,
        platformFee: 0,
        receiverEarnings: 0,
        timestamp: new Date(Date.now() - 1800000), // 30 min atrás
        isRead: false
      }
    ];

    await db.collection("messages").insertMany(messages);
    console.log("✅ Mensagens de exemplo inseridas com sucesso.");
    
    console.log("\n🎉 Processo concluído com sucesso!");
    console.log("------------------------------------------------------------------");
    console.log(`E-mail de Login do Asaas: ${asaasUser.email}`);
    console.log("Código Fixo no Clerk: 111111");
    console.log(`Criador para simulação: @${creatorUsername}`);
    console.log("------------------------------------------------------------------");

  } catch (error) {
    console.error("Erro durante a execução do script:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(console.dir);
