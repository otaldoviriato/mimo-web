import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/adminAuth';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { Resend } from 'resend';
import { clerkClient } from '@clerk/nextjs/server';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');
const STATUSES = ['pending', 'approved', 'rejected', 'archived', 'pending_documents'];

async function authorize() {
    const access = await getAdminAccess();
    if (!access.userId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (!access.isAdmin) {
        return NextResponse.json({ error: 'Acesso permitido apenas para administradores.' }, { status: 403 });
    }
    return null;
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authorizationError = await authorize();
        if (authorizationError) return authorizationError;

        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'ID de usuário inválido.' }, { status: 400 });
        }

        await connectToDatabase();

        const u = await User.findById(id).lean();
        if (!u) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        const application = {
            _id: u._id.toString(),
            fullName: u.name || u.username,
            artisticName: u.username,
            instagram: u.username,
            whatsapp: u.phone || 'Não informado',
            email: u.email,
            age: 0,
            cityState: 'Não informado',
            status: (u.professionalStatus === null || u.professionalStatus === undefined) ? 'pending_documents' : u.professionalStatus,
            notes: u.notes || '',
            identityDocumentUrl: u.identityDocumentUrl || '',
            identitySelfieUrl: u.identitySelfieUrl || '',
            identityDocumentType: u.identityDocumentType || '',
            createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: u.updatedAt ? u.updatedAt.toISOString() : new Date().toISOString(),
        };

        return NextResponse.json({ success: true, application });
    } catch (error) {
        console.error('Erro ao buscar inscrição de criadora:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authorizationError = await authorize();
        if (authorizationError) return authorizationError;

        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'ID de usuário inválido.' }, { status: 400 });
        }

        await connectToDatabase();

        const body = await request.json();
        const update: { professionalStatus?: string | null; notes?: string } = {};

        if (body.status !== undefined) {
            if (!STATUSES.includes(body.status)) {
                return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
            }
            update.professionalStatus = body.status === 'pending_documents' ? null : body.status;
        }

        if (body.notes !== undefined) {
            if (typeof body.notes !== 'string') {
                return NextResponse.json({ error: 'As notas devem ser um texto.' }, { status: 400 });
            }
            update.notes = body.notes.trim().slice(0, 5000);
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ error: 'Nenhuma alteração válida foi enviada.' }, { status: 400 });
        }

        const oldUser = await User.findById(id);
        if (!oldUser) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        const oldStatus = oldUser.professionalStatus;

        const u = await User.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).lean();

        if (!u) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        if (update.professionalStatus === 'approved' && oldStatus !== 'approved') {
            try {
                const appUrl = process.env.NEXT_PUBLIC_API_URL || 'https://www.mimochat.com.br';
                await resend.emails.send({
                    from: 'Mimo Cadastro <onboarding@resend.dev>',
                    to: u.email,
                    subject: 'Sua conta de criadora no Mimo foi aprovada! 🎉',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #6d28d9; margin-top: 0;">Sua conta foi aprovada! 🎉</h2>
                            <p style="color: #475569; font-size: 16px;">Olá, <strong>${u.name || u.username}</strong>.</p>
                            <p style="color: #475569; font-size: 16px;">Temos ótimas notícias! Sua conta de criadora no Mimo foi analisada e aprovada pela nossa equipe.</p>
                            <p style="color: #475569; font-size: 16px;">Agora você já pode acessar o aplicativo e começar a interagir com seus fãs.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${appUrl}" style="background-color: #6d28d9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Acessar o Mimo</a>
                            </div>
                            <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">Se você tiver alguma dúvida, entre em contato com nosso suporte.</p>
                        </div>
                    `
                });
                console.log(`✉️ Email de aprovação enviado para criadora: ${u.email}`);
            } catch (emailErr) {
                console.error('Erro ao enviar e-mail de aprovação para a criadora:', emailErr);
            }
        }

        if (update.professionalStatus === 'rejected' && oldStatus !== 'rejected') {
            try {
                await resend.emails.send({
                    from: 'Mimo Cadastro <onboarding@resend.dev>',
                    to: u.email,
                    subject: 'Sua inscrição de criadora no Mimo - Atualização 💜',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #6d28d9; margin-top: 0;">Inscrição não aprovada</h2>
                            <p style="color: #475569; font-size: 16px;">Olá, <strong>${u.name || u.username}</strong>.</p>
                            <p style="color: #475569; font-size: 16px;">Agradecemos muito pelo seu interesse em fazer parte do Mimo.</p>
                            <p style="color: #475569; font-size: 16px;">Após avaliar seu cadastro, lamentamos informar que não foi possível aprovar seu perfil profissional neste momento.</p>
                            <p style="color: #475569; font-size: 16px;">Se você acredita que isso foi um engano ou deseja obter mais detalhes, sinta-se à vontade para responder a este e-mail ou contatar nosso suporte técnico.</p>
                            <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">Mimo Suporte</p>
                        </div>
                    `
                });
                console.log(`✉️ Email de rejeição enviado para criadora: ${u.email}`);
            } catch (emailErr) {
                console.error('Erro ao enviar e-mail de rejeição para a criadora:', emailErr);
            }
        }

        const application = {
            _id: u._id.toString(),
            fullName: u.name || u.username,
            artisticName: u.username,
            instagram: u.username,
            whatsapp: u.phone || 'Não informado',
            email: u.email,
            age: 0,
            cityState: 'Não informado',
            status: (u.professionalStatus === null || u.professionalStatus === undefined) ? 'pending_documents' : u.professionalStatus,
            notes: u.notes || '',
            identityDocumentUrl: u.identityDocumentUrl || '',
            identitySelfieUrl: u.identitySelfieUrl || '',
            identityDocumentType: u.identityDocumentType || '',
            createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: u.updatedAt ? u.updatedAt.toISOString() : new Date().toISOString(),
        };

        return NextResponse.json({ success: true, application });
    } catch (error) {
        console.error('Erro ao atualizar inscrição de criadora:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authorizationError = await authorize();
        if (authorizationError) return authorizationError;

        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'ID de usuário inválido.' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findById(id);
        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        const clerkId = user.clerkId;

        // 1. Deleta do Clerk
        try {
            const client = await clerkClient();
            await client.users.deleteUser(clerkId);
            console.log(`[DELETE creator-application] Usuário ${clerkId} excluído do Clerk.`);
        } catch (clerkErr) {
            console.error('[DELETE creator-application] Erro ao deletar no Clerk (continuando com Mongo):', clerkErr);
        }

        // 2. Deleta do MongoDB
        await User.findByIdAndDelete(id);
        console.log(`[DELETE creator-application] Usuário ${id} excluído do MongoDB.`);

        return NextResponse.json({ success: true, message: 'Inscrição excluída com sucesso do banco e do Clerk.' });
    } catch (error) {
        console.error('Erro ao excluir inscrição:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
