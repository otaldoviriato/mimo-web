const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const userId = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';
    const user = await mongoose.connection.collection('users').findOne({ clerkId: userId });
    console.log('User Record:', JSON.stringify(user, null, 2));
    await mongoose.disconnect();
}

check().catch(console.error);
