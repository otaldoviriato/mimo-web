import crypto from 'node:crypto';

const ABACATEPAY_WEBHOOK_PUBLIC_KEY =
    't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

export function verifyAbacateWebhook(rawBody: string, urlSecret: string | null, signature: string | null) {
    const configuredSecret = process.env.ABACATE_PAY_WEBHOOK_SECRET;
    if (!configuredSecret || !urlSecret || !signature) return false;
    const secretA = Buffer.from(configuredSecret);
    const secretB = Buffer.from(urlSecret);
    if (secretA.length !== secretB.length || !crypto.timingSafeEqual(secretA, secretB)) return false;
    const expected = crypto.createHmac('sha256', ABACATEPAY_WEBHOOK_PUBLIC_KEY)
        .update(Buffer.from(rawBody, 'utf8')).digest('base64');
    const signatureA = Buffer.from(expected);
    const signatureB = Buffer.from(signature);
    return signatureA.length === signatureB.length && crypto.timingSafeEqual(signatureA, signatureB);
}

export function getWebhookEventId(body: unknown, rawBody: string) {
    if (body && typeof body === 'object') {
        const id = (body as Record<string, unknown>).id;
        if (typeof id === 'string' && id.length > 0) return id;
    }
    return `payload_${crypto.createHash('sha256').update(rawBody).digest('hex')}`;
}
