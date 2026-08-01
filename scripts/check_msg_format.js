const mongoose = require('mongoose');

const PROD_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function checkMessageFormats() {
    await mongoose.connect(PROD_URI);
    const db = mongoose.connection.db;

    const messagesColl = db.collection('messages');
    const sampleMsgs = await messagesColl.find({}).limit(20).toArray();

    console.log('=== AMOSTRA DE MENSAGENS NO BANCO PROD (mimo-chat) ===');
    sampleMsgs.forEach((m, idx) => {
        console.log(`[${idx+1}] ID: ${m._id} | roomId: "${m.roomId}" | senderId: "${m.senderId}" | receiverId: "${m.receiverId}" | cost: ${m.cost} | earnings: ${m.receiverEarnings}`);
    });

    const msgsWithRoomId = await messagesColl.countDocuments({ roomId: { $exists: true, $ne: '' } });
    const msgsWithoutRoomId = await messagesColl.countDocuments({ $or: [{ roomId: { $exists: false } }, { roomId: '' }, { roomId: null }] });

    console.log(`\nMensagens COM roomId: ${msgsWithRoomId}`);
    console.log(`Mensagens SEM roomId: ${msgsWithoutRoomId}`);

    await mongoose.disconnect();
}

checkMessageFormats().catch(console.error);
