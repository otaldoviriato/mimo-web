const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat?retryWrites=true&w=majority";

async function testConnection() {
  try {
    console.log('Tentando conectar ao MongoDB com filtro IPv4...');
    await mongoose.connect(MONGODB_URI, { family: 4 });
    console.log('Conexão estabelecida com sucesso!');
    
    // Lista as coleções disponíveis
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Coleções encontradas:');
    collections.forEach(col => console.log(` - ${col.name}`));
    
    await mongoose.disconnect();
    console.log('Desconectado.');
  } catch (err) {
    console.error('Erro na conexão:', err);
    process.exit(1);
  }
}

testConnection();
