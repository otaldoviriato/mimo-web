'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CAMPAIGN_ATTRIBUTION_STORAGE_KEY } from './CampaignVisitTracker';
import { emitCampaignTelemetry } from '@/lib/campaignTelemetry';

export function PublicTrafficTracker() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 1. Garante visitorId estável
        let visitorId = localStorage.getItem('mimo_visitor_id');
        const isNewVisitor = !visitorId;
        if (!visitorId) {
            visitorId = crypto.randomUUID();
            localStorage.setItem('mimo_visitor_id', visitorId);
        }

        // 2. Extrai parâmetros de rastreamento da URL
        const urlParams = new URLSearchParams(window.location.search);
        const utm: Record<string, string> = {};
        urlParams.forEach((val, key) => {
            if (key.toLowerCase().startsWith('utm_') && val) {
                utm[key.toLowerCase()] = val;
            }
        });

        const clickId = urlParams.get('click_id') || urlParams.get('clickId') || undefined;
        const site = urlParams.get('site') || undefined;
        const zone = urlParams.get('zone_id') || urlParams.get('zone') || undefined;
        const creative = urlParams.get('creative') || undefined;
        const variation = urlParams.get('variation_id') || urlParams.get('variation') || utm.utm_content || undefined;

        const hasUtm = Object.keys(utm).length > 0 || Boolean(clickId) || Boolean(zone);
        const existingAttributionStr = localStorage.getItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY);

        // Se tiver UTM na URL ou se for um novo visitante sem atribuição:
        if (hasUtm || (isNewVisitor && !existingAttributionStr)) {
            const currentLanding = typeof window !== 'undefined' ? window.location.pathname : undefined;
            const attribution = {
                visitorId,
                clickId,
                site,
                zone,
                creative,
                variation,
                utm,
                landingPage: currentLanding,
                slug: hasUtm ? (utm.utm_campaign || utm.utm_source || 'utm-traffic') : 'organico',
                capturedAt: new Date().toISOString(),
            };

            localStorage.setItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));

            // Registra a visita no backend (criação automática da campanha ou atribuição a orgânico)
            void fetch('/api/campaigns/visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attribution),
                keepalive: true,
            }).catch(() => {
                // Silencioso em caso de erro de rede
            });
        }

        // 3. Listener global de CTA clicks (Etapa 2 do Funil)
        const recordCta = (event: MouseEvent) => {
            const element = event.target instanceof Element ? event.target.closest('[data-campaign-cta]') : null;
            if (!element) return;

            const storedStr = localStorage.getItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY);
            let currentAttribution = storedStr ? JSON.parse(storedStr) : null;
            if (!currentAttribution) {
                currentAttribution = {
                    visitorId: localStorage.getItem('mimo_visitor_id') || visitorId,
                    landingPage: typeof window !== 'undefined' ? window.location.pathname : undefined,
                    slug: 'organico',
                    utm: {},
                };
            } else if (!currentAttribution.landingPage && typeof window !== 'undefined') {
                currentAttribution.landingPage = window.location.pathname;
            }

            void fetch('/api/campaigns/visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentAttribution, event: 'cta_clicked' }),
                keepalive: true,
            }).catch(() => {});
        };

        document.addEventListener('click', recordCta, { passive: true });
        return () => document.removeEventListener('click', recordCta);
    }, []);

    return null;
}

export function AuthenticatedTrafficSync() {
    const { userId, isSignedIn } = useAuth();
    const syncedUserRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isSignedIn || !userId || typeof window === 'undefined') return;
        if (syncedUserRef.current === userId) return;

        const visitorId = localStorage.getItem('mimo_visitor_id');
        if (!visitorId) return;

        syncedUserRef.current = userId;

        void fetch('/api/campaigns/sync-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId }),
        }).catch(() => {});
    }, [isSignedIn, userId]);

    // Rastreamento de presença em tempo real (online / saiu da página)
    useEffect(() => {
        if (!isSignedIn || !userId || typeof window === 'undefined') return;

        // Heartbeat inicial
        emitCampaignTelemetry({ eventType: 'heartbeat' });

        // Intervalo periódico de presença
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                emitCampaignTelemetry({ eventType: 'heartbeat' });
            }
        }, 25000);

        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                emitCampaignTelemetry({ eventType: 'page_leave' });
            } else if (document.visibilityState === 'visible') {
                emitCampaignTelemetry({ eventType: 'heartbeat' });
            }
        };

        const handlePageHide = () => {
            emitCampaignTelemetry({ eventType: 'page_leave' });
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [isSignedIn, userId]);

    return null;
}

export function GlobalTrafficTracker() {
    return (
        <>
            <PublicTrafficTracker />
        </>
    );
}

