import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { CampaignUserJourney } from '@/models/CampaignUserJourney';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const body = await request.json();
        const visitorId = String(body.visitorId || '').trim();

        if (!visitorId) {
            return NextResponse.json({ error: 'visitorId é obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId })
            .select('createdAt isProfessional username name photoUrl email')
            .lean();

        // Usuários do tipo profissional NÃO devem aparecer em campanhas
        if (user?.isProfessional) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Perfil do tipo profissional não entra no funil de leads',
            });
        }

        // Vincula a visita do visitorId ao userId autenticado e marca cadastro se ainda não marcado
        const signupDate = user?.createdAt || new Date();

        const result = await CampaignVisit.updateMany(
            { visitorId, $or: [{ userId: null }, { userId: '' }, { userId: { $exists: false } }] },
            {
                $set: {
                    userId,
                    signupCompletedAt: signupDate,
                }
            }
        );

        // Identifica campanha associada: primeiro tenta a campanha em tracking ativo;
        // caso contrário, pega a campanha mais recente desse visitorId
        let activeCampaign = await Campaign.findOne({ status: 'tracking' }).sort({ startedAt: -1 });
        if (!activeCampaign) {
            const recentVisit = await CampaignVisit.findOne({ visitorId }).sort({ landingViewedAt: -1 }).select('campaignId').lean();
            if (recentVisit?.campaignId) {
                activeCampaign = await Campaign.findById(recentVisit.campaignId);
            }
        }

        let journeyCreated = false;
        if (activeCampaign) {
            const existingJourney = await CampaignUserJourney.findOne({
                campaignId: activeCampaign._id,
                userId,
            }).select('_id').lean();

            if (!existingJourney) {
                await CampaignUserJourney.create({
                    campaignId: activeCampaign._id,
                    userId,
                    visitorId,
                    userInfo: {
                        username: user?.username || 'usuario',
                        name: user?.name || null,
                        photoUrl: user?.photoUrl || null,
                        email: user?.email || null,
                    },
                    signupAt: signupDate,
                    isOnline: true,
                    lastActiveAt: new Date(),
                    lastAction: 'Cadastro concluído na plataforma',
                    hasScrolledExplore: false,
                    profilesVisitedCount: 0,
                    profilesVisited: [],
                    timeline: [{
                        type: 'signup',
                        title: 'Cadastro concluído',
                        detail: 'Usuário finalizou o cadastro e entrou no aplicativo',
                        timestamp: signupDate,
                    }],
                });
                journeyCreated = true;
            }
        }

        return NextResponse.json({
            success: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            campaignId: activeCampaign?._id || null,
            journeyCreated,
        });
    } catch (error: any) {
        console.error('Erro ao sincronizar usuário de campanha:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
