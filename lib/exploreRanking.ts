export const EXPLORE_DISCOVERY_SLOTS = 8;
export const EXPLORE_RESULT_LIMIT = 30;
export const EXPLORE_DISCOVERY_IMPRESSIONS = 100;

export type ExploreRankable = {
    clerkId: string;
    exploreImpressionsCount: number;
    exploreProfileViewsCount: number;
    qualifiedConversationsCount: number;
    isOnline: boolean;
    lastActiveTime: number;
    completeness: number;
};

function compareDiscovery(a: ExploreRankable, b: ExploreRankable) {
    return a.exploreImpressionsCount - b.exploreImpressionsCount
        || a.exploreProfileViewsCount - b.exploreProfileViewsCount
        || b.qualifiedConversationsCount - a.qualifiedConversationsCount
        || Number(b.isOnline) - Number(a.isOnline)
        || b.lastActiveTime - a.lastActiveTime
        || b.completeness - a.completeness
        || a.clerkId.localeCompare(b.clerkId);
}

function compareQuality(a: ExploreRankable, b: ExploreRankable) {
    return b.qualifiedConversationsCount - a.qualifiedConversationsCount
        || Number(b.isOnline) - Number(a.isOnline)
        || b.exploreProfileViewsCount - a.exploreProfileViewsCount
        || b.lastActiveTime - a.lastActiveTime
        || b.completeness - a.completeness
        || a.exploreImpressionsCount - b.exploreImpressionsCount
        || a.clerkId.localeCompare(b.clerkId);
}

/** Reserva parte da vitrine para perfis pouco exibidos e o restante para qualidade comprovada. */
export function rankExploreUsers<T extends ExploreRankable>(users: T[], limit = EXPLORE_RESULT_LIMIT): T[] {
    const discovery = users
        .filter((user) => user.exploreImpressionsCount < EXPLORE_DISCOVERY_IMPRESSIONS)
        .sort(compareDiscovery)
        .slice(0, Math.min(EXPLORE_DISCOVERY_SLOTS, limit));

    const selected = new Set(discovery.map((user) => user.clerkId));
    const quality = users
        .filter((user) => !selected.has(user.clerkId))
        .sort(compareQuality)
        .slice(0, Math.max(0, limit - discovery.length));

    // A cada dois destaques entra uma descoberta, misturando os dois grupos na vitrine.
    const ranked: T[] = [];
    const discoveryQueue = [...discovery];
    const qualityQueue = [...quality];
    while (ranked.length < limit && (discoveryQueue.length || qualityQueue.length)) {
        if (qualityQueue.length) ranked.push(qualityQueue.shift()!);
        if (qualityQueue.length) ranked.push(qualityQueue.shift()!);
        if (discoveryQueue.length) ranked.push(discoveryQueue.shift()!);
    }
    return ranked.slice(0, limit);
}
