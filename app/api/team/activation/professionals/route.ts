import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ProfessionalActivation } from '@/models/ProfessionalActivation';
import { AppSettings } from '@/models/AppSettings';
import { Room } from '@/models/Room';
import { WithdrawRequest } from '@/models/WithdrawRequest';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

const STAGE_REGISTERED = 'Profissional cadastrada';
const STAGE_SHARE_ATTEMPTED = 'Tentou compartilhar o perfil';
const STAGE_BROUGHT_USER = 'Trouxe um usuário';
const STAGE_FIRST_CLIENT = 'Conseguiu o primeiro cliente';
const STAGE_FREQUENT = 'Profissional frequente';

type CurrentUserRow = {
    clerkId: string;
    isTeam?: boolean;
    isProfessional?: boolean;
    activationLastViewedAt?: Date | string | null;
};

type ProfessionalRow = {
    clerkId: string;
    username?: string;
    name?: string;
    email?: string;
    photoUrl?: string;
    phone?: string;
    city?: string;
    state?: string;
    balance?: number;
    createdAt: Date | string;
    onboardingStep?: string;
    professionalStatus?: string | null;
    identityStatus?: string | null;
    isOnline?: boolean;
    lastSeen?: Date | string | null;
};

type ActivationRow = {
    professionalId: string;
    assignedTeamMemberId?: string | null;
    assignedTeamMemberName?: string | null;
    status: 'pending' | 'contacted' | 'activated' | 'not_interested';
    stage: string;
    notes?: string;
    nextSteps?: string;
    shareClickCount?: number;
    firstShareClickedAt?: Date | string | null;
    lastShareClickedAt?: Date | string | null;
    contactedAt?: Date | string | null;
    activatedAt?: Date | string | null;
    history: unknown[];
};

type BroughtUserRow = {
    clerkId: string;
    acquiredByProfessionalId?: string;
    acquiredByProfessionalUsername?: string;
    acquisitionSource?: string;
    createdAt?: Date | string;
};

type RoomRow = {
    participants?: string[];
    lastMessageTime?: Date | string | null;
    updatedAt?: Date | string | null;
};

type RoomUserRow = {
    clerkId: string;
    username?: string;
    isProfessional?: boolean;
    isTeam?: boolean;
    acquiredByProfessionalId?: string;
    acquiredByProfessionalUsername?: string;
};

type TeamMemberRow = {
    clerkId: string;
    name?: string;
    username?: string;
    photoUrl?: string;
    teamTitle?: string;
};

type WithdrawRow = {
    userId: string;
    amount: number;
    netAmount?: number | null;
    status: 'pendente' | 'processando' | 'concluido' | 'rejeitado';
    createdAt: Date | string;
    updatedAt?: Date | string;
};

type UserFilter = {
    isProfessional: boolean;
    $or?: Array<Record<string, { $regex: RegExp }>>;
};

type ActivationMetrics = {
    totalConversationsCount: number;
    activeConversationsCount: number;
    ownClientConversationsCount: number;
    activeOwnClientConversationsCount: number;
    lastConversationAt: Date | null;
};

type EngagementStatusKey = 'recent' | 'active' | 'inactive';

function getFunnelStage(params: {
    shareClickCount: number;
    broughtUsersCount: number;
    ownClientConversationsCount: number;
    activeConversationsCount: number;
}) {
    if (params.ownClientConversationsCount > 0 && params.activeConversationsCount >= 2) {
        return { key: 'frequent', label: STAGE_FREQUENT, rank: 5 };
    }
    if (params.ownClientConversationsCount > 0) {
        return { key: 'first_client', label: STAGE_FIRST_CLIENT, rank: 4 };
    }
    if (params.broughtUsersCount > 0) {
        return { key: 'brought_user', label: STAGE_BROUGHT_USER, rank: 3 };
    }
    if (params.shareClickCount > 0) {
        return { key: 'share_attempted', label: STAGE_SHARE_ATTEMPTED, rank: 2 };
    }
    return { key: 'registered', label: STAGE_REGISTERED, rank: 1 };
}

