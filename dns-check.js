const dns = require('dns').promises;

async function checkDns() {
  const host = 'cluster0.row5gd3.mongodb.net';
  const srvHost = '_mongodb._tcp.cluster0.row5gd3.mongodb.net';
  
  console.log(`Verificando DNS para: ${host}`);
  
  try {
    const a = await dns.resolve4(host);
    console.log('Registros A:', a);
  } catch (e) {
    console.log('Falha no registro A:', e.message);
  }

  try {
    const srv = await dns.resolveSrv(srvHost);
    console.log('Registros SRV:', srv);
  } catch (e) {
    console.log('Falha no registro SRV:', e.message);
  }
}

checkDns();
