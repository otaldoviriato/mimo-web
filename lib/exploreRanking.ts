export const EXPLORE_RESULT_LIMIT = 30;

export type ExploreRankingMode = 'algorithm' | 'revenue' | 'recent_visits' | 'last_seen' | 'manual';

export type ExploreRankable = {
    clerkId: string;
    isOnline: boolean;
    lastActiveTime: number;
    accessCount?: number;
    totalEarningsCents?: number;
    lastAccessAt?: number | string | Date | null;
    lastSeen?: number | string | Date | null;
};

export interface RankExploreOptions {
    mode?: ExploreRankingMode;
    manualOrder?: string[];
    limit?: number;
}

function getTimeValue(val?: number | string | Date | null): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const time = new Date(val).getTime();
    return isNaN(time) ? 0 : time;
}

export function compareByAlgorithm(a: ExploreRankable, b: ExploreRankable) {
    const accessA = a.accessCount ?? 0;
    const accessB = b.accessCount ?? 0;
    return Number(b.isOnline) - Number(a.isOnline)
        || b.lastActiveTime - a.lastActiveTime
        || accessB - accessA
        || a.clerkId.localeCompare(b.clerkId);
}

export function compareByRevenue(a: ExploreRankable, b: ExploreRankable) {
    const revA = a.totalEarningsCents ?? 0;
    const revB = b.totalEarningsCents ?? 0;
    return revB - revA
        || Number(b.isOnline) - Number(a.isOnline)
        || b.lastActiveTime - a.lastActiveTime
        || a.clerkId.localeCompare(b.clerkId);
}

export function compareByRecentVisits(a: ExploreRankable, b: ExploreRankable) {
    const visitA = getTimeValue(a.lastAccessAt) || a.lastActiveTime;
    const visitB = getTimeValue(b.lastAccessAt) || b.lastActiveTime;
    const accessA = a.accessCount ?? 0;
    const accessB = b.accessCount ?? 0;
    return visitB - visitA
        || accessB - accessA
        || Number(b.isOnline) - Number(a.isOnline)
        || a.clerkId.localeCompare(b.clerkId);
}

export function compareByLastSeen(a: ExploreRankable, b: ExploreRankable) {
    const seenA = getTimeValue(a.lastSeen) || a.lastActiveTime;
    const seenB = getTimeValue(b.lastSeen) || b.lastActiveTime;
    return Number(b.isOnline) - Number(a.isOnline)
        || seenB - seenA
        || b.lastActiveTime - a.lastActiveTime
        || a.clerkId.localeCompare(b.clerkId);
}

/** Ordena as profissionais de acordo com o modo selecionado (manual, faturamento, acessos recentes, último acesso ou algoritmo) */
export function rankExploreUsers<T extends ExploreRankable>(
    users: T[],
    optionsOrLimit: RankExploreOptions | number = EXPLORE_RESULT_LIMIT,
    fallbackLimit?: number
): T[] {
    let mode: ExploreRankingMode = 'algorithm';
    let manualOrder: string[] = [];
    let limit = EXPLORE_RESULT_LIMIT;

    if (typeof optionsOrLimit === 'number') {
        limit = optionsOrLimit;
    } else if (typeof optionsOrLimit === 'object' && optionsOrLimit !== null) {
        mode = optionsOrLimit.mode || 'algorithm';
        manualOrder = optionsOrLimit.manualOrder || [];
        limit = optionsOrLimit.limit ?? (fallbackLimit ?? EXPLORE_RESULT_LIMIT);
    }

    let sorted: T[];

    if (mode === 'manual' && manualOrder.length > 0) {
        const orderMap = new Map<string, number>();
        manualOrder.forEach((id, index) => {
            orderMap.set(id, index);
        });

        sorted = [...users].sort((a, b) => {
            const hasA = orderMap.has(a.clerkId);
            const hasB = orderMap.has(b.clerkId);

            if (hasA && hasB) {
                return (orderMap.get(a.clerkId)!) - (orderMap.get(b.clerkId)!);
            }
            if (hasA) return -1;
            if (hasB) return 1;

            return compareByAlgorithm(a, b);
        });
    } else if (mode === 'revenue') {
        sorted = [...users].sort(compareByRevenue);
    } else if (mode === 'recent_visits') {
        sorted = [...users].sort(compareByRecentVisits);
    } else if (mode === 'last_seen') {
        sorted = [...users].sort(compareByLastSeen);
    } else {
        sorted = [...users].sort(compareByAlgorithm);
    }

    return sorted.slice(0, limit);
}
