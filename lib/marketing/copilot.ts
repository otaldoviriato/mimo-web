import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/adminAuth';
import { cleanString, cleanStringArray } from '@/lib/marketing/security';

const allowedWebOrigins = new Set([
    'https://www.mimochat.com.br',
    'https://mimochat.com.br',
    'http://localhost:3000',
]);

function isAllowedOrigin(origin: string) {
    return allowedWebOrigins.has(origin) || origin.startsWith('chrome-extension://');
}

export function copilotCorsHeaders(request: NextRequest) {
    const origin = request.headers.get('origin') || '';
    return {
        'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'https://www.mimochat.com.br',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        Vary: 'Origin',
    };
}

export function copilotJson(
    request: NextRequest,
    body: Record<string, unknown>,
    status = 200
) {
    return NextResponse.json(body, {
        status,
        headers: copilotCorsHeaders(request),
    });
}

function validInternalToken(request: NextRequest) {
    const expected = process.env.MIMO_GROWTH_INTERNAL_TOKEN || '';
    const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    if (!expected || !supplied) return false;
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    return expectedBuffer.length === suppliedBuffer.length
        && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function requireCopilotAccess(request: NextRequest) {
    if (validInternalToken(request)) {
        return { authorized: true, actor: 'internal-token' };
    }

    const access = await getAdminAccess();
    if (access.isAdmin && access.userId) {
        return { authorized: true, actor: access.userId };
    }

    return { authorized: false, actor: null };
}

export function sanitizeScoutPayload(value: unknown) {
    const body = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const platform = cleanString(body.platform, 30).toLowerCase() || 'instagram';
    const url = cleanString(body.url, 1500);
    const username = cleanString(body.username, 100).toLowerCase().replace(/^@/, '');

    return {
        platform,
        url,
        pageType: cleanString(body.pageType, 30) || 'unknown',
        username,
        displayName: cleanString(body.displayName, 200),
        bio: cleanString(body.bio, 5000),
        followersText: cleanString(body.followersText, 200),
        followingText: cleanString(body.followingText, 200),
        postsText: cleanString(body.postsText, 200),
        externalLink: cleanString(body.externalLink, 1500),
        visibleTexts: cleanStringArray(body.visibleTexts, 50, 500),
        discoverySessionId: cleanString(body.discoverySessionId, 100),
        sourceSeedUsername: cleanString(body.sourceSeedUsername, 100)
            .toLowerCase()
            .replace(/^@/, ''),
        sourceContext: cleanString(body.sourceContext, 5000),
        candidateHistory: Array.isArray(body.candidateHistory)
            ? body.candidateHistory.slice(0, 100)
            : [],
        source: cleanString(body.source, 100) || 'mimo-scout-extension',
    };
}

export function sanitizeDiscoveryCollection(
    value: unknown,
    maxItems: number,
    maxJsonLength = 20_000
) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, maxItems).map(item => {
        if (!item || typeof item !== 'object') return {};
        const json = JSON.stringify(item);
        if (json.length <= maxJsonLength) return item;
        return { truncated: true, preview: json.slice(0, maxJsonLength) };
    });
}

export function parseVisibleCount(value: string) {
    const normalized = value
        .toLowerCase()
        .replace(/\s/g, '')
        .replace(/\.(?=\d{3}\b)/g, '')
        .replace(',', '.');
    const match = normalized.match(/(\d+(?:\.\d+)?)\s*([kmb]|mil|mi)?/i);
    if (!match) return 0;
    const multipliers: Record<string, number> = {
        k: 1_000,
        mil: 1_000,
        m: 1_000_000,
        mi: 1_000_000,
        b: 1_000_000_000,
    };
    return Math.round(Number(match[1]) * (multipliers[match[2] || ''] || 1));
}
