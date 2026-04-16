
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority';

async function check() {
    await mongoose.connect(MONGODB_URI);
    const User = mongoose.model('User', new mongoose.Schema({
        clerkId: String,
        username: String,
        expoPushToken: String
    }));

    const users = await User.find({ expoPushToken: { $exists: true, $ne: '' } });
    console.log(`Found ${users.length} users with push tokens:`);
    users.forEach(u => {
        console.log(`- ${u.username}: ${u.expoPushToken?.substring(0, 20)}...`);
    });
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
