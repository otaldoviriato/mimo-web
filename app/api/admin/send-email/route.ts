import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function checkIsAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' });
    if (!settings) {
        return userId === FALLBACK_ADMIN;
    }
    return settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
}

// POST /api/admin/send-email - Envia um e-mail avulso usando o domínio corporativo verificado
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const isAdmin = await checkIsAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { senderPrefix, to, subject, message } = body;

        // Validações básicas
        if (!senderPrefix || !senderPrefix.trim()) {
            return NextResponse.json({ error: 'O prefixo do remetente é obrigatório.' }, { status: 400 });
        }
        if (!to || !to.trim()) {
            return NextResponse.json({ error: 'O destinatário (Para) é obrigatório.' }, { status: 400 });
        }
        if (!subject || !subject.trim()) {
            return NextResponse.json({ error: 'O assunto é obrigatório.' }, { status: 400 });
        }
        if (!message || !message.trim()) {
            return NextResponse.json({ error: 'A mensagem é obrigatória.' }, { status: 400 });
        }

        // Sanitização simples do prefixo do remetente (apenas letras, números, hífen, underline e ponto)
        const sanitizedPrefix = senderPrefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
        if (!sanitizedPrefix) {
            return NextResponse.json({ error: 'Prefixo do remetente inválido.' }, { status: 400 });
        }

        const emailFrom = `${sanitizedPrefix}@mimochat.com.br`;

        if (!process.env.RESEND_API_KEY) {
            console.warn('RESEND_API_KEY não configurada. Simulando envio de e-mail com sucesso no ambiente local.');
            return NextResponse.json({
                success: true,
                simulated: true,
                message: `[Simulação] E-mail enviado com sucesso de ${emailFrom} para ${to}.`
            });
        }

        try {
            const result = await resend.emails.send({
                from: emailFrom,
                to: to.trim().toLowerCase(),
                subject: subject.trim(),
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 12px; background-color: #ffffff; color: #334155; border: 1px solid #e2e8f0;">
                        <!-- Conteúdo da Mensagem -->
                        <div style="margin-bottom: 25px;">
                            <p style="font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #1e293b;">${message.trim()}</p>
                        </div>
                        
                        <!-- Rodapé Corporativo -->
                        <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 30px; font-size: 12px; color: #94a3b8;">
                            <p style="margin: 0; font-weight: bold;">MimoChat</p>
                            <p style="margin: 4px 0 0 0;">Este é um e-mail enviado diretamente pela administração do MimoChat.</p>
                        </div>
                    </div>
                `
            });

            if (result.error) {
                console.error('Erro retornado pela API da Resend:', result.error);
                return NextResponse.json({ error: `Erro no provedor de e-mail: ${result.error.message}` }, { status: 500 });
            }

            return NextResponse.json({ success: true, data: result.data });
        } catch (resendErr: any) {
            console.error('Erro crítico na chamada da API da Resend:', resendErr);
            return NextResponse.json({ error: `Falha ao conectar com o serviço de e-mail: ${resendErr.message}` }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Erro na API /api/admin/send-email (POST):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
