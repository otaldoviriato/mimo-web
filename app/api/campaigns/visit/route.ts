import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug, visitorId, clickId, site, zone, creative, variation, utm, event } = body;

        if (!slug || !visitorId) {
            return NextResponse.json({ error: 'slug e visitorId são obrigatórios' }, { status: 400 });
        }

        await connectToDatabase();

        const campaign = await Campaign.findOne({ slug: slug.toLowerCase() }).lean();
        if (!campaign || campaign.status !== 'active') {
            return NextResponse.json({ error: 'Campanha não encontrada ou inativa' }, { status: 404 });
        }

        // Upsert visit record
        await CampaignVisit.findOneAndUpdate(
            { campaignId: campaign._id, visitorId },
            {
                $setOnInsert: {
                    landingViewedAt: new Date(),
                    clickId: clickId || null,
                    site: site || null,
                    zone: zone || null,
                    creative: creative || null,
                    variation: variation || null,
                    utm: utm || {},
                    targetProfessionalId: campaign.targetProfessionalId || null,
                },
                ...(event === 'cta_clicked' ? { $set: { ctaClickedAt: new Date() } } : {}),
            },
            { upsert: true, new: true },
        );

        let targetProfessional = null;
        if (campaign.targetProfessionalId) {
            targetProfessional = await User.findOne({ clerkId: campaign.targetProfessionalId })
                .select('clerkId username name photoUrl coverUrl bio')
                .lean();
        }

        return NextResponse.json({
            success: true,
            campaign: {
                _id: campaign._id,
                name: campaign.name,
                slug: campaign.slug,
                landingHeadline: campaign.landingHeadline,
                landingBody: campaign.landingBody,
                landingImageUrl: campaign.landingImageUrl,
                internalDestination: campaign.internalDestination,
                targetProfessionalId: campaign.targetProfessionalId,
            },
            targetProfessional,
        });
    } catch (error: any) {
        console.error('Erro ao registrar visita de campanha:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
