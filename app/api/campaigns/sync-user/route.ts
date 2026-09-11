import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { CampaignUserJourney } from '@/models/CampaignUserJourney';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

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

        // 1. Administrador não entra no funil de campanhas
        const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
        const isAdmin = userId === FALLBACK_ADMIN || settings?.adminClerkIds?.includes(userId);
        if (isAdmin) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Administrador não entra no funil de leads',
            });
        }

        const user = await User.findOne({ clerkId: userId })
            .select('createdAt isProfessional username name photoUrl email')
            .lean();

        // 2. Usuários do tipo profissional NÃO devem aparecer em campanhas
        if (user?.isProfessional) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Perfil do tipo profissional não entra no funil de leads',
            });
        }

        // 3. Localiza a campanha que está atualmente em rastreamento ativo
        const activeCampaign = await Campaign.findOne({ status: 'tracking' }).sort({ startedAt: -1 }).lean();
        if (!activeCampaign) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Nenhuma campanha ativa em rastreamento temporal no momento',
            });
        }

        // 4. Verificação temporal: o usuário DEVE ter concluído cadastro DEPOIS do início da campanha
        const campaignStartedAt = activeCampaign.startedAt ? new Date(activeCampaign.startedAt).getTime() : 0;
        const userCreatedAt = user?.createdAt ? new Date(user.createdAt).getTime() : 0;

        // Se o usuário foi criado antes da campanha iniciar (com tolerância de 15s para diferenças de relógio), é usuário antigo
        if (userCreatedAt > 0 && campaignStartedAt > 0 && userCreatedAt < (campaignStartedAt - 15000)) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Usuário já era cadastrado antes do início desta campanha',
            });
        }

        // 5. Verificação de Ponto de Entrada: o visitante DEVE ter registrado acesso na campanha ativa
        const visit = await CampaignVisit.findOne({
            campaignId: activeCampaign._id,
            visitorId,
        });

        if (!visit) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Visitante não possui acesso registrado no ponto de entrada desta campanha ativa',
            });
        }

        const signupDate = user?.createdAt || new Date();

        // 6. Vincula a visita do visitorId ao userId autenticado de forma pontual
        await CampaignVisit.updateOne(
            { _id: visit._id },
            {
                $set: {
                    userId,
                    signupCompletedAt: signupDate,
                }
            }
        );

        // 7. Cria ou recupera a jornada do usuário na campanha
        let journeyCreated = false;
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

        return NextResponse.json({
            success: true,
            campaignId: activeCampaign._id,
            journeyCreated,
        });
    } catch (error: any) {
        console.error('Erro ao sincronizar usuário de campanha:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
