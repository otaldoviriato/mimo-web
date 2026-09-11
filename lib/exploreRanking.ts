export const EXPLORE_RESULT_LIMIT = 30;
export type ExploreRankable = {
    clerkId: string;
    isOnline: boolean;
    lastActiveTime: number;
    accessCount?: number;
};

function compareByOnlineAndRecency(a: ExploreRankable, b: ExploreRankable) {
    const accessA = a.accessCount ?? 0;
    const accessB = b.accessCount ?? 0;
    return Number(b.isOnline) - Number(a.isOnline)
        || b.lastActiveTime - a.lastActiveTime
        || accessB - accessA
        || a.clerkId.localeCompare(b.clerkId);
}

/** Ordena as profissionais colocando em primeiro lugar as online agora ou com acesso mais recente */
export function rankExploreUsers<T extends ExploreRankable>(users: T[], limit = EXPLORE_RESULT_LIMIT): T[] {
    return [...users].sort(compareByOnlineAndRecency).slice(0, limit);
}
