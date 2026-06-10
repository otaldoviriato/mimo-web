import { NextRequest, NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/adminAuth';

const rateBuckets = new Map<string, number[]>();

function getClientIp(request: NextRequest) {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}

function consumeRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const recent = (rateBuckets.get(key) || []).filter(timestamp => now - timestamp < windowMs);
    if (recent.length >= limit) {
        rateBuckets.set(key, recent);
        return false;
    }
    recent.push(now);
    rateBuckets.set(key, recent);
    return true;
}

export async function requireMarketingAdmin(
    request: NextRequest,
    options: { limit?: number; windowMs?: number } = {}
) {
    const access = await getAdminAccess();
    if (!access.userId) {
        return {
            error: NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }),
            userId: null,
        };
    }
    if (!access.isAdmin) {
        return {
            error: NextResponse.json(
                { error: 'Acesso permitido apenas para administradores.' },
                { status: 403 }
            ),
            userId: access.userId,
        };
    }

    const limit = options.limit ?? 120;
    const windowMs = options.windowMs ?? 60_000;
    const key = `${access.userId}:${getClientIp(request)}:${request.nextUrl.pathname}`;
    if (!consumeRateLimit(key, limit, windowMs)) {
        return {
            error: NextResponse.json(
                { error: 'Muitas solicitações. Aguarde um instante e tente novamente.' },
                { status: 429 }
            ),
            userId: access.userId,
        };
    }

    return { error: null, userId: access.userId };
}

export function cleanString(value: unknown, maxLength = 1000) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function cleanStringArray(value: unknown, maxItems = 30, maxLength = 300) {
    if (Array.isArray(value)) {
        return value
            .map(item => cleanString(item, maxLength))
            .filter(Boolean)
            .slice(0, maxItems);
    }
    if (typeof value === 'string') {
        return value
            .split(/\r?\n|,/)
            .map(item => cleanString(item, maxLength))
            .filter(Boolean)
            .slice(0, maxItems);
    }
    return [];
}

export function boundedNumber(
    value: unknown,
    fallback: number,
    min: number,
    max: number
) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}
