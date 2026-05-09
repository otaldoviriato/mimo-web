const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat-desenv?retryWrites=true&w=majority";
const client = new MongoClient(uri);

const femaleNames = ["Ana Clara", "Beatriz Costa", "Camila Silva", "Daniela Oliveira", "Eduarda Santos", "Fernanda Lima", "Gabriela Pereira", "Helena Martins", "Isabella Rodrigues", "Juliana Alves"];
const femaleMessages = [
  "Oi, tudo bem? Adorei a sua foto de perfil!",
  "Olá! Que lugar é esse da sua foto?",
  "Boa noite! Como foi o seu dia?",
  "Oii, achei o seu perfil super interessante.",
  "Oi, vi que a gente tem gostos parecidos.",
  "Tudo bem? Mora por aqui há muito tempo?",
  "Oie! Passando só pra dar um oi mesmo haha.",
  "Nossa, adorei o que você escreveu no seu perfil.",
  "Oi! Quer conversar um pouquinho?",
  "Boa tarde! Tudo tranquilo por aí?"
];

const maleNames = ["Lucas Silva", "Pedro Costa", "Gabriel Oliveira", "Rafael Santos", "Marcos Lima", "Thiago Pereira", "Bruno Martins", "Felipe Rodrigues", "João Alves", "Mateus Ferreira"];
const maleMessages = [
  "Opa, tudo bem? Muito legal o seu perfil.",
  "Fala aí! Como tá sendo o seu dia?",
  "Oi, vi que curtimos as mesmas coisas. Quer conversar?",
  "Boa noite! Tudo tranquilo?",
  "E aí, beleza? Muito boas suas fotos.",
  "Oi! Gosta de sair pra onde no fim de semana?",
  "Tudo bem? Achei super interessante o que você escreveu.",
  "Opa, boa noite! Bora trocar uma ideia?",
  "E aí, tudo certo? Vi seu perfil e achei maneiro.",
  "Oi, tudo bem? Adorei conhecer seu perfil."
];

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to server");
    const db = client.db("mimo-chat-desenv");
    
    // Cleanup previous mock data
    console.log("Cleaning up previous data...");
    const mockFilter = { clerkId: { $regex: /^mock_(f|m)_desenv_/ } };
    const mockUsers = await db.collection("users").find(mockFilter).toArray();
    const mockIds = mockUsers.map(u => u.clerkId);
    
    if (mockIds.length > 0) {
      const roomsResult = await db.collection("rooms").find({ participants: { $in: mockIds } }).toArray();
      const roomIds = roomsResult.map(r => r._id.toString());
      
      let msgsDeleted = 0;
      for (const rid of roomIds) {
        const r = await db.collection("messages").deleteMany({ roomId: rid });
        msgsDeleted += r.deletedCount;
      }
      const roomsDeleted = await db.collection("rooms").deleteMany({ participants: { $in: mockIds } });
      const usersDeleted = await db.collection("users").deleteMany(mockFilter);
      console.log(`Cleanup done: ${usersDeleted.deletedCount} users, ${roomsDeleted.deletedCount} rooms, ${msgsDeleted} messages`);
    }

    // Find target users
    const u1 = await db.collection('users').findOne({ _id: new ObjectId("69e14f7f5323da912c32875a") });
    const u2 = await db.collection('users').findOne({ _id: new ObjectId("69e14f807055256733a8b204") });
    
    if (!u1 || !u2) {
      console.log("Users not found:", { u1: !!u1, u2: !!u2 });
      return;
    }

    const females = [];
    for (let i = 0; i < 10; i++) {
      females.push({
        clerkId: `mock_f_desenv_${i+1}`,
        username: `mock_f_desenv_${i+1}`,
        name: femaleNames[i],
        email: `mock_f_desenv_${i+1}@example.com`,
        photoUrl: `https://randomuser.me/api/portraits/women/${i + 10}.jpg`,
        balance: Math.floor(Math.random() * (100000 - 2000 + 1) + 2000),
        chargeMode: false,
        chargePerChar: 0.002,
        savedCards: [],
        isHighSpender: i % 3 === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _message: femaleMessages[i]
      });
    }

    const males = [];
    for (let i = 0; i < 10; i++) {
      males.push({
        clerkId: `mock_m_desenv_${i+1}`,
        username: `mock_m_desenv_${i+1}`,
        name: maleNames[i],
        email: `mock_m_desenv_${i+1}@example.com`,
        photoUrl: `https://randomuser.me/api/portraits/men/${i + 10}.jpg`,
        balance: Math.floor(Math.random() * (100000 - 2000 + 1) + 2000),
        chargeMode: false,
        chargePerChar: 0.002,
        savedCards: [],
        isHighSpender: i % 3 === 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        _message: maleMessages[i]
      });
    }

    const allMocksToInsert = [...females, ...males].map(m => {
        const doc = { ...m };
        delete doc._message;
        return doc;
    });

    await db.collection('users').insertMany(allMocksToInsert);
    console.log(`Inserted ${allMocksToInsert.length} mock users`);

    // Create rooms & messages
    for (const f of females) {
      const room = {
        participants: [u1.clerkId, f.clerkId],
        lastMessage: f._message,
        lastMessageTime: new Date(),
        unreadCount: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const roomRes = await db.collection('rooms').insertOne(room);
      
      const content = f._message;
      const cost = content.length * 0.002;
      const msg = {
        roomId: roomRes.insertedId.toString(),
        senderId: f.clerkId,
        receiverId: u1.clerkId,
        content,
        charCount: content.length,
        cost,
        platformFee: cost * 0.1,
        receiverEarnings: cost * 0.9,
        timestamp: new Date(),
        isRead: false
      };
      await db.collection('messages').insertOne(msg);
    }

    for (const m of males) {
      const room = {
        participants: [u2.clerkId, m.clerkId],
        lastMessage: m._message,
        lastMessageTime: new Date(),
        unreadCount: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const roomRes = await db.collection('rooms').insertOne(room);
      
      const content = m._message;
      const cost = content.length * 0.002;
      const msg = {
        roomId: roomRes.insertedId.toString(),
        senderId: m.clerkId,
        receiverId: u2.clerkId,
        content,
        charCount: content.length,
        cost,
        platformFee: cost * 0.1,
        receiverEarnings: cost * 0.9,
        timestamp: new Date(),
        isRead: false
      };
      await db.collection('messages').insertOne(msg);
    }
    
    console.log("Rooms and messages created successfully!");

  } finally {
    await client.close();
  }
}
run().catch(console.dir);
