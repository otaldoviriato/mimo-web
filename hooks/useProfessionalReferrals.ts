'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '@/hooks/useQueries';

export type ProfessionalReferralsData = {
    sharePath: string | null;
    bonusCents: number;
    thresholdCents: number;
    totalRewardedCents: number;
    referrals: Array<{ id: string; name: string; username: string; photoUrl: string | null; status: 'review' | 'qualifying' | 'processing' | 'rewarded' | 'unavailable'; progressCents: number }>;
};

export function useProfessionalReferrals() {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const [reconciliationFailed, setReconciliationFailed] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const query = useQuery<ProfessionalReferralsData>({
        queryKey: ['professional-referrals', userId], enabled: !!userId,
        queryFn: async () => {
            const response = await fetch('/api/users/me/professional-referrals');
            if (!response.ok) throw new Error('Não foi possível carregar suas indicações.');
            return response.json();
        },
        staleTime: 30_000, refetchInterval: 30_000,
    });
    useEffect(() => {
        if (!userId) return;
        let active = true;
        fetch('/api/users/me/professional-referrals', { method: 'POST' }).then(async response => {
            if (!response.ok) throw new Error();
            const result = await response.json();
            if (!active) return;
            setReconciliationFailed(false);
            await queryClient.invalidateQueries({ queryKey: ['professional-referrals', userId] });
            if (result.credited > 0) {
                await queryClient.invalidateQueries({ queryKey: QueryKeys.me });
                await queryClient.invalidateQueries({ queryKey: ['wallet'] });
            }
        }).catch(() => { if (active) setReconciliationFailed(true); });
        return () => { active = false; };
    }, [userId, queryClient, refresh]);
    return { ...query, reconciliationFailed, reconcile: () => { setRefresh(value => value + 1); void query.refetch(); } };
}
