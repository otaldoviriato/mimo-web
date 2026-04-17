import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected. Sweeping expo tokens and renaming field...');

    // Pega a collection de usuários dinamicamente
    const collection = mongoose.connection.collection('users');

    // Rename expoPushToken to fcmToken
    const res = await collection.updateMany(
        { expoPushToken: { $exists: true } },
        { $rename: { 'expoPushToken': 'fcmToken' } }
    );
    console.log(`Renamed in ${res.modifiedCount} documents.`);

    // Remove FCM tokens that were actually ExponentPushTokens (clean them up)
    const res2 = await collection.updateMany(
        { fcmToken: { $regex: /^ExponentPushToken/ } },
        { $unset: { fcmToken: "" } }
    );
    console.log(`Unset ExponentPushTokens in ${res2.modifiedCount} documents.`);

    await mongoose.disconnect();
    console.log('Done.');
}

migrate().catch(console.error);
