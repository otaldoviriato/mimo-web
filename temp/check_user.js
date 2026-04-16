const mongoose = require('mongoose');

const uri = "mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority";

async function run() {
    try {
        await mongoose.connect(uri);
        const User = mongoose.model('User', new mongoose.Schema({
            clerkId: String,
            email: String,
            username: String,
            name: String,
            taxId: String,
            phone: String,
            expoPushToken: String
        }, { collection: 'users' }));

        const user = await User.findOne({ clerkId: 'user_3ABLmzVbg33Ts4pZ22GUitBnlXj' });
        console.log('User found:', JSON.stringify(user, null, 2));

        const allUsers = await User.find({}).limit(5);
        console.log('Latest 5 users:', JSON.stringify(allUsers.map(u => ({ clerkId: u.clerkId, email: u.email })), null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
