import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingLead, MarketingSettings } from '@/models/Marketing';

export async function GET(request: NextRequest) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;
    const [
        total,
        newLeads,
        approved,
        contacted,
        interested,
        onboarded,
        scoreAggregation,
        topPending,
        settings,
    ] = await Promise.all([
        MarketingLead.countDocuments(),
        MarketingLead.countDocuments({ status: 'new' }),
        MarketingLead.countDocuments({ status: 'approved' }),
        MarketingLead.countDocuments({ status: 'contacted' }),
        MarketingLead.countDocuments({ status: 'interested' }),
        MarketingLead.countDocuments({ status: 'onboarded' }),
        MarketingLead.aggregate([{ $group: { _id: null, average: { $avg: '$aiScore' } } }]),
        MarketingLead.find({ status: { $in: ['new', 'reviewed', 'approved'] } })
            .sort({ aiScore: -1 })
            .limit(5)
            .lean(),
        MarketingSettings.findOne({ key: 'global' }).lean(),
    ]);
    return NextResponse.json({
        success: true,
        metrics: {
            total,
            new: newLeads,
            approved,
            contacted,
            interested,
            onboarded,
            averageScore: scoreAggregation[0]?.average || 0,
        },
        topPending,
        minScoreToHighlight: settings?.minScoreToHighlight ?? 75,
    });
}
