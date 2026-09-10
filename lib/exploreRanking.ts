export const EXPLORE_RESULT_LIMIT = 30;
export type ExploreRankable = {
    clerkId: string;
    isAvailable?: boolean;
    availableUntil?: Date | string | null;
    isOnline?: boolean;
    lastActiveTime: number;
    accessCount?: number;
};

export function isUserCurrentlyAvailable(user: ExploreRankable): boolean {
    if (!user.isAvailable) return false;
    if (!user.availableUntil) return false;
    const expiry = new Date(user.availableUntil).getTime();
    return !isNaN(expiry) && expiry > Date.now();
}

function compareByAvailabilityAndRecency(a: ExploreRankable, b: ExploreRankable) {
    const availA = isUserCurrentlyAvailable(a) ? 1 : 0;
    const availB = isUserCurrentlyAvailable(b) ? 1 : 0;
    const accessA = a.accessCount ?? 0;
    const accessB = b.accessCount ?? 0;
    return availB - availA
        || Number(b.isOnline ?? false) - Number(a.isOnline ?? false)
        || b.lastActiveTime - a.lastActiveTime
        || accessB - accessA
        || a.clerkId.localeCompare(b.clerkId);
}

/** Ordena as profissionais colocando em primeiro lugar as disponíveis e com acesso mais recente */
export function rankExploreUsers<T extends ExploreRankable>(users: T[], limit = EXPLORE_RESULT_LIMIT): T[] {
    return [...users].sort(compareByAvailabilityAndRecency).slice(0, limit);
}
