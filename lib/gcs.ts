import { Storage } from '@google-cloud/storage';

const gcsConfig = process.env.GCS_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.GCS_SERVICE_ACCOUNT) 
  : null;

const storage = new Storage({
  projectId: gcsConfig?.project_id,
  credentials: {
    client_email: gcsConfig?.client_email,
    private_key: gcsConfig?.private_key?.replace(/\\n/g, '\n'),
  },
});

export const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || '');

export async function uploadToGCS(file: File, path: string): Promise<string> {
  const blob = bucket.file(path);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await blob.save(buffer, {
    contentType: file.type,
    resumable: false,
  });

  try {
    await blob.makePublic();
  } catch (err) {
    console.warn('Could not make blob public, bucket might have Uniform Bucket-Level Access:', err);
  }

  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}
