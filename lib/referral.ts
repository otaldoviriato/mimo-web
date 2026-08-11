export const REFERRAL_STORAGE_KEY = 'mimo_referral';
export const REFERRAL_QUERY_PARAM = 'ref';
export const REFERRAL_UTM_CREATOR_PARAM = 'utm_creator';

export type ReferralSource = 'profile_share' | 'first_paid_message';

export type ReferralMetadata = {
    professionalId: string;
    professionalUsername?: string;
    capturedAt: string;
    source: ReferralSource;
};

export function sanitizeReferralValue(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 128) return undefined;
    if (!/^[a-zA-Z0-9_@.-]+$/.test(trimmed)) return undefined;
    return trimmed.replace(/^@/, '');
}

export function buildProfileShareUrl(origin: string, username: string, professionalId: string) {
    const url = new URL(`/${username.replace(/^@/, '')}`, origin);
    url.searchParams.set(REFERRAL_QUERY_PARAM, professionalId);
    url.searchParams.set(REFERRAL_UTM_CREATOR_PARAM, username.replace(/^@/, ''));
    url.searchParams.set('utm_source', 'mimo_profile_share');
    url.searchParams.set('utm_medium', 'share');
    url.searchParams.set('utm_campaign', 'creator_referral');
    return url.toString();
}

export function buildReferralMetadata(professionalId: string, professionalUsername?: string): ReferralMetadata | undefined {
    const cleanProfessionalId = sanitizeReferralValue(professionalId);
    if (!cleanProfessionalId) return undefined;

    const cleanUsername = sanitizeReferralValue(professionalUsername);
    return {
        professionalId: cleanProfessionalId,
        ...(cleanUsername ? { professionalUsername: cleanUsername } : {}),
        capturedAt: new Date().toISOString(),
        source: 'profile_share',
    };
}

export function getReferralFromSearchParams(searchParams: URLSearchParams): ReferralMetadata | undefined {
    const professionalId = searchParams.get(REFERRAL_QUERY_PARAM);
    const professionalUsername = searchParams.get(REFERRAL_UTM_CREATOR_PARAM);
    if (!professionalId) return undefined;
    return buildReferralMetadata(professionalId, professionalUsername || undefined);
}

export function getReferralFromUnsafeMetadata(unsafeMetadata: unknown): ReferralMetadata | undefined {
    if (!unsafeMetadata || typeof unsafeMetadata !== 'object') return undefined;

    const metadata = unsafeMetadata as Record<string, unknown>;
    const rawReferral = metadata.mimoReferral;
    if (!rawReferral || typeof rawReferral !== 'object') return undefined;

    const referral = rawReferral as Record<string, unknown>;
    const professionalId = sanitizeReferralValue(referral.professionalId);
    if (!professionalId) return undefined;

    const professionalUsername = sanitizeReferralValue(referral.professionalUsername);
    const capturedAt = typeof referral.capturedAt === 'string' && referral.capturedAt.trim()
        ? referral.capturedAt
        : new Date().toISOString();

    return {
        professionalId,
        ...(professionalUsername ? { professionalUsername } : {}),
        capturedAt,
        source: 'profile_share',
    };
}

export function getReferralFromRequestHeaders(headers: Headers): ReferralMetadata | undefined {
    const professionalId = headers.get('x-mimo-referral-professional-id');
    const professionalUsername = headers.get('x-mimo-referral-professional-username') || undefined;
    return professionalId ? buildReferralMetadata(professionalId, professionalUsername) : undefined;
}
