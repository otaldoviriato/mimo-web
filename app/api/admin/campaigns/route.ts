import { auth, clerkClient } from '@clerk/nextjs/server';
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

async function enrichLeadsWithUserData(leads: any[]) {
    if (!leads || leads.length === 0) return leads;

    const userIds = leads.map(l => l.userId).filter(Boolean);
    if (userIds.length === 0) return leads;

    const dbUsers = await User.find({ clerkId: { $in: userIds } })
        .select('clerkId name username photoUrl email')
        .lean();
    const userMap = new Map(dbUsers.map(u => [u.clerkId, u]));

    let clerkClientInstance: any = null;

    const enriched = await Promise.all(leads.map(async (lead) => {
        const u = userMap.get(lead.userId);
        let name = u?.name || lead.userInfo?.name || null;
        let username = u?.username || lead.userInfo?.username || null;
        let photoUrl = u?.photoUrl || lead.userInfo?.photoUrl || null;
        let email = u?.email || lead.userInfo?.email || null;

        // Se o nome está genérico ou vazio, busca direto no Clerk
        if (!name || name === 'usuario' || !username || username === 'usuario') {
            try {
                if (!clerkClientInstance) {
                    clerkClientInstance = await clerkClient();
                }
                const clerkUser = await clerkClientInstance.users.getUser(lead.userId);
                if (clerkUser) {
                    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim();
                    if (fullName) name = fullName;
                    if (clerkUser.username) username = clerkUser.username;
                    if (clerkUser.imageUrl) photoUrl = clerkUser.imageUrl;
                    if (clerkUser.emailAddresses?.[0]?.emailAddress) email = clerkUser.emailAddresses[0].emailAddress;
                }
            } catch {
                // Silencioso se usuário não for encontrado no Clerk
            }
        }

        if (!name && username && username !== 'usuario') {
            name = username;
        } else if (!name) {
            name = 'Novo Usuário';
        }

        if (!username || username === 'usuario') {
            username = email ? email.split('@')[0] : `user_${String(lead.userId).slice(-5)}`;
        }

        // Atualiza pontualmente no MongoDB para que o dado fique permanentemente salvo
        if (name !== lead.userInfo?.name || username !== lead.userInfo?.username || photoUrl !== lead.userInfo?.photoUrl) {
            void CampaignUserJourney.updateOne(
                { _id: lead._id },
                {
                    $set: {
                        'userInfo.name': name,
                        'userInfo.username': username,
                        'userInfo.photoUrl': photoUrl,
                        'userInfo.email': email,
                    }
                }
            ).catch(() => {});
        }

        return {
            ...lead,
            userInfo: {
                name,
                username,
                photoUrl,
                email,
            }
        };
    }));

    return enriched;
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
        const rawLeads = await CampaignUserJourney.find({ campaignId: campaign._id })
            .sort({ signupAt: -1 })
            .lean();
        const leads = await enrichLeadsWithUserData(rawLeads);

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
        // Higieniza registros inválidos que possam ter sido vinculados indevidamente à campanha em tracking:
        // 1. Leads cujo signupAt seja anterior ao início da campanha (usuários antigos pré-existentes)
        if (activeCampaign.startedAt) {
            const minAllowedDate = new Date(new Date(activeCampaign.startedAt).getTime() - 15000);
            await CampaignUserJourney.deleteMany({
                campaignId: activeCampaign._id,
                signupAt: { $lt: minAllowedDate },
            });
        }

        // 2. Leads que não possuem visita correspondente no ponto de entrada desta campanha
        const validVisits = await CampaignVisit.find({ campaignId: activeCampaign._id }).select('visitorId userId').lean();
        const validVisitorIds = new Set(validVisits.map(v => v.visitorId).filter(Boolean));
        const validUserIds = new Set(validVisits.map(v => v.userId).filter(Boolean));

        const activeJourneys = await CampaignUserJourney.find({ campaignId: activeCampaign._id }).select('_id userId visitorId').lean();
        const invalidJourneyIds = activeJourneys
            .filter(j => (!j.visitorId || !validVisitorIds.has(j.visitorId)) && (!j.userId || !validUserIds.has(j.userId)))
            .map(j => j._id);

        if (invalidJourneyIds.length > 0) {
            await CampaignUserJourney.deleteMany({ _id: { $in: invalidJourneyIds } });
        }

        const activeUniqueVisits = await CampaignVisit.countDocuments({ campaignId: activeCampaign._id });
        const rawActiveLeads = await CampaignUserJourney.find({ campaignId: activeCampaign._id })
            .sort({ signupAt: -1 })
            .limit(300)
            .lean();
        const activeLeads = await enrichLeadsWithUserData(rawActiveLeads);

        activeCampaignData = {
            ...activeCampaign,
            uniqueVisits: activeUniqueVisits,
            leads: activeLeads,
            signupsCount: activeLeads.length,
        };
    }

    // 2. Exclui e limpa quaisquer campanhas que tenham sido geradas automaticamente pelo antigo fallback
    const autoCampaigns = await Campaign.find({
        $or: [
            { createdBy: 'system_auto_landing' },
            { name: { $regex: /^Ponto de Entrada: \//i } }
        ]
    }).select('_id').lean();

    if (autoCampaigns.length > 0) {
        const autoIds = autoCampaigns.map(c => c._id);
        await Promise.all([
            CampaignUserJourney.deleteMany({ campaignId: { $in: autoIds } }),
            CampaignVisit.deleteMany({ campaignId: { $in: autoIds } }),
            Campaign.deleteMany({ _id: { $in: autoIds } }),
        ]);
    }

    // 3. Busca histórico geral SOMENTE de campanhas cadastradas manualmente
    const campaigns = await Campaign.find({
        createdBy: { $ne: 'system_auto_landing' },
        name: { $not: /^Ponto de Entrada: \//i }
    }).sort({ createdAt: -1 }).lean();

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
    const leadId = searchParams.get('leadId');

    let body: any = {};
    if (!id && !leadId) {
        body = await request.json().catch(() => ({}));
        id = body.id;
    }

    const effectiveLeadId = leadId || body.leadId;
    if (effectiveLeadId) {
        await CampaignUserJourney.findByIdAndDelete(effectiveLeadId);
        return NextResponse.json({ success: true, message: 'Lead removido com sucesso.' });
    }

    if (!id) {
        return NextResponse.json({ error: 'ID da campanha ou leadId é obrigatório para exclusão' }, { status: 400 });
    }

    // Exclui a campanha e seus registros filhos (leads de jornada e visitas)
    await Promise.all([
        CampaignUserJourney.deleteMany({ campaignId: id }),
        CampaignVisit.deleteMany({ campaignId: id }),
        Campaign.findByIdAndDelete(id),
    ]);

    return NextResponse.json({ success: true, message: 'Campanha e métricas excluídas com sucesso.' });
}
