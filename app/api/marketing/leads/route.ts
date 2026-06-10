import { NextRequest, NextResponse } from 'next/server';
import { boundedNumber, cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingLead, MarketingLeadStatus } from '@/models/Marketing';

const STATUSES: MarketingLeadStatus[] = [
    'new', 'reviewed', 'approved', 'contacted', 'interested', 'onboarded', 'rejected', 'ignored',
];

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;
    const status = request.nextUrl.searchParams.get('status') as MarketingLeadStatus | null;
    const search = cleanString(request.nextUrl.searchParams.get('q'), 100);
    const minScore = boundedNumber(request.nextUrl.searchParams.get('minScore'), 0, 0, 100);
    const sort: Record<string, 1 | -1> = request.nextUrl.searchParams.get('sort') === 'date'
        ? { createdAt: -1 }
        : { aiScore: -1, createdAt: -1 };
    const query: Record<string, unknown> = { aiScore: { $gte: minScore } };
    if (status && STATUSES.includes(status)) query.status = status;
    if (search) query.username = new RegExp(escapeRegex(search), 'i');

    const leads = await MarketingLead.find(query).sort(sort).limit(500).lean();
    return NextResponse.json({ success: true, leads });
}
