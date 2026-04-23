const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://viriatoceo_db_user:2CmRlpraeicdFdDe@cluster0.row5gd3.mongodb.net/mimo-chat-desenv?retryWrites=true&w=majority";

async function clearWithdrawals() {
  try {
    console.log('Tentando conectar ao MongoDB...');
    await mongoose.connect(MONGODB_URI, { family: 4 });
    console.log('Conexão estabelecida com sucesso!');
    
    const db = mongoose.connection.db;
    
    const withdrawalsCollection = db.collection('withdrawrequests');
    const deleteResult = await withdrawalsCollection.deleteMany({});
    console.log(`Pedidos de saque removidos: ${deleteResult.deletedCount}`);

    const usersCollection = db.collection('users');
    const updateResult = await usersCollection.updateMany({}, { $set: { balance: 50000 } });
    console.log(`Saldo de R$ 500,00 restaurado para ${updateResult.modifiedCount} usuários.`);
    
    await mongoose.disconnect();
    console.log('Operação concluída e desconectado.');
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

clearWithdrawals();
