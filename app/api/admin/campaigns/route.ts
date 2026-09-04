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
    return NextResponse.json({ campaigns: campaigns.map(campaign => ({
        ...campaign,
        visits: byId.get(campaign._id.toString())?.visits ?? 0,
        ctaClicks: byId.get(campaign._id.toString())?.ctaClicks ?? 0,
        signups: byId.get(campaign._id.toString())?.signups ?? 0,
        recharges: byId.get(campaign._id.toString())?.recharges ?? 0,
        paidChatStarts: byId.get(campaign._id.toString())?.paidChatStarts ?? 0,
        rechargeRevenueCents: byId.get(campaign._id.toString())?.rechargeRevenueCents ?? 0,
    })) });
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
