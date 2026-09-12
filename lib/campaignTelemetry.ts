'use client';

type TelemetryEvent =
    | { eventType: 'explore_scroll'; scrollDepth?: number }
    | { eventType: 'profile_view'; professionalId: string; username?: string; name?: string }
    | { eventType: 'photo_view'; professionalId: string; username?: string; photoIndex: number; totalPhotos: number }
    | { eventType: 'message_click'; professionalId: string; username?: string }
    | { eventType: 'recharge_trigger'; professionalId: string; username?: string; reason?: string }
    | { eventType: 'free_message_sent'; professionalId: string; username?: string; text?: string }
    | { eventType: 'free_intro_exhausted'; professionalId: string; username?: string; totalFree?: number }
    | { eventType: 'paid_message_attempt'; professionalId: string; username?: string; hasBalance: boolean; balanceCents?: number }
    | { eventType: 'hidden_message_unlock_attempt'; professionalId: string; username?: string; costCents?: number; balanceCents?: number }
    | { eventType: 'recharge_modal_opened'; trigger?: string; professionalId?: string; username?: string; requiredCents?: number }
    | { eventType: 'heartbeat' }
    | { eventType: 'page_leave' }
    | { eventType: 'custom'; actionText: string };

import { isStaffSession } from '@/lib/staffSessionClient';

let lastExploreScrollTime = 0;

export function emitCampaignTelemetry(event: TelemetryEvent) {
    if (typeof window === 'undefined' || isStaffSession()) return;

    // Throttling para eventos frequentes como scroll
    if (event.eventType === 'explore_scroll') {
        const now = Date.now();
        if (now - lastExploreScrollTime < 4000) return;
        lastExploreScrollTime = now;
    }

    const payload = JSON.stringify(event);

    // Se estiver saindo da página, tenta navigator.sendBeacon
    if (event.eventType === 'page_leave' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon('/api/campaigns/telemetry', blob);
            return;
        } catch {
            // fallback para fetch
        }
    }

    void fetch('/api/campaigns/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => {
        // Silencioso em caso de falha de rede
    });
}
