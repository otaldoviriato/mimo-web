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
    identityStatus?: string | null;
};

function compareByRecency(a: ExploreRankable, b: ExploreRankable) {
    return b.lastActiveTime - a.lastActiveTime
        || Number(b.isOnline) - Number(a.isOnline)
        || a.clerkId.localeCompare(b.clerkId);
}

/** Ordena as criadoras pelo acesso mais recente */
export function rankExploreUsers<T extends ExploreRankable>(users: T[], limit = EXPLORE_RESULT_LIMIT): T[] {
    return [...users].sort(compareByRecency).slice(0, limit);
}
