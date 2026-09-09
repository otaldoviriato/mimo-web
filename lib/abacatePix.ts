/** AbacatePay v1, the same API used when creating our Pix QR codes. */
export async function checkAbacatePix(id: string) {
    const key = process.env.ABACATEPAY_API_KEY;
    if (!key) throw new Error('AbacatePay API key is not configured');
    const response = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
    });
    const body = await response.json();
    if (!response.ok || body.error || typeof body.data?.status !== 'string') {
        // Provider responses can contain credentials or personal information.
        throw new Error(`AbacatePay status lookup failed (HTTP ${response.status})`);
    }
    if (body.data.id && body.data.id !== id) throw new Error('AbacatePay payment ID mismatch');
    return body.data.status as string;
}

export function isAbacatePix(transaction: {
    type?: string; source?: string; abacatePayId?: string; metadata?: Record<string, unknown>;
}) {
    return transaction.type === 'PIX' && transaction.source === 'recharge'
        && transaction.abacatePayId?.startsWith('pix_char_') === true
        && (!transaction.metadata?.provider || transaction.metadata.provider === 'abacatepay');
}

export function getAbacatePixWebhookId(body: unknown): string | undefined {
    if (!body || typeof body !== 'object') return;
    const payload = body as Record<string, unknown>;
    const data = payload.data && typeof payload.data === 'object'
        ? payload.data as Record<string, unknown> : {};
    const candidates = [data.pixQrCode, data.transparent, data.payment, data, payload];
    for (const candidate of candidates) {
        if (candidate && typeof candidate === 'object') {
            const id = (candidate as Record<string, unknown>).id;
            // The top-level webhook/log ID must never be used as a payment ID.
            if (typeof id === 'string' && /^pix_char_[A-Za-z0-9]+$/.test(id)) return id;
        }
    }
}
