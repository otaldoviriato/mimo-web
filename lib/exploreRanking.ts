export const EXPLORE_RESULT_LIMIT = 30;
export const EXPLORE_DISCOVERY_IMPRESSIONS = 100;
export const EXPLORE_DISCOVERY_INTERVAL = 5;

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
    const quality = users
        .filter((user) => user.qualifiedConversationsCount > 0)
        .sort(compareQuality);
    const discovery = users
        .filter((user) => (
            user.qualifiedConversationsCount === 0
            && user.exploreImpressionsCount < EXPLORE_DISCOVERY_IMPRESSIONS
        ))
        .sort(compareDiscovery);
    const remaining = users
        .filter((user) => (
            user.qualifiedConversationsCount === 0
            && user.exploreImpressionsCount >= EXPLORE_DISCOVERY_IMPRESSIONS
        ))
        .sort(compareDiscovery);

    // As quatro primeiras posições sempre refletem qualidade comprovada.
    // Depois, uma vaga em cada cinco dá oportunidade a quem ainda apareceu pouco.
    const ranked: T[] = [];
    const qualityQueue = [...quality];
    const discoveryQueue = [...discovery];
    const remainingQueue = [...remaining];

    while (ranked.length < limit && (qualityQueue.length || discoveryQueue.length || remainingQueue.length)) {
        const position = ranked.length + 1;
        const isDiscoveryPosition = position % EXPLORE_DISCOVERY_INTERVAL === 0;

        if (isDiscoveryPosition && discoveryQueue.length) {
            ranked.push(discoveryQueue.shift()!);
        } else if (qualityQueue.length) {
            ranked.push(qualityQueue.shift()!);
        } else if (discoveryQueue.length) {
            ranked.push(discoveryQueue.shift()!);
        } else if (remainingQueue.length) {
            ranked.push(remainingQueue.shift()!);
        }
    }
    return ranked.slice(0, limit);
}
