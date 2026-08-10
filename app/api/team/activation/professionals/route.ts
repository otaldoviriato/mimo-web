import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ProfessionalActivation } from '@/models/ProfessionalActivation';
import { AppSettings } from '@/models/AppSettings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const currentUser = await User.findOne({ clerkId: userId }).select('clerkId isTeam isProfessional activationLastViewedAt').lean() as any;
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;

        if (!currentUser || (!currentUser.isTeam && !isAdmin)) {
            return NextResponse.json({ error: 'Acesso exclusivo para membros da equipe ou administradores.' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || '';
        const filterStatus = searchParams.get('status') || 'all'; // all, unviewed, pending, contacted, activated, my_assigned

        // Buscar todos os profissionais ordenados do MAIS RECENTE para o MAIS ANTIGO
        let userFilter: any = { isProfessional: true };
        if (query.trim().length > 0) {
            const cleanQuery = query.trim().replace('@', '');
            userFilter.$or = [
                { username: { $regex: new RegExp(cleanQuery, 'i') } },
                { name: { $regex: new RegExp(cleanQuery, 'i') } },
                { email: { $regex: new RegExp(cleanQuery, 'i') } }
            ];
        }

        const professionals = await User.find(userFilter)
            .select('clerkId username name email photoUrl phone city state createdAt onboardingStep professionalStatus identityStatus isOnline lastSeen')
            .sort({ createdAt: -1 })
            .lean() as any[];

        const profIds = professionals.map(p => p.clerkId);

        // Buscar dados de ativação
        const activations = await ProfessionalActivation.find({ professionalId: { $in: profIds } }).lean() as any[];
        const activationMap = new Map(activations.map(a => [a.professionalId, a]));

        // Buscar outros membros da equipe para lista de transferência
        const teamMembersList = await User.find({ isTeam: true })
            .select('clerkId name username photoUrl teamTitle')
            .lean() as any[];

        const lastViewed = currentUser.activationLastViewedAt ? new Date(currentUser.activationLastViewedAt) : new Date(0);

        let unviewedCount = 0;

        const resultList = professionals.map(p => {
            const act = activationMap.get(p.clerkId) || {
                professionalId: p.clerkId,
                assignedTeamMemberId: null,
                assignedTeamMemberName: null,
                status: 'pending',
                stage: 'Aguardando 1º contato',
                notes: '',
                nextSteps: '',
                contactedAt: null,
                activatedAt: null,
                history: []
            };

            const isUnviewed = new Date(p.createdAt) > lastViewed;
            if (isUnviewed) {
                unviewedCount++;
            }

            return {
                ...p,
                activation: act,
                isUnviewed,
            };
        });

        // Aplicação de filtros no resultado
        let filteredList = resultList;
        if (filterStatus === 'unviewed') {
            filteredList = resultList.filter(item => item.isUnviewed);
        } else if (filterStatus === 'pending') {
            filteredList = resultList.filter(item => item.activation.status === 'pending');
        } else if (filterStatus === 'contacted') {
            filteredList = resultList.filter(item => item.activation.status === 'contacted');
        } else if (filterStatus === 'activated') {
            filteredList = resultList.filter(item => item.activation.status === 'activated');
        } else if (filterStatus === 'my_assigned') {
            filteredList = resultList.filter(item => item.activation.assignedTeamMemberId === userId);
        }

        return NextResponse.json({
            professionals: filteredList,
            totalProfessionals: resultList.length,
            unviewedCount,
            teamMembers: teamMembersList.map(tm => ({
                clerkId: tm.clerkId,
                name: tm.name || tm.username,
                username: tm.username,
                photoUrl: tm.photoUrl,
                teamTitle: tm.teamTitle || 'Equipe Mimo',
            }))
        });

    } catch (error: any) {
        console.error('Erro na API de ativação de profissionais:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
