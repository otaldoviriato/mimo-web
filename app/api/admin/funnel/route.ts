import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { User } from '@/models/User';
import { Message } from '@/models/Message';
import { Transaction } from '@/models/Transaction';

export const dynamic = 'force-dynamic';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function requireAdmin() {
    const { userId } = await auth();
    if (!userId) return null;
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    return userId === FALLBACK_ADMIN || settings?.adminClerkIds?.includes(userId) ? userId : null;
}

export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();
        if (!await requireAdmin()) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaignId');
        const landingPage = searchParams.get('landingPage');
        const minStage = parseInt(searchParams.get('minStage') || '1', 10);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const filter: Record<string, any> = {};

        if (campaignId && campaignId !== 'all') {
            if (mongoose.Types.ObjectId.isValid(campaignId)) {
                filter.campaignId = new mongoose.Types.ObjectId(campaignId);
            }
        }

        if (landingPage && landingPage !== 'all') {
            filter.landingPage = landingPage;
        }

        if (startDate || endDate) {
            const dateFilter: Record<string, Date> = {};
            if (startDate) {
                const sDate = new Date(startDate);
                if (!isNaN(sDate.getTime())) dateFilter.$gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                if (!isNaN(eDate.getTime())) {
                    eDate.setHours(23, 59, 59, 999);
                    dateFilter.$lte = eDate;
                }
            }
            if (Object.keys(dateFilter).length > 0) {
                filter.landingViewedAt = dateFilter;
            }
        }

        // 1. Busca todas as campanhas e landing pages disponíveis para os filtros
        const [allCampaigns, rawLandingPages] = await Promise.all([
            Campaign.find().select('_id name slug network status').sort({ name: 1 }).lean(),
            CampaignVisit.distinct('landingPage').then(list => list.filter(Boolean) as string[])
        ]);

        const landingPagesSet = new Set<string>(rawLandingPages);
        // Garante landing pages conhecidas no set
        landingPagesSet.add('/descubra');
        for (const camp of allCampaigns) {
            if (camp.slug && camp.slug !== 'descubra') {
                landingPagesSet.add(`/c/${camp.slug}`);
            }
        }
        const landingPages = Array.from(landingPagesSet).sort();

        // Exclui perfis do tipo profissional do funil
        const professionalClerkIds = await User.distinct('clerkId', { isProfessional: true });
        if (professionalClerkIds.length > 0) {
            filter.userId = { $nin: professionalClerkIds };
        }

        // 2. Busca visitas filtradas
        const visits = await CampaignVisit.find(filter)
            .sort({ landingViewedAt: -1 })
            .limit(500)
            .populate('campaignId', 'name slug network')
            .lean();

        // 3. Coleta os userIds e professionalIds para batch query
        const userIds = Array.from(new Set(visits.map(v => v.userId).filter(Boolean))) as string[];
        const professionalIds = Array.from(new Set(visits.map(v => v.firstProfileViewedProfessionalId).filter(Boolean))) as string[];
        const allLookupIds = Array.from(new Set([...userIds, ...professionalIds]));

        const usersList = allLookupIds.length > 0
            ? await User.find({ clerkId: { $in: allLookupIds } })
                .select('clerkId name username photoUrl email isProfessional createdAt')
                .lean()
            : [];
        const userMap = new Map(usersList.map(u => [u.clerkId, u]));

        // Filtro estrito: garante que nenhum perfil do tipo profissional entre no funil
        const clientVisits = visits.filter(visit => {
            if (visit.userId) {
                const u = userMap.get(visit.userId);
                if (u?.isProfessional) return false;
            }
            return true;
        });

        // 4. Batch query de resiliência: mensagens enviadas e recebidas
        const validClientUserIds = Array.from(new Set(clientVisits.map(v => v.userId).filter(Boolean))) as string[];
        let sentMessageUsers = new Set<string>();
        let receivedMessageUsers = new Set<string>();
        let rechargesByUser = new Map<string, number>();

        if (validClientUserIds.length > 0) {
            const [sent, received, recharges] = await Promise.all([
                Message.distinct('senderId', { senderId: { $in: validClientUserIds } }),
                Message.distinct('receiverId', { receiverId: { $in: validClientUserIds } }),
                Transaction.find({
                    userId: { $in: validClientUserIds },
                    source: 'recharge',
                    status: { $in: ['COMPLETED', 'PAID'] }
                }).select('userId amount').lean()
            ]);

            sentMessageUsers = new Set(sent);
            receivedMessageUsers = new Set(received);

            for (const r of recharges) {
                const current = rechargesByUser.get(r.userId) || 0;
                rechargesByUser.set(r.userId, current + (r.amount || 0));
            }
        }

        // 5. Processamento dos clientes e cálculo das 7 etapas
        let stage1Count = 0;
        let stage2Count = 0;
        let stage3Count = 0;
        let stage4Count = 0;
        let stage5Count = 0;
        let stage6Count = 0;
        let stage7Count = 0;
        let totalRevenueCents = 0;

        const clients = clientVisits.map(visit => {
            const u = visit.userId ? userMap.get(visit.userId) : null;
            const prof = visit.firstProfileViewedProfessionalId ? userMap.get(visit.firstProfileViewedProfessionalId) : null;

            const hasStage1 = Boolean(visit.landingViewedAt);
            const hasStage2 = Boolean(visit.ctaClickedAt);
            const hasStage3 = Boolean(visit.signupCompletedAt || visit.userId);
            const hasStage4 = Boolean(visit.firstProfileViewedAt || visit.firstProfileViewedProfessionalId);
            const hasStage5 = Boolean(visit.firstMessageSentAt || (visit.userId && sentMessageUsers.has(visit.userId)));
            const hasStage6 = Boolean(visit.firstMessageReceivedAt || (visit.userId && receivedMessageUsers.has(visit.userId)));
            const rechargeAmount = visit.firstRechargeAmountCents ?? (visit.userId ? rechargesByUser.get(visit.userId) : 0) ?? 0;
            const hasStage7 = Boolean(visit.firstRechargeAt || (rechargeAmount > 0));

            if (hasStage1) stage1Count++;
            if (hasStage2) stage2Count++;
            if (hasStage3) stage3Count++;
            if (hasStage4) stage4Count++;
            if (hasStage5) stage5Count++;
            if (hasStage6) stage6Count++;
            if (hasStage7) {
                stage7Count++;
                totalRevenueCents += rechargeAmount;
            }

            const completedStages = [hasStage1, hasStage2, hasStage3, hasStage4, hasStage5, hasStage6, hasStage7];
            const stagesCompleted = completedStages.filter(Boolean).length;
            const progressPercentage = Math.round((stagesCompleted / 7) * 100);

            const campaignData = visit.campaignId as any;
            const inferredLandingPage = visit.landingPage || (campaignData?.slug === 'descubra' ? '/descubra' : (campaignData?.slug ? `/c/${campaignData.slug}` : '/descubra'));

            return {
                visitorId: visit.visitorId,
                userId: visit.userId || null,
                user: u ? {
                    clerkId: u.clerkId,
                    name: u.name,
                    username: u.username,
                    photoUrl: u.photoUrl,
                    email: u.email,
                    createdAt: u.createdAt,
                } : null,
                campaign: {
                    _id: campaignData?._id?.toString(),
                    name: campaignData?.name || 'Desconhecida',
                    slug: campaignData?.slug || 'unknown',
                    network: campaignData?.network || 'other',
                },
                landingPage: inferredLandingPage,
                utm: visit.utm || {},
                clickId: visit.clickId || null,
                stagesCompleted,
                progressPercentage,
                stages: {
                    stage1_landing: {
                        reached: hasStage1,
                        at: visit.landingViewedAt,
                    },
                    stage2_cta: {
                        reached: hasStage2,
                        at: visit.ctaClickedAt,
                    },
                    stage3_signup: {
                        reached: hasStage3,
                        at: visit.signupCompletedAt || u?.createdAt || null,
                    },
                    stage4_profileView: {
                        reached: hasStage4,
                        at: visit.firstProfileViewedAt,
                        professional: prof ? {
                            clerkId: prof.clerkId,
                            name: prof.name,
                            username: prof.username,
                            photoUrl: prof.photoUrl,
                        } : null,
                    },
                    stage5_messageSent: {
                        reached: hasStage5,
                        at: visit.firstMessageSentAt || null,
                    },
                    stage6_messageReceived: {
                        reached: hasStage6,
                        at: visit.firstMessageReceivedAt || null,
                    },
                    stage7_firstRecharge: {
                        reached: hasStage7,
                        at: visit.firstRechargeAt || null,
                        amountCents: rechargeAmount,
                    },
                },
                createdAt: visit.landingViewedAt || visit.createdAt,
            };
        });

        // Filtragem por etapa mínima (para a listagem detalhada de clientes)
        const filteredClients = minStage > 1
            ? clients.filter(c => {
                if (minStage === 2) return c.stages.stage2_cta.reached;
                if (minStage === 3) return c.stages.stage3_signup.reached;
                if (minStage === 4) return c.stages.stage4_profileView.reached;
                if (minStage === 5) return c.stages.stage5_messageSent.reached;
                if (minStage === 6) return c.stages.stage6_messageReceived.reached;
                if (minStage === 7) return c.stages.stage7_firstRecharge.reached;
                return true;
            })
            : clients;

        // 6. Funnel summary data para o gráfico horizontal
        const stageTotals = [
            { id: 1, label: 'Acessou Landing Page', count: stage1Count, key: 'landing' },
            { id: 2, label: 'Clicou no CTA', count: stage2Count, key: 'cta' },
            { id: 3, label: 'Criou uma Conta', count: stage3Count, key: 'signup' },
            { id: 4, label: 'Visitou Perfil no Explorar', count: stage4Count, key: 'profileView' },
            { id: 5, label: 'Enviou Mensagem', count: stage5Count, key: 'messageSent' },
            { id: 6, label: 'Recebeu Mensagem', count: stage6Count, key: 'messageReceived' },
            { id: 7, label: 'Primeira Recarga', count: stage7Count, key: 'firstRecharge' },
        ];

        const funnelSteps = stageTotals.map((step, index) => {
            const prevCount = index === 0 ? step.count : stageTotals[index - 1].count;
            const topConversionRate = stage1Count > 0 ? Number(((step.count / stage1Count) * 100).toFixed(1)) : 0;
            const stepConversionRate = prevCount > 0 ? Number(((step.count / prevCount) * 100).toFixed(1)) : 0;
            const dropoffCount = Math.max(0, prevCount - step.count);
            const dropoffRate = prevCount > 0 ? Number(((dropoffCount / prevCount) * 100).toFixed(1)) : 0;

            return {
                ...step,
                topConversionRate,
                stepConversionRate,
                dropoffCount,
                dropoffRate,
            };
        });

        return NextResponse.json({
            campaigns: allCampaigns,
            landingPages,
            summary: {
                totalLeads: stage1Count,
                totalRevenueCents,
                overallConversionRate: stage1Count > 0 ? Number(((stage7Count / stage1Count) * 100).toFixed(2)) : 0,
                steps: funnelSteps,
            },
            clients: filteredClients,
        });

    } catch (error: any) {
        console.error('Erro na API de funil:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
