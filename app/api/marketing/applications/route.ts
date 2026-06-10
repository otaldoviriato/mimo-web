import { NextRequest, NextResponse } from 'next/server';
import { cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import { CreatorApplication, CreatorApplicationStatus } from '@/models/CreatorApplication';

const STATUSES: CreatorApplicationStatus[] = ['pending', 'contacted', 'approved', 'rejected'];

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;
    const status = request.nextUrl.searchParams.get('status') as CreatorApplicationStatus | null;
    const search = cleanString(request.nextUrl.searchParams.get('q'), 100);
    const query: Record<string, unknown> = {};
    if (status && STATUSES.includes(status)) query.status = status;
    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        query.$or = [{ fullName: regex }, { artisticName: regex }, { instagram: regex }];
    }
    const applications = await CreatorApplication.find(query).sort({ createdAt: -1 }).limit(500).lean();
    return NextResponse.json({ success: true, applications });
}
