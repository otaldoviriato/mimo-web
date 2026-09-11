import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { CampaignUserJourney } from '@/models/CampaignUserJourney';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    return userId === FALLBACK_ADMIN || settings?.adminClerkIds?.includes(userId) ? userId : null;
}

function sanitizeSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export async function GET(request: NextRequest) {
    await connectToDatabase();
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const searchParams = request.nextUrl.searchParams;
    const requestedCampaignId = searchParams.get('campaignId');

    // Se o admin solicitou detalhes e leads de uma campanha específica
    if (requestedCampaignId) {
        const campaign = await Campaign.findById(requestedCampaignId).lean();
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
                uniqueVisits,
                signupsCount: leads.length,
            },
            leads,
        });
    }

    // 1. Busca a campanha que está atualmente em rastreamento ao vivo
    const activeCampaign = await Campaign.findOne({ status: 'tracking' }).sort({ startedAt: -1 }).lean();
    let activeCampaignData = null;

    if (activeCampaign) {
        const activeUniqueVisits = await CampaignVisit.countDocuments({ campaignId: activeCampaign._id });
        const activeLeads = await CampaignUserJourney.find({ campaignId: activeCampaign._id })
            .sort({ signupAt: -1 })
            .limit(300)
            .lean();

        activeCampaignData = {
            ...activeCampaign,
            uniqueVisits: activeUniqueVisits,
            leads: activeLeads,
            signupsCount: activeLeads.length,
        };
    }

    // 2. Busca histórico geral de campanhas
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();

    // Agregação de acessos únicos e cadastros por campanha
    const visitsCounts = await CampaignVisit.aggregate([
        { $group: {
            _id: '$campaignId',
            uniqueVisits: { $sum: 1 },
            signups: { $sum: { $cond: [{ $ne: ['$signupCompletedAt', null] }, 1, 0] } },
        } },
    ]);
    const visitsMap = new Map(visitsCounts.map(row => [row._id.toString(), row]));

    // Agregação de leads por campanha em CampaignUserJourney
    const journeysCounts = await CampaignUserJourney.aggregate([
        { $group: {
            _id: '$campaignId',
            journeyLeadsCount: { $sum: 1 },
        } },
    ]);
    const journeysMap = new Map(journeysCounts.map(row => [row._id.toString(), row.journeyLeadsCount]));

    const formattedCampaigns = campaigns.map(c => {
        const vStats = visitsMap.get(c._id.toString());
        const jCount = journeysMap.get(c._id.toString()) || 0;
        const uniqueVisits = vStats?.uniqueVisits ?? (c.uniqueVisitorsCount || 0);
        const signups = Math.max(jCount, vStats?.signups ?? 0);

        const impressions = c.externalImpressions || 0;
        const clicks = c.externalClicks || 0;
        const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
        const conversionRate = uniqueVisits > 0 ? Number(((signups / uniqueVisits) * 100).toFixed(2)) : 0;

        return {
            ...c,
            uniqueVisits,
            signups,
            impressions,
            clicks,
            ctr,
            conversionRate,
        };
    });

    return NextResponse.json({
        activeCampaign: activeCampaignData,
        campaigns: formattedCampaigns,
        summary: {
            totalCampaigns: campaigns.length,
            activeCount: activeCampaign ? 1 : 0,
            completedCount: campaigns.filter(c => c.status === 'completed').length,
        }
    });
}

