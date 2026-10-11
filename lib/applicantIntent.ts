import { createHmac, timingSafeEqual } from 'node:crypto';

export const APPLICANT_COOKIE = 'mimo_applicant_intent';
export const APPLICANT_MAX_AGE = 60 * 60 * 24 * 30;
type Intent = { startedAt: number; referredByProfessionalId?: string };
function signature(payload: string) {
    const secret = process.env.CLERK_SECRET_KEY;
    if (!secret) throw new Error('Authentication is not configured');
    return createHmac('sha256', secret).update(`applicant:${payload}`).digest('base64url');
}
export function encodeApplicantIntent(intent: Intent) {
    const payload = Buffer.from(JSON.stringify(intent)).toString('base64url');
    return `${payload}.${signature(payload)}`;
}
export function readApplicantIntent(cookie?: string): Intent | null {
    if (!cookie) return null;
    try {
        const [payload, supplied, extra] = cookie.split('.');
        const expected = signature(payload);
        if (extra || !supplied || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
        const intent = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Intent;
        if (!Number.isFinite(intent.startedAt) || intent.startedAt > Date.now() || Date.now() - intent.startedAt > APPLICANT_MAX_AGE * 1000) return null;
        return intent;
    } catch { return null; }
}
