'use client';

const VISITOR_KEY = 'mimo_analytics_visitor_id';

type PublicEvent = {
    eventType: 'link_viewed' | 'explore_profile_viewed';
    professionalId: string;
    metadata?: Record<string, string>;
};

function getVisitorId() {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, next);
    return next;
}

export function trackAcquisitionEvent(event: PublicEvent) {
    if (typeof window === 'undefined') return;

    const body = JSON.stringify({
        ...event,
        visitorId: getVisitorId(),
    });

    void fetch('/api/acquisition/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
    }).catch(() => undefined);
}

export function recordLinkShared(channel: 'native_share' | 'clipboard' | 'copy_button') {
    if (typeof window === 'undefined') return;
    void fetch('/api/professional-activation/share-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, eventId: crypto.randomUUID() }),
        keepalive: true,
    }).catch(() => undefined);
}
