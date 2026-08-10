import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ProfessionalActivation } from '@/models/ProfessionalActivation';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const currentUser = await User.findOne({ clerkId: userId }).select('clerkId name username isTeam').lean() as any;
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;

        if (!currentUser || (!currentUser.isTeam && !isAdmin)) {
            return NextResponse.json({ error: 'Acesso exclusivo para equipe ou admin.' }, { status: 403 });
        }

        const { id: professionalId } = await params;
        const body = await request.json();
        const { action, status, stage, notes, nextSteps, assignedTeamMemberId } = body;

        let activation = await ProfessionalActivation.findOne({ professionalId });
        if (!activation) {
            activation = new ProfessionalActivation({
                professionalId,
                status: 'pending',
                stage: 'Aguardando 1º contato',
                history: [],
            });
        }

        const authorName = currentUser.name || currentUser.username || 'Membro da Equipe';
        let actionDescription = action || 'Atualização de ativação';

        if (assignedTeamMemberId !== undefined) {
            if (assignedTeamMemberId === null || assignedTeamMemberId === '') {
                activation.assignedTeamMemberId = null;
                activation.assignedTeamMemberName = null;
                actionDescription = `Removeu o responsável do atendimento`;
            } else {
                const targetMember = await User.findOne({ clerkId: assignedTeamMemberId }).select('name username').lean() as any;
                const memberName = targetMember?.name || targetMember?.username || 'Membro da Equipe';
                activation.assignedTeamMemberId = assignedTeamMemberId;
                activation.assignedTeamMemberName = memberName;

                if (assignedTeamMemberId === userId) {
                    actionDescription = `Assumiu a responsabilidade da ativação`;
                } else {
                    actionDescription = `Transferiu a ativação para ${memberName}`;
                }
            }
        }

        if (status !== undefined) {
            activation.status = status;
            if (status === 'contacted' && !activation.contactedAt) {
                activation.contactedAt = new Date();
            }
            if (status === 'activated' && !activation.activatedAt) {
                activation.activatedAt = new Date();
            }
        }

        if (stage !== undefined) activation.stage = stage;
        if (notes !== undefined) activation.notes = notes;
        if (nextSteps !== undefined) activation.nextSteps = nextSteps;

        activation.history.push({
            authorId: userId,
            authorName,
            action: actionDescription,
            note: notes ? `Notas: ${notes.substring(0, 80)}...` : undefined,
            timestamp: new Date(),
        });

        await activation.save();

        return NextResponse.json({
            success: true,
            activation,
        });

    } catch (error: any) {
        console.error('Erro ao atualizar ativação:', error);
        return NextResponse.json({ error: error.message || 'Erro ao atualizar ativação' }, { status: 500 });
    }
}
