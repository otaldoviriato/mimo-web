import { NextRequest, NextResponse } from 'next/server';
import { compatibilityFromScore } from '@/lib/marketing/compatibility';
import { requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingContactStatus, MarketingLead } from '@/models/Marketing';

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

    const records = await MarketingLead.find().sort({ createdAt: -1 }).limit(1000).lean();
    const leads = records.map(lead => ({
        ...lead,
        aiCompatibility: lead.aiCompatibility || compatibilityFromScore(lead.aiScore),
        contactStatus: lead.contactStatus || legacyContactStatus(lead.status),
    }));
    const compatibilityOrder = ['excellent', 'very_promising', 'promising', 'low_fit', 'incompatible'];
    const countContact = (status: MarketingContactStatus) => leads.filter(lead => lead.contactStatus === status).length;
    const topPending = leads
        .filter(lead => lead.contactStatus === 'not_contacted')
        .sort((a, b) => compatibilityOrder.indexOf(a.aiCompatibility) - compatibilityOrder.indexOf(b.aiCompatibility))
        .slice(0, 5);

    return NextResponse.json({
        success: true,
        metrics: {
            total: leads.length,
            notContacted: countContact('not_contacted'),
            noReply: countContact('contacted_no_reply'),
            interested: countContact('replied_interested'),
            notInterested: countContact('replied_not_interested'),
            becameUser: countContact('became_user'),
        },
        compatibilityCounts: Object.fromEntries(compatibilityOrder.map(level => [
            level,
            leads.filter(lead => lead.aiCompatibility === level).length,
        ])),
        topPending,
    });
}
