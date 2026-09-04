export const EXPLORE_RESULT_LIMIT = 30;
export type ExploreRankable = {
    clerkId: string;
    isOnline: boolean;
    lastActiveTime: number;
};

function compareByRecency(a: ExploreRankable, b: ExploreRankable) {
    return Number(b.isOnline) - Number(a.isOnline)
        || b.lastActiveTime - a.lastActiveTime
        || a.clerkId.localeCompare(b.clerkId);
}

/** Ordena as criadoras pelo acesso mais recente */
export function rankExploreUsers<T extends ExploreRankable>(users: T[], limit = EXPLORE_RESULT_LIMIT): T[] {
    return [...users].sort(compareByRecency).slice(0, limit);
}
