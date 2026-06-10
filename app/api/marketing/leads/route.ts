import { NextRequest, NextResponse } from 'next/server';
import {
    compatibilityFromScore,
    compatibilityRank,
    MARKETING_COMPATIBILITY_LEVELS,
} from '@/lib/marketing/compatibility';
import { cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import {
    MarketingCompatibilityLevel,
    MarketingContactStatus,
    MarketingLead,
} from '@/models/Marketing';

const CONTACT_STATUSES: MarketingContactStatus[] = [
    'not_contacted',
    'contacted_no_reply',
    'replied_interested',
    'replied_not_interested',
    'became_user',
];

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function legacyContactStatus(status: string | undefined): MarketingContactStatus {
    if (status === 'contacted') return 'contacted_no_reply';
    if (status === 'interested') return 'replied_interested';
    if (status === 'onboarded') return 'became_user';
    if (status === 'rejected' || status === 'ignored') return 'replied_not_interested';
    return 'not_contacted';
}

export async function GET(request: NextRequest) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;

    const contactStatus = request.nextUrl.searchParams.get('contactStatus') as MarketingContactStatus | null;
    const compatibility = request.nextUrl.searchParams.get('compatibility') as MarketingCompatibilityLevel | null;
    const search = cleanString(request.nextUrl.searchParams.get('q'), 100);
    const sort = request.nextUrl.searchParams.get('sort') === 'date' ? 'date' : 'compatibility';
    const query: Record<string, unknown> = {};

    if (contactStatus && CONTACT_STATUSES.includes(contactStatus)) query.contactStatus = contactStatus;
    if (compatibility && MARKETING_COMPATIBILITY_LEVELS.includes(compatibility)) {
        query.aiCompatibility = compatibility;
    }
    if (search) query.username = new RegExp(escapeRegex(search), 'i');

    const records = await MarketingLead.find(query).sort({ createdAt: -1 }).limit(500).lean();
    const leads = records.map(lead => ({
        ...lead,
        aiCompatibility: lead.aiCompatibility || compatibilityFromScore(lead.aiScore),
        contactStatus: lead.contactStatus || legacyContactStatus(lead.status),
        contactResponse: lead.contactResponse || '',
    }));

    if (sort === 'compatibility') {
        leads.sort((a, b) => (
            compatibilityRank(b.aiCompatibility) - compatibilityRank(a.aiCompatibility)
            || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
    }

    return NextResponse.json({ success: true, leads });
}
