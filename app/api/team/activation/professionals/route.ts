import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ProfessionalActivation } from '@/models/ProfessionalActivation';
import { AppSettings } from '@/models/AppSettings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

type CurrentUserRow = {
    clerkId: string;
    isTeam?: boolean;
    activationLastViewedAt?: Date | string | null;
};

type ProfessionalRow = {
    clerkId: string;
    username?: string;
    name?: string;
    email?: string;
    photoUrl?: string;
    createdAt: Date | string;
};

type ActivationRow = {
    professionalId: string;
    assignedTeamMemberId?: string | null;
    assignedTeamMemberName?: string | null;
    status?: 'pending' | 'contacted' | 'activated' | 'not_interested';
    contactedAt?: Date | string | null;
};

type TeamMemberRow = {
    clerkId: string;
    name?: string;
    username?: string;
    photoUrl?: string;
    teamTitle?: string;
};

type UserFilter = {
    isProfessional: boolean;
    $or?: Array<Record<string, { $regex: RegExp }>>;
};

function hasTeamContact(activation?: ActivationRow) {
    return activation?.status === 'contacted'
        || activation?.status === 'activated'
        || Boolean(activation?.contactedAt);
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const currentUser = await User.findOne({ clerkId: userId })
            .select('clerkId isTeam activationLastViewedAt')
            .lean() as CurrentUserRow | null;
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;

        if (!currentUser || (!currentUser.isTeam && !isAdmin)) {
            return NextResponse.json({ error: 'Acesso exclusivo para membros da equipe ou administradores.' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || '';
        const filterStatus = searchParams.get('status') || 'all';

        const userFilter: UserFilter = { isProfessional: true };
        if (query.trim().length > 0) {
            const cleanQuery = query.trim().replace('@', '');
            userFilter.$or = [
                { username: { $regex: new RegExp(cleanQuery, 'i') } },
                { name: { $regex: new RegExp(cleanQuery, 'i') } },
                { email: { $regex: new RegExp(cleanQuery, 'i') } },
            ];
        }

        const professionals = await User.find(userFilter)
            .select('clerkId username name email photoUrl createdAt')
            .sort({ createdAt: -1 })
            .lean() as ProfessionalRow[];

        const profIds = professionals.map(p => p.clerkId);
        const activations = await ProfessionalActivation.find({ professionalId: { $in: profIds } })
            .select('professionalId assignedTeamMemberId assignedTeamMemberName status contactedAt')
            .lean() as ActivationRow[];
        const activationMap = new Map(activations.map(a => [a.professionalId, a]));

        const teamMembersList = await User.find({ isTeam: true })
            .select('clerkId name username photoUrl teamTitle')
            .lean() as TeamMemberRow[];

        const lastViewed = currentUser.activationLastViewedAt ? new Date(currentUser.activationLastViewedAt) : new Date(0);
        let unviewedCount = 0;

        const resultList = professionals.map(professional => {
            const activation = activationMap.get(professional.clerkId) || {
                professionalId: professional.clerkId,
                assignedTeamMemberId: null,
                assignedTeamMemberName: null,
                status: 'pending' as const,
                contactedAt: null,
            };
            const isUnviewed = new Date(professional.createdAt) > lastViewed;
            if (isUnviewed) unviewedCount++;

            return {
                clerkId: professional.clerkId,
                username: professional.username,
                name: professional.name,
                photoUrl: professional.photoUrl,
                createdAt: professional.createdAt,
                activation,
                isUnviewed,
            };
        });

        let filteredList = resultList;
        if (filterStatus === 'unviewed') {
            filteredList = resultList.filter(item => item.isUnviewed);
        } else if (filterStatus === 'pending') {
            filteredList = resultList.filter(item => !hasTeamContact(item.activation));
        } else if (filterStatus === 'contacted') {
            filteredList = resultList.filter(item => hasTeamContact(item.activation));
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
            })),
        });
    } catch (error: unknown) {
        console.error('Erro na API de ativacao de profissionais:', error);
        const message = error instanceof Error ? error.message : 'Erro interno do servidor';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
