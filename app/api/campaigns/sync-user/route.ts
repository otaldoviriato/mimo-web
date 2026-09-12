import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { CampaignUserJourney } from '@/models/CampaignUserJourney';
import { User } from '@/models/User';
import { isStaffOrAdmin } from '@/lib/internalStaff';

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

        // 1. Administrador e membros da equipe não entram no funil de campanhas
        if (await isStaffOrAdmin(userId)) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Administrador ou membro da equipe não entra no funil de leads',
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

        let name = user?.name || null;
        let username = user?.username || null;
        let photoUrl = user?.photoUrl || null;
        let email = user?.email || null;

        // Se o documento no banco ainda não foi populado pelo webhook ou não tem nome, consulta o Clerk diretamente
        if (!name || !username || username === 'usuario') {
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(userId);
                if (clerkUser) {
                    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim();
                    if (fullName) name = fullName;
                    if (!username && clerkUser.username) username = clerkUser.username;
                    if (!email && clerkUser.emailAddresses?.[0]?.emailAddress) {
                        email = clerkUser.emailAddresses[0].emailAddress;
                    }
                    if (!photoUrl && clerkUser.imageUrl) photoUrl = clerkUser.imageUrl;
                }
            } catch (err) {
                console.warn('Aviso: falha ao buscar dados no Clerk para sync-user:', err);
            }
        }

        // Se ainda não houver username definido, deriva do email ou do id
        if (!username || username === 'usuario') {
            if (email && email.includes('@')) {
                username = email.split('@')[0];
            } else if (name) {
                username = name.toLowerCase().replace(/\s+/g, '');
            } else {
                username = `usuario_${userId.slice(-5)}`;
            }
        }

        // Se ainda não houver nome, usa o username
        if (!name) {
            name = username;
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
        }).select('_id userInfo').lean();

        if (!existingJourney) {
            await CampaignUserJourney.create({
                campaignId: activeCampaign._id,
                userId,
                visitorId,
                userInfo: {
                    username,
                    name,
                    photoUrl,
                    email,
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
        } else if (name && (!existingJourney.userInfo?.name || existingJourney.userInfo?.username === 'usuario')) {
            // Atualiza o nome real se anteriormente estava genérico
            await CampaignUserJourney.updateOne(
                { _id: existingJourney._id },
                {
                    $set: {
                        'userInfo.name': name,
                        'userInfo.username': username,
                        'userInfo.photoUrl': photoUrl,
                        'userInfo.email': email,
                    }
                }
            );
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
