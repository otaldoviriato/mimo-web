export const EXPLORE_RESULT_LIMIT = 30;
export type ExploreRankable = {
    clerkId: string;
    isOnline: boolean;
    lastActiveTime: number;
    accessCount?: number;
};

function compareByAccessCount(a: ExploreRankable, b: ExploreRankable) {
    const accessA = a.accessCount ?? 0;
    const accessB = b.accessCount ?? 0;
    return accessB - accessA
        || Number(b.isOnline) - Number(a.isOnline)
        || b.lastActiveTime - a.lastActiveTime
        || a.clerkId.localeCompare(b.clerkId);
}

/** Ordena as profissionais por acessos no explorar */
export function rankExploreUsers<T extends ExploreRankable>(users: T[], limit = EXPLORE_RESULT_LIMIT): T[] {
    return [...users].sort(compareByAccessCount).slice(0, limit);
}
