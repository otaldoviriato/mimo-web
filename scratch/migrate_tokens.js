const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in .env.local');
        return;
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(); // Usa o banco padrão da URI
        const collection = db.collection('users');

        // 1. Renomeia expoPushToken para fcmToken (para quem já tinha algo que não era Expo)
        const res1 = await collection.updateMany(
            { expoPushToken: { $exists: true } },
            { $rename: { "expoPushToken": "fcmToken" } }
        );
        console.log(`Renomeados: ${res1.modifiedCount}`);

        // 2. Remove tokens que eram do padrão Expo (ExponentPushToken...)
        const res2 = await collection.updateMany(
            { fcmToken: { $regex: /^ExponentPushToken/ } },
            { $unset: { fcmToken: "" } }
        );
        console.log(`Tokens Expo removidos: ${res2.modifiedCount}`);

        console.log('Migração concluída com sucesso.');
    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        await client.close();
    }
}

migrate();