export async function POST(request: NextRequest) {
    await connectToDatabase();
    const userId = await requireAdmin();
    if (!userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const name = String(body.name || '').trim();
    let entryPoint = String(body.entryPoint || '/descubra').trim();
    if (!entryPoint.startsWith('/')) entryPoint = `/${entryPoint}`;

    const description = body.description ? String(body.description).trim() : null;

    if (!name) {
        return NextResponse.json({ error: 'Nome da campanha é obrigatório.' }, { status: 400 });
    }

    const baseSlug = sanitizeSlug(name) || 'campanha';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const campaign = await Campaign.create({
        name,
        slug,
        entryPoint,
        description,
        status: 'draft',
        network: body.network || 'exoclick',
        uniqueVisitorsCount: 0,
        createdBy: userId,
    });

    return NextResponse.json({ success: true, campaign }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
    await connectToDatabase();
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { id, action } = body;

    if (!id) {
        return NextResponse.json({ error: 'ID da campanha é obrigatório' }, { status: 400 });
    }

    if (action === 'start_tracking') {
        const now = new Date();
        // Se houver qualquer outra campanha em tracking, encerra
        await Campaign.updateMany(
            { status: 'tracking', _id: { $ne: id } },
            { $set: { status: 'completed', endedAt: now } }
        );

        const campaign = await Campaign.findByIdAndUpdate(
            id,
            {
                $set: {
                    status: 'tracking',
                    startedAt: now,
                    endedAt: null,
                }
            },
            { new: true }
        );
        return NextResponse.json({ success: true, campaign });
    }

    if (action === 'stop_tracking') {
        const now = new Date();
        const impressions = Number(body.externalImpressions) || 0;
        const clicks = Number(body.externalClicks) || 0;

        const campaign = await Campaign.findByIdAndUpdate(
            id,
            {
                $set: {
                    status: 'completed',
                    endedAt: now,
                    externalImpressions: impressions,
                    externalClicks: clicks,
                }
            },
            { new: true }
        );
        return NextResponse.json({ success: true, campaign });
    }

    if (action === 'edit' || action === 'update_campaign') {
        const updateData: any = {};
        if (body.name) updateData.name = String(body.name).trim();
        if (body.entryPoint) {
            let ep = String(body.entryPoint).trim();
            if (!ep.startsWith('/')) ep = `/${ep}`;
            updateData.entryPoint = ep;
        }
        if (body.description !== undefined) {
            updateData.description = body.description ? String(body.description).trim() : null;
        }
        if (body.externalImpressions !== undefined) {
            updateData.externalImpressions = Math.max(0, Number(body.externalImpressions) || 0);
        }
        if (body.externalClicks !== undefined) {
            updateData.externalClicks = Math.max(0, Number(body.externalClicks) || 0);
        }
        if (body.status && ['draft', 'tracking', 'completed', 'archived', 'active', 'paused'].includes(body.status)) {
            updateData.status = body.status;
            if (body.status === 'tracking' && !body.startedAt) {
                updateData.startedAt = new Date();
                updateData.endedAt = null;
            }
        }

        const campaign = await Campaign.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );
        return NextResponse.json({ success: true, campaign });
    }

    if (action === 'update_metrics') {
        const impressions = Number(body.externalImpressions) || 0;
        const clicks = Number(body.externalClicks) || 0;

        const campaign = await Campaign.findByIdAndUpdate(
            id,
            {
                $set: {
                    externalImpressions: impressions,
                    externalClicks: clicks,
                }
            },
            { new: true }
        );
        return NextResponse.json({ success: true, campaign });
    }

    if (body.status) {
        const campaign = await Campaign.findByIdAndUpdate(
            id,
            { $set: { status: body.status } },
            { new: true }
        );
        return NextResponse.json({ success: true, campaign });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
    await connectToDatabase();
    if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const searchParams = request.nextUrl.searchParams;
    let id = searchParams.get('id');

    if (!id) {
        const body = await request.json().catch(() => ({}));
        id = body.id;
    }

    if (!id) {
        return NextResponse.json({ error: 'ID da campanha é obrigatório para exclusão' }, { status: 400 });
    }

    // Exclui a campanha e seus registros filhos (leads de jornada e visitas)
    await Promise.all([
        CampaignUserJourney.deleteMany({ campaignId: id }),
        CampaignVisit.deleteMany({ campaignId: id }),
        Campaign.findByIdAndDelete(id),
    ]);

    return NextResponse.json({ success: true, message: 'Campanha e métricas excluídas com sucesso.' });
}
