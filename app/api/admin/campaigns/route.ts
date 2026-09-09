import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    return userId === FALLBACK_ADMIN || settings?.adminClerkIds?.includes(userId) ? userId : null;
}

export async function GET() {
    await connectToDatabase();
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    const counts = await CampaignVisit.aggregate([
        { $group: {
            _id: '$campaignId',
            visits: { $sum: 1 },
            ctaClicks: { $sum: { $cond: [{ $ne: ['$ctaClickedAt', null] }, 1, 0] } },
            signups: { $sum: { $cond: [{ $ne: ['$signupCompletedAt', null] }, 1, 0] } },
            recharges: { $sum: { $cond: [{ $ne: ['$firstRechargeAt', null] }, 1, 0] } },
            paidChatStarts: { $sum: { $cond: [{ $ne: ['$firstPaidMessageAt', null] }, 1, 0] } },
            rechargeRevenueCents: { $sum: { $ifNull: ['$firstRechargeAmountCents', 0] } },
        } },
    ]);
    const byId = new Map(counts.map(row => [row._id.toString(), row]));

    let totalVisits = 0;
    let totalCtaClicks = 0;
    let totalSignups = 0;
    let totalRecharges = 0;
    let totalRevenueCents = 0;

    const formattedCampaigns = campaigns.map(campaign => {
        const stats = byId.get(campaign._id.toString());
        const visits = stats?.visits ?? 0;
        const ctaClicks = stats?.ctaClicks ?? 0;
        const signups = stats?.signups ?? 0;
        const recharges = stats?.recharges ?? 0;
        const paidChatStarts = stats?.paidChatStarts ?? 0;
        const rechargeRevenueCents = stats?.rechargeRevenueCents ?? 0;

        totalVisits += visits;
        totalCtaClicks += ctaClicks;
        totalSignups += signups;
        totalRecharges += recharges;
        totalRevenueCents += rechargeRevenueCents;

        const ctaRate = visits > 0 ? ((ctaClicks / visits) * 100) : 0;
        const signupRate = visits > 0 ? ((signups / visits) * 100) : 0;
        const rechargeRate = visits > 0 ? ((recharges / visits) * 100) : 0;

        return {
            ...campaign,
            visits,
            ctaClicks,
            signups,
            recharges,
            paidChatStarts,
            rechargeRevenueCents,
            ctaRate: Number(ctaRate.toFixed(1)),
            signupRate: Number(signupRate.toFixed(1)),
            rechargeRate: Number(rechargeRate.toFixed(1)),
        };
    });

    return NextResponse.json({
        campaigns: formattedCampaigns,
        summary: {
            totalCampaigns: campaigns.length,
            activeCampaigns: campaigns.filter(c => c.status === 'active').length,
            totalVisits,
            totalCtaClicks,
            totalSignups,
            totalRecharges,
            totalRevenueCents,
            overallConversionRate: totalVisits > 0 ? Number(((totalRecharges / totalVisits) * 100).toFixed(2)) : 0,
        }
    });
}

export async function POST(request: NextRequest) {
    await connectToDatabase();
    const userId = await requireAdmin();
    if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await request.json();
    const slug = String(body.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!body.name || !slug || !body.landingHeadline || !body.landingBody) {
        return NextResponse.json({ error: 'Nome, slug, título e texto são obrigatórios.' }, { status: 400 });
    }
    const campaign = await Campaign.create({
        name: String(body.name).trim(), slug, status: 'draft', network: body.network ?? 'exoclick',
        targetProfessionalId: body.targetProfessionalId || null,
        landingHeadline: String(body.landingHeadline).trim(), landingBody: String(body.landingBody).trim(),
        landingImageUrl: body.landingImageUrl || null, internalDestination: body.internalDestination || null,
        externalCampaignId: body.externalCampaignId || null, externalVariationId: body.externalVariationId || null,
        conversionGoals: ['landing_view', 'cta_click', 'signup', 'first_recharge', 'first_paid_message'],
        createdBy: userId,
    });
    return NextResponse.json({ campaign }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
    await connectToDatabase();
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id, status } = await request.json();
    if (!id || !['draft', 'active', 'paused', 'archived'].includes(status)) {
        return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }
    const campaign = await Campaign.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    return NextResponse.json({ campaign });
}
