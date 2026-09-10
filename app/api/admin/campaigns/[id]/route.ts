import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { CampaignUserJourney } from '@/models/CampaignUserJourney';

export const dynamic = 'force-dynamic';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    return userId === FALLBACK_ADMIN || settings?.adminClerkIds?.includes(userId) ? userId : null;
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    await connectToDatabase();
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await context.params;
    const campaign = await Campaign.findById(id).lean();

    if (!campaign) {
        return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    const uniqueVisits = await CampaignVisit.countDocuments({ campaignId: campaign._id });
    const leads = await CampaignUserJourney.find({ campaignId: campaign._id })
        .sort({ signupAt: -1 })
        .lean();

    return NextResponse.json({
        campaign: {
            ...campaign,
            uniqueVisits: Math.max(campaign.uniqueVisitorsCount || 0, uniqueVisits),
            signupsCount: leads.length,
        },
        leads,
    });
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    await connectToDatabase();
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await context.params;

    await Promise.all([
        CampaignUserJourney.deleteMany({ campaignId: id }),
        CampaignVisit.deleteMany({ campaignId: id }),
        Campaign.findByIdAndDelete(id),
    ]);

    return NextResponse.json({ success: true, message: 'Campanha excluída com sucesso.' });
}
