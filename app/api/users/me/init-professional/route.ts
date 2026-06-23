import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Resend } from 'resend';
import { buildProfileRoleMetadata } from '@/lib/profileRole';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        try {
            const client = await clerkClient();
            const clerkUser = await client.users.getUser(userId);
            const isNewAccount = clerkUser.createdAt 
                ? (Date.now() - new Date(clerkUser.createdAt).getTime() < 120000)
                : false;

            if (!isNewAccount) {
                console.log(`[init-professional] Tentativa de promover conta antiga de cliente (${userId}) ignorada.`);
                return NextResponse.json({ success: false, reason: 'existing_account' });
            }
        } catch (clerkErr) {
            console.error('[init-professional] Erro ao obter dados do usuário do Clerk:', clerkErr);
            return NextResponse.json({ error: 'Erro ao validar conta no Clerk' }, { status: 500 });
        }

        await connectToDatabase();

        let user = await User.findOne({ clerkId: userId });

        if (!user) {
            // Se o usuário ainda não foi criado por algum motivo, vamos buscá-lo no Clerk
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(userId);
                const email = clerkUser.emailAddresses[0]?.emailAddress || `user_${userId}@placeholder.com`;
                const cleanId = userId.startsWith('user_') ? userId.slice(5) : userId;
                const username = clerkUser.username || `user_${cleanId.substring(Math.max(0, cleanId.length - 8))}`;

                user = await User.create({
                    clerkId: userId,
                    email: email,
                    username: username,
                    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
                    balance: 0,
                    isProfessional: true,
                    professionalStatus: null,
                    chargePerCharSubscribers: 0.002,
                    chargePerCharNonSubscribers: 0.005,
                });
            } catch (err) {
                console.error('[init-professional] Erro ao lazy-criar usuário:', err);
                return NextResponse.json({ error: 'Erro ao registrar usuário' }, { status: 500 });
            }
        } else {
            // Se ele já for profissional, não precisamos fazer de novo
            if (user.isProfessional) {
                return NextResponse.json({ success: true, alreadyInitialized: true, status: user.professionalStatus });
            }

            // Atualiza para profissional no MongoDB
            user.isProfessional = true;
            user.professionalStatus = null;
            await user.save();
        }

        // Sincroniza metadados no Clerk
        try {
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                unsafeMetadata: buildProfileRoleMetadata('professional')
            });
            console.log(`[init-professional] Clerk unsafeMetadata atualizado para professional para o usuário ${userId}`);
        } catch (clerkErr) {
            console.error('[init-professional] Erro ao atualizar metadados no Clerk:', clerkErr);
        }

        // Notifica os administradores por e-mail via Resend (apenas informativo de criação de conta)
        try {
            await resend.emails.send({
                from: 'Mimo Cadastro <onboarding@resend.dev>',
                to: 'viriatoceo@gmail.com',
                subject: `Nova Conta de Criadora Criada - @${user.username}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #6d28d9; margin-top: 0;">Nova Profissional Cadastrada</h2>
                        <p style="color: #475569; font-size: 16px;">Uma nova conta de criadora foi criada e está pendente de verificação de identidade/documentos.</p>
                        <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                            <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${user.name || user.username}</li>
                            <li style="margin-bottom: 8px;"><strong>E-mail:</strong> ${user.email}</li>
                            <li style="margin-bottom: 8px;"><strong>Username:</strong> @${user.username}</li>
                            <li style="margin-bottom: 0;"><strong>Data de Cadastro:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                        </ul>
                        <p style="color: #475569;">O perfil só aparecerá no painel de moderação de documentos após o envio de fotos do documento e selfie de maioridade (+18) pela própria criadora.</p>
                    </div>
                `
            });
            console.log(`[init-professional] E-mail de notificação enviado para viriatoceo@gmail.com`);
        } catch (emailErr) {
            console.error('[init-professional] Erro ao enviar e-mail de notificação:', emailErr);
        }

        return NextResponse.json({ success: true, status: 'pending' });
    } catch (error) {
        console.error('[init-professional] Erro geral:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
