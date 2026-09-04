'use client';

import { useEffect } from 'react';

export const CAMPAIGN_ATTRIBUTION_STORAGE_KEY = 'mimo_campaign_attribution';

type Props = {
    slug: string;
    clickId?: string;
    site?: string;
    zone?: string;
    creative?: string;
    variation?: string;
    utm: Record<string, string>;
};

export function CampaignVisitTracker(props: Props) {
    const { slug, clickId, site, zone, creative, variation, utm } = props;
    const serializedUtm = JSON.stringify(utm);
    useEffect(() => {
        const existing = localStorage.getItem('mimo_visitor_id');
        const visitorId = existing || crypto.randomUUID();
        if (!existing) localStorage.setItem('mimo_visitor_id', visitorId);

        const attribution = { slug, clickId, site, zone, creative, variation, utm: JSON.parse(serializedUtm), visitorId, capturedAt: new Date().toISOString() };
        localStorage.setItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));

        void fetch('/api/campaigns/visit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attribution),
            keepalive: true,
        });

        const recordCta = (event: MouseEvent) => {
            const element = event.target instanceof Element ? event.target.closest('[data-campaign-cta]') : null;
            if (!element) return;
            void fetch('/api/campaigns/visit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...attribution, event: 'cta_clicked' }),
                keepalive: true,
            });
        };
        document.addEventListener('click', recordCta);
        return () => document.removeEventListener('click', recordCta);
    }, [clickId, creative, serializedUtm, site, slug, variation, zone]);

    return null;
}
