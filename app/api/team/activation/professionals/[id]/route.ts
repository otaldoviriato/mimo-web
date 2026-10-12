import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ProfessionalActivation } from '@/models/ProfessionalActivation';
import { AppSettings } from '@/models/AppSettings';
import { clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

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
        const { action, status, stage, notes, nextSteps, assignedTeamMemberId, approveProfile } = body;

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

        // Se a equipe solicitou aprovação direta do perfil da profissional
        if (approveProfile) {
            const profUser = await User.findOne({ clerkId: professionalId });
            if (profUser) {
                profUser.isProfessional = true;
                profUser.professionalStatus = 'approved';
                profUser.isAvailable = true;
                await profUser.save();

                // Atualizar metadados no Clerk
                try {
                    const client = await clerkClient();
                    await client.users.updateUserMetadata(professionalId, {
                        unsafeMetadata: { profileRole: 'professional' },
                    });
                } catch (clerkErr) {
                    console.error('[activation/professionals/approve] Erro Clerk metadata:', clerkErr);
                }

                // Disparar e-mail de boas-vindas/aprovação
                try {
                    const appUrl = process.env.NEXT_PUBLIC_API_URL || 'https://www.mimochat.com.br';
                    const institutionalEmail = settings?.institutionalEmails?.[0] || 'suporte@mimochat.com.br';
                    const senderFrom = process.env.RESEND_FROM_EMAIL || `"Mimo Cadastro" <${institutionalEmail}>`;
                    if (profUser.email && process.env.RESEND_API_KEY) {
                        await resend.emails.send({
                            from: senderFrom,
                            to: profUser.email,
                            subject: 'Sua conta de criadora no Mimo foi aprovada! 🎉',
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                    <h2 style="color: #6d28d9; margin-top: 0;">Sua conta foi aprovada! 🎉</h2>
                                    <p style="color: #475569; font-size: 16px;">Olá, <strong>${profUser.name || profUser.username}</strong>.</p>
                                    <p style="color: #475569; font-size: 16px;">Temos ótimas notícias! Seu perfil foi analisado e aprovado pela nossa equipe de ativação.</p>
                                    <p style="color: #475569; font-size: 16px;">Agora você já pode acessar o aplicativo e começar a interagir com seus fãs.</p>
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${appUrl}" style="background-color: #6d28d9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Acessar o Mimo</a>
                                    </div>
                                </div>
                            `
                        });
                    }
                } catch (emailErr) {
                    console.error('[activation/professionals/approve] Erro envio email:', emailErr);
                }

                activation.status = 'activated';
                activation.stage = 'Perfil aprovado e ativado';
                if (!activation.activatedAt) activation.activatedAt = new Date();
                actionDescription = 'Perfil aprovado e liberado para atendimento';
            }
        }

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
            professionalStatus: approveProfile ? 'approved' : undefined,
        });

    } catch (error: any) {
        console.error('Erro ao atualizar ativação:', error);
        return NextResponse.json({ error: error.message || 'Erro ao atualizar ativação' }, { status: 500 });
    }
}
