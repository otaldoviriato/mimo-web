import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/adminAuth';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

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
            status: u.identityStatus || 'pending',
            notes: u.notes || '',
            identityDocumentUrl: u.identityDocumentUrl || '',
            identitySelfieUrl: u.identitySelfieUrl || '',
            identityDocumentType: u.identityDocumentType || '',
            createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: u.updatedAt ? u.updatedAt.toISOString() : new Date().toISOString(),
        };

        return NextResponse.json({ success: true, application });
    } catch (error) {
        console.error('Erro ao buscar verificação de identidade:', error);
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
        const update: { identityStatus?: string; notes?: string } = {};

        if (body.status !== undefined) {
            if (!['pending', 'approved', 'rejected'].includes(body.status)) {
                return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
            }
            update.identityStatus = body.status;
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

        const oldStatus = oldUser.identityStatus;

        const u = await User.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).lean();

        if (!u) {
            return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        const appUrl = process.env.NEXT_PUBLIC_API_URL || 'https://www.mimochat.com.br';

        // Envio de e-mail ao aprovar o selo verificado
        if (update.identityStatus === 'approved' && oldStatus !== 'approved') {
            try {
                await resend.emails.send({
                    from: 'Mimo Cadastro <onboarding@resend.dev>',
                    to: u.email,
                    subject: 'Seu perfil no Mimo foi verificado! 🎉',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #6d28d9; margin-top: 0;">Perfil Verificado! 🎉</h2>
                            <p style="color: #475569; font-size: 16px;">Olá, <strong>${u.name || u.username}</strong>.</p>
                            <p style="color: #475569; font-size: 16px;">Temos ótimas notícias! Seus documentos foram validados e agora seu perfil conta com o <strong>Selo de Verificado</strong>.</p>
                            <p style="color: #475569; font-size: 16px;">Isso mostra para a nossa comunidade que seu perfil é oficial e totalmente seguro.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${appUrl}" style="background-color: #6d28d9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Acessar meu Perfil</a>
                            </div>
                            <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">Mimo Suporte</p>
                        </div>
                    `
                });
                console.log(`✉️ Email de verificação enviado para usuário: ${u.email}`);
            } catch (emailErr) {
                console.error('Erro ao enviar e-mail de aprovação de verificação:', emailErr);
            }
        }

        // Envio de e-mail ao rejeitar a verificação
        if (update.identityStatus === 'rejected' && oldStatus !== 'rejected') {
            try {
                await resend.emails.send({
                    from: 'Mimo Cadastro <onboarding@resend.dev>',
                    to: u.email,
                    subject: 'Verificação de perfil no Mimo - Atualização 💜',
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #6d28d9; margin-top: 0;">Ajuste necessário nos documentos</h2>
                            <p style="color: #475569; font-size: 16px;">Olá, <strong>${u.name || u.username}</strong>.</p>
                            <p style="color: #475569; font-size: 16px;">Analisamos os documentos enviados para a verificação do seu perfil, mas infelizmente não pudemos aprovar neste momento.</p>
                            ${update.notes ? `
                            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0; color: #991b1b; font-size: 14px;">
                                <strong>Motivo da recusa:</strong><br/>
                                ${update.notes}
                            </div>` : ''}
                            <p style="color: #475569; font-size: 16px;">Você pode enviar novos documentos e uma nova selfie a qualquer momento diretamente pelos Ajustes do aplicativo.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${appUrl}/settings" style="background-color: #6d28d9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reenviar Documentos</a>
                            </div>
                            <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px;">Mimo Suporte</p>
                        </div>
                    `
                });
                console.log(`✉️ Email de rejeição de verificação enviado para usuário: ${u.email}`);
            } catch (emailErr) {
                console.error('Erro ao enviar e-mail de rejeição de verificação:', emailErr);
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
            status: u.identityStatus || 'pending',
            notes: u.notes || '',
            identityDocumentUrl: u.identityDocumentUrl || '',
            identitySelfieUrl: u.identitySelfieUrl || '',
            identityDocumentType: u.identityDocumentType || '',
            createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: u.updatedAt ? u.updatedAt.toISOString() : new Date().toISOString(),
        };

        return NextResponse.json({ success: true, application });
    } catch (error) {
        console.error('Erro ao atualizar verificação de identidade:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
