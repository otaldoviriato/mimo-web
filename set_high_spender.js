const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function processDb(dbName) {
  console.log(`\nProcessing DB: ${dbName}`);
  const db = client.db(dbName);
  
  // Find all mock users
  const mockUsers = await db.collection('users').find({ clerkId: { $regex: /^mock_/ } }).toArray();
  console.log(`Found ${mockUsers.length} mock users in ${dbName}`);
  
  if (mockUsers.length === 0) return;
  
  // Shuffle users
  const shuffled = mockUsers.sort(() => 0.5 - Math.random());
  
  // Select 20%
  const targetCount = Math.max(1, Math.floor(mockUsers.length * 0.2));
  const highSpenders = shuffled.slice(0, targetCount);
  const normalUsers = shuffled.slice(targetCount);
  
  console.log(`Setting ${highSpenders.length} users to High Spenders and ${normalUsers.length} to Normal`);

  if (highSpenders.length > 0) {
    const highSpenderIds = highSpenders.map(u => u._id);
    await db.collection('users').updateMany(
      { _id: { $in: highSpenderIds } },
      { $set: { isHighSpender: true } }
    );
  }

  if (normalUsers.length > 0) {
    const normalIds = normalUsers.map(u => u._id);
    await db.collection('users').updateMany(
      { _id: { $in: normalIds } },
      { $set: { isHighSpender: false } }
    );
  }
}

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to server");
    
    await processDb("mimo-chat"); // Production
    await processDb("mimo-chat-desenv"); // Development

    console.log("\nAll done!");
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
