import { Storage } from '@google-cloud/storage';

function getStorage() {
  const gcsConfig = process.env.GCS_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.GCS_SERVICE_ACCOUNT) 
    : null;

  return new Storage({
    projectId: gcsConfig?.project_id,
    credentials: {
      client_email: gcsConfig?.client_email,
      private_key: gcsConfig?.private_key?.replace(/\\n/g, '\n'),
    },
  });
}

export async function uploadToGCS(file: File, path: string): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error('A bucket name is needed to use Cloud Storage. Please set GCS_BUCKET_NAME environment variable.');
  }

  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(path);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await blob.save(buffer, {
    contentType: file.type,
    resumable: false,
  });

  return `https://storage.googleapis.com/${bucketName}/${path}`;
}
export async function getSignedUploadURL(path: string, contentType: string): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error('GCS_BUCKET_NAME not set');

  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(path);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutos
    contentType,
  });

  return url;
}