function getActivityStatus(params: { isOnline?: boolean; lastSeen?: Date | string | null; activeConversationsCount: number; activeSince: Date }) {
    if (params.isOnline || params.activeConversationsCount > 0) {
        return { key: 'active', label: 'Ativa agora' };
    }

    if (params.lastSeen && new Date(params.lastSeen) >= params.activeSince) {
        return { key: 'recent', label: 'Ativa recentemente' };
    }

    return { key: 'absent', label: 'Ausente' };
}

function getEngagementStatus(params: { createdAt: Date | string; activeConversationsCount: number; recentSince: Date }): { key: EngagementStatusKey; label: string } {
    if (new Date(params.createdAt) >= params.recentSince) {
        return { key: 'recent', label: 'Recente' };
    }

    if (params.activeConversationsCount > 0) {
        return { key: 'active', label: 'Ativa' };
    }

    return { key: 'inactive', label: 'Inativa' };
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const currentUser = await User.findOne({ clerkId: userId }).select('clerkId isTeam isProfessional activationLastViewedAt').lean() as CurrentUserRow | null;
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;

        if (!currentUser || (!currentUser.isTeam && !isAdmin)) {
            return NextResponse.json({ error: 'Acesso exclusivo para membros da equipe ou administradores.' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || '';
        const filterStatus = searchParams.get('status') || 'all'; // all, unviewed, pending, contacted, activated, my_assigned

        // Buscar todos os profissionais ordenados do MAIS RECENTE para o MAIS ANTIGO
        const userFilter: UserFilter = { isProfessional: true };
        if (query.trim().length > 0) {
            const cleanQuery = query.trim().replace('@', '');
            userFilter.$or = [
                { username: { $regex: new RegExp(cleanQuery, 'i') } },
                { name: { $regex: new RegExp(cleanQuery, 'i') } },
                { email: { $regex: new RegExp(cleanQuery, 'i') } }
            ];
        }

        const professionals = await User.find(userFilter)
            .select('clerkId username name email photoUrl phone city state balance createdAt onboardingStep professionalStatus identityStatus isOnline lastSeen')
            .sort({ createdAt: -1 })
            .lean() as ProfessionalRow[];

        const profIds = professionals.map(p => p.clerkId);
        const profUsernames = professionals.map(p => p.username).filter(Boolean) as string[];
        const professionalIdByUsername = new Map(
            professionals
                .filter((p): p is ProfessionalRow & { username: string } => Boolean(p.username))
                .map(p => [p.username, p.clerkId])
        );
        const activeThresholdDays = Math.max(1, Number(settings?.activeUserThresholdDays || 7));
        const activeSince = new Date(Date.now() - activeThresholdDays * 24 * 60 * 60 * 1000);
        const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Buscar dados de ativação
        const activations = await ProfessionalActivation.find({ professionalId: { $in: profIds } }).lean() as ActivationRow[];
        const activationMap = new Map(activations.map(a => [a.professionalId, a]));

        const withdrawals = await WithdrawRequest.find({ userId: { $in: profIds } })
            .select('userId amount netAmount status createdAt updatedAt')
            .sort({ createdAt: -1 })
            .lean() as WithdrawRow[];

        const withdrawalMetricsByProfessional = new Map<string, {
            withdrawalsCount: number;
            lastWithdrawalAmount: number | null;
            lastWithdrawalNetAmount: number | null;
            lastWithdrawalStatus: WithdrawRow['status'] | null;
            lastWithdrawalAt: Date | string | null;
        }>();

        for (const withdrawal of withdrawals) {
            const current = withdrawalMetricsByProfessional.get(withdrawal.userId);
            if (current) {
                current.withdrawalsCount++;
                continue;
            }

            withdrawalMetricsByProfessional.set(withdrawal.userId, {
                withdrawalsCount: 1,
                lastWithdrawalAmount: withdrawal.amount,
                lastWithdrawalNetAmount: withdrawal.netAmount ?? withdrawal.amount,
                lastWithdrawalStatus: withdrawal.status,
                lastWithdrawalAt: withdrawal.createdAt,
            });
        }

        const broughtUsers = await User.find({
            isProfessional: { $ne: true },
            $or: [
                { acquiredByProfessionalId: { $in: profIds } },
                { acquiredByProfessionalId: { $in: profUsernames } },
                { acquiredByProfessionalUsername: { $in: profUsernames } },
            ],
        }).select('clerkId acquiredByProfessionalId acquiredByProfessionalUsername acquisitionSource createdAt').lean() as BroughtUserRow[];

        const broughtUsersByProfessional = new Map<string, BroughtUserRow[]>();
        for (const client of broughtUsers) {
            const ownerId = profIds.includes(client.acquiredByProfessionalId || '')
                ? client.acquiredByProfessionalId
                : professionalIdByUsername.get(client.acquiredByProfessionalId || '')
                    || professionalIdByUsername.get(client.acquiredByProfessionalUsername || '');
            if (!ownerId) continue;
            const list = broughtUsersByProfessional.get(ownerId) || [];
            list.push(client);
            broughtUsersByProfessional.set(ownerId, list);
        }

        const rooms = await Room.find({
            participants: { $in: profIds },
            lastMessageTime: { $exists: true, $ne: null },
        }).select('participants lastMessageTime updatedAt').lean() as RoomRow[];

        const participantIds = Array.from(new Set(
            rooms.flatMap(room => Array.isArray(room.participants) ? room.participants : [])
        ));
        const roomUsers = await User.find({ clerkId: { $in: participantIds } })
            .select('clerkId username isProfessional isTeam acquiredByProfessionalId acquiredByProfessionalUsername')
            .lean() as RoomUserRow[];
        const roomUserMap = new Map(roomUsers.map(u => [u.clerkId, u]));

        const metricsByProfessional = new Map<string, ActivationMetrics>();

        for (const profId of profIds) {
            metricsByProfessional.set(profId, {
                totalConversationsCount: 0,
                activeConversationsCount: 0,
                ownClientConversationsCount: 0,
                activeOwnClientConversationsCount: 0,
                lastConversationAt: null,
            });
        }

        for (const room of rooms) {
            const participants = Array.isArray(room.participants) ? room.participants : [];
            const professionalIdsInRoom = participants.filter((participantId: string) => profIds.includes(participantId));

            for (const profId of professionalIdsInRoom) {
                const otherId = participants.find((participantId: string) => participantId !== profId);
                const otherUser = otherId ? roomUserMap.get(otherId) : null;
                if (!otherUser || otherUser.isProfessional || otherUser.isTeam) continue;

                const metrics = metricsByProfessional.get(profId);
                if (!metrics) continue;

                const lastConversationAt = room.lastMessageTime ? new Date(room.lastMessageTime) : null;
                const isActiveConversation = !!lastConversationAt && lastConversationAt >= activeSince;
                const professional = professionals.find(p => p.clerkId === profId);
                const isOwnClient = otherUser.acquiredByProfessionalId === profId
                    || (!!professional?.username && otherUser.acquiredByProfessionalId === professional.username)
                    || (!!professional?.username && otherUser.acquiredByProfessionalUsername === professional.username);

                metrics.totalConversationsCount++;
                if (isActiveConversation) metrics.activeConversationsCount++;
                if (isOwnClient) metrics.ownClientConversationsCount++;
                if (isOwnClient && isActiveConversation) metrics.activeOwnClientConversationsCount++;
                if (lastConversationAt && (!metrics.lastConversationAt || lastConversationAt > metrics.lastConversationAt)) {
                    metrics.lastConversationAt = lastConversationAt;
                }
            }
        }

        // Buscar outros membros da equipe para lista de transferência
        const teamMembersList = await User.find({ isTeam: true })
            .select('clerkId name username photoUrl teamTitle')
            .lean() as TeamMemberRow[];

        const lastViewed = currentUser.activationLastViewedAt ? new Date(currentUser.activationLastViewedAt) : new Date(0);

        let unviewedCount = 0;
        const activationStats = {
            recent: 0,
            active: 0,
            inactive: 0,
        };

        const resultList = professionals.map(p => {
            const act = activationMap.get(p.clerkId) || {
                professionalId: p.clerkId,
                assignedTeamMemberId: null,
                assignedTeamMemberName: null,
                status: 'pending',
                stage: 'Aguardando 1º contato',
                notes: '',
                nextSteps: '',
                shareClickCount: 0,
                firstShareClickedAt: null,
                lastShareClickedAt: null,
                contactedAt: null,
                activatedAt: null,
                history: []
            };

            const metrics = metricsByProfessional.get(p.clerkId) || {
                totalConversationsCount: 0,
                activeConversationsCount: 0,
                ownClientConversationsCount: 0,
                activeOwnClientConversationsCount: 0,
                lastConversationAt: null,
            };
            const withdrawalMetrics = withdrawalMetricsByProfessional.get(p.clerkId) || {
                withdrawalsCount: 0,
                lastWithdrawalAmount: null,
                lastWithdrawalNetAmount: null,
                lastWithdrawalStatus: null,
                lastWithdrawalAt: null,
            };
            const broughtUsersForProfessional = broughtUsersByProfessional.get(p.clerkId) || [];
            const shareClickCount = Number(act.shareClickCount || 0);
            const activationFunnel = getFunnelStage({
                shareClickCount,
                broughtUsersCount: broughtUsersForProfessional.length,
                ownClientConversationsCount: metrics.ownClientConversationsCount,
                activeConversationsCount: metrics.activeConversationsCount,
            });
            const activityStatus = getActivityStatus({
                isOnline: p.isOnline,
                lastSeen: p.lastSeen,
                activeConversationsCount: metrics.activeConversationsCount,
                activeSince,
            });
            const engagementStatus = getEngagementStatus({
                createdAt: p.createdAt,
                activeConversationsCount: metrics.activeConversationsCount,
                recentSince,
            });
            activationStats[engagementStatus.key]++;

            const isUnviewed = new Date(p.createdAt) > lastViewed;
            if (isUnviewed) {
                unviewedCount++;
            }

            return {
                ...p,
                activation: act,
                activationFunnel,
                activityStatus,
                engagementStatus,
                activationMetrics: {
                    broughtUsersCount: broughtUsersForProfessional.length,
                    shareClickCount,
                    totalConversationsCount: metrics.totalConversationsCount,
                    activeConversationsCount: metrics.activeConversationsCount,
                    ownClientConversationsCount: metrics.ownClientConversationsCount,
                    activeOwnClientConversationsCount: metrics.activeOwnClientConversationsCount,
                    lastShareClickedAt: act.lastShareClickedAt || null,
                    lastConversationAt: metrics.lastConversationAt,
                    activeThresholdDays,
                    balance: p.balance || 0,
                    withdrawalsCount: withdrawalMetrics.withdrawalsCount,
                    lastWithdrawalAmount: withdrawalMetrics.lastWithdrawalAmount,
                    lastWithdrawalNetAmount: withdrawalMetrics.lastWithdrawalNetAmount,
                    lastWithdrawalStatus: withdrawalMetrics.lastWithdrawalStatus,
                    lastWithdrawalAt: withdrawalMetrics.lastWithdrawalAt,
                },
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
            activationStats,
            teamMembers: teamMembersList.map(tm => ({
                clerkId: tm.clerkId,
                name: tm.name || tm.username,
                username: tm.username,
                photoUrl: tm.photoUrl,
                teamTitle: tm.teamTitle || 'Equipe Mimo',
            }))
        });

    } catch (error: unknown) {
        console.error('Erro na API de ativação de profissionais:', error);
        const message = error instanceof Error ? error.message : 'Erro interno do servidor';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
