const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function processDb(dbName) {
  console.log(`\nProcessing DB: ${dbName}`);
  const db = client.db(dbName);
  
  // Find all mock rooms (rooms where at least one participant is a mock user)
  const mockUsers = await db.collection('users').find({ clerkId: { $regex: /^mock_/ } }).toArray();
  const mockIds = mockUsers.map(u => u.clerkId);
  
  const rooms = await db.collection('rooms').find({ participants: { $in: mockIds } }).toArray();
  console.log(`Found ${rooms.length} mock rooms in ${dbName}`);
  
  if (rooms.length === 0) return;
  
  // Shuffle rooms
  const shuffled = rooms.sort(() => 0.5 - Math.random());
  
  // Select 30%
  const unreadCountTarget = Math.max(1, Math.floor(rooms.length * 0.3));
  const unreadRooms = shuffled.slice(0, unreadCountTarget);
  const readRooms = shuffled.slice(unreadCountTarget);
  
  console.log(`Setting ${unreadRooms.length} rooms to UNREAD and ${readRooms.length} to READ`);

  // Update unread rooms
  for (const room of unreadRooms) {
    const realUser = room.participants.find(p => !p.startsWith('mock_'));
    if (!realUser) continue;
    
    await db.collection('rooms').updateOne(
      { _id: room._id },
      { $set: { [`unreadCount.${realUser}`]: 1 } }
    );
    
    await db.collection('messages').updateMany(
      { roomId: room._id.toString(), receiverId: realUser },
      { $set: { isRead: false } }
    );
  }

  // Update read rooms
  for (const room of readRooms) {
    const realUser = room.participants.find(p => !p.startsWith('mock_'));
    if (!realUser) continue;
    
    await db.collection('rooms').updateOne(
      { _id: room._id },
      { $set: { unreadCount: {} } } // Clears all unread counts
    );
    
    await db.collection('messages').updateMany(
      { roomId: room._id.toString() },
      { $set: { isRead: true } }
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
