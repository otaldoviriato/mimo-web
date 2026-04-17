const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// Manual parse .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

async function configureCors() {
  const gcsConfig = process.env.GCS_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.GCS_SERVICE_ACCOUNT) 
    : null;

  if (!gcsConfig) {
    console.error('GCS_SERVICE_ACCOUNT not found in .env.local');
    return;
  }

  const storage = new Storage({
    projectId: gcsConfig.project_id,
    credentials: {
      client_email: gcsConfig.client_email,
      private_key: gcsConfig.private_key.replace(/\\n/g, '\n'),
    },
  });

  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    console.error('GCS_BUCKET_NAME not set');
    return;
  }

  console.log(`Configurando CORS para o bucket: ${bucketName}...`);

  try {
    const [metadata] = await storage.bucket(bucketName).setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
        origin: ['*'], // Em produção, idealmente restringir ao domínio do app
        responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable'],
      },
    ]);
    console.log('✅ CORS configurado com sucesso!');

    console.log('Configurando acesso público (Storage Object Viewer) para allUsers...');
    try {
      await storage.bucket(bucketName).iam.addBinding({
        role: 'roles/storage.objectViewer',
        members: ['allUsers'],
      });
      console.log('✅ Acesso público configurado com sucesso!');
    } catch (err) {
      console.warn('⚠️ Não foi possível configurar acesso público automaticamente:', err.message);
      console.log('Dica: Adicione manualmente o papel "Storage Object Viewer" para "allUsers" no Console do Google Cloud.');
    }
  } catch (err) {
    console.error('❌ Erro na configuração:', err);
  }
}

configureCors();
