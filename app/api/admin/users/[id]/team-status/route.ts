import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

// PATCH /api/admin/users/[id]/team-status - Define ou remove status de equipe de um usuário
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { id: targetClerkId } = await params;
        const body = await request.json();
        const { isTeam, teamTitle } = body;

        if (typeof isTeam !== 'boolean') {
            return NextResponse.json({ error: 'O parâmetro isTeam é obrigatório e deve ser booleano.' }, { status: 400 });
        }

        const targetUser = await User.findOne({ clerkId: targetClerkId });
        if (!targetUser) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        if (targetUser.isProfessional) {
            return NextResponse.json({ error: 'Apenas clientes podem ser tornados membros da equipe. Contas de profissionais não podem ser convertidas diretamente.' }, { status: 400 });
        }

        targetUser.isTeam = isTeam;
        if (teamTitle && typeof teamTitle === 'string') {
            targetUser.teamTitle = teamTitle.trim();
        } else if (!isTeam) {
            targetUser.teamTitle = 'Equipe Mimo';
        }

        await targetUser.save();

        return NextResponse.json({
            success: true,
            message: isTeam ? 'Usuário promovido a Membro da Equipe com sucesso.' : 'Usuário removido da equipe com sucesso.',
            user: {
                clerkId: targetUser.clerkId,
                name: targetUser.name,
                username: targetUser.username,
                isTeam: targetUser.isTeam,
                teamTitle: targetUser.teamTitle,
            }
        });
    } catch (error: any) {
        console.error('Erro ao atualizar status de equipe:', error);
        return NextResponse.json({ error: error.message || 'Erro interno ao atualizar status de equipe' }, { status: 500 });
    }
}
