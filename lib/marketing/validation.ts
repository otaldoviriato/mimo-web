import { MarketingCandidateInput } from '@/models/Marketing';
import { boundedNumber, cleanString } from '@/lib/marketing/security';

export function normalizeUsername(value: unknown) {
    return cleanString(value, 80).replace(/^@/, '').toLowerCase();
}

export function normalizeCandidateInput(value: unknown): MarketingCandidateInput | null {
    if (!value || typeof value !== 'object') return null;
    const source = value as Record<string, unknown>;
    const username = normalizeUsername(source.username);
    if (!username) return null;
    return {
        username,
        displayName: cleanString(source.displayName || source.name, 160),
        profileUrl: cleanString(source.profileUrl, 500),
        bio: cleanString(source.bio, 5000),
        followersCount: boundedNumber(source.followersCount || source.followers, 0, 0, 1_000_000_000),
        followingCount: boundedNumber(source.followingCount || source.following, 0, 0, 1_000_000_000),
        postsCount: boundedNumber(source.postsCount || source.posts, 0, 0, 1_000_000_000),
        externalLink: cleanString(source.externalLink || source.link, 500),
        sourceSeedUsername: normalizeUsername(source.sourceSeedUsername || source.seed),
        sourceContext: cleanString(source.sourceContext || source.context, 5000),
        comments: cleanString(source.comments, 5000),
    };
}

export function normalizeCandidateList(value: unknown, maxItems = 500) {
    if (!Array.isArray(value)) return [];
    return value
        .slice(0, maxItems)
        .map(normalizeCandidateInput)
        .filter((candidate): candidate is MarketingCandidateInput => Boolean(candidate));
}
