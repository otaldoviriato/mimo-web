import crypto from 'crypto';

function getEncryptionKey() {
    const secret = process.env.MARKETING_ENCRYPTION_KEY || process.env.CLERK_SECRET_KEY;
    if (!secret || secret.length < 20) {
        throw new Error('Configure MARKETING_ENCRYPTION_KEY para armazenar a chave da OpenAI.');
    }
    return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted].map(part => part.toString('base64url')).join('.');
}

export function decryptSecret(value: string) {
    const [ivValue, tagValue, encryptedValue] = value.split('.');
    if (!ivValue || !tagValue || !encryptedValue) {
        throw new Error('Segredo criptografado inválido.');
    }
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        getEncryptionKey(),
        Buffer.from(ivValue, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
        decipher.update(Buffer.from(encryptedValue, 'base64url')),
        decipher.final(),
    ]).toString('utf8');
}

export function maskSecret(encryptedValue?: string) {
    return encryptedValue ? 'sk-••••••••••••••••' : '';
}
