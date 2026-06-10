import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { HelpTicket } from '@/models/HelpTicket';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_ADMIN_EMAIL = 'suporte@mimochat.com.br';

export async function POST(request: NextRequest) {
    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
        }

        // Validar o tipo de evento do webhook se ele estiver presente
        if (body.type && body.type !== 'email.received') {
            console.log(`[Webhook Resend] Evento do tipo '${body.type}' ignorado. Apenas 'email.received' é processado.`);
            return NextResponse.json(
                { message: `Evento '${body.type}' ignorado.` },
                { status: 200 }
            );
        }

        // Webhook da Resend envia as informações do e-mail dentro de data ou diretamente no body
        const emailData = body.data || body;

        const fromString = emailData.from;
        const subject = emailData.subject || 'Sem assunto';
        const message = emailData.text || emailData.html || 'Sem conteúdo de mensagem';

        if (!fromString) {
            return NextResponse.json({ error: 'Campo "from" é obrigatório no payload' }, { status: 400 });
        }

        // Extrair e-mail e nome do remetente (Ex: "João Silva <joao@email.com>" -> nome: "João Silva", e-mail: "joao@email.com")
        let senderEmail = fromString.trim();
        let senderName = '';

        const fromRegex = /^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/;
        const match = fromString.match(fromRegex);
        if (match) {
            senderName = match[1]?.trim() || '';
            senderEmail = match[2]?.trim() || fromString;
        }

        // Prevenir loops de e-mail e tickets gerados por e-mails de sistema ou de envio
        const systemEmails = [
            'noreply@mimochat.com.br',
            'suporte@mimochat.com.br',
            process.env.HELP_EMAIL_FROM?.toLowerCase(),
            'noreply@resend.dev'
        ].filter(Boolean) as string[];

        if (systemEmails.includes(senderEmail.toLowerCase())) {
            console.log(`[Webhook Resend] E-mail do sistema '${senderEmail}' ignorado para evitar loops e tickets falsos.`);
            return NextResponse.json(
                { message: 'E-mail do sistema ignorado.' },
                { status: 200 }
            );
        }

        await connectToDatabase();

        // Salvar ticket no banco de dados
        const ticket = await HelpTicket.create({
            senderEmail: senderEmail.toLowerCase(),
            senderName: senderName || undefined,
            subject: subject.trim(),
            message: message.trim(),
            status: 'novo',
            isFavorite: false,
            isRead: false,
        });

        // Buscar administradores cadastrados para notificação
        let adminEmails: string[] = [];
        try {
            const settings = await AppSettings.findOne({ key: 'global' });
            if (settings && settings.adminClerkIds && settings.adminClerkIds.length > 0) {
                const admins = await User.find({ clerkId: { $in: settings.adminClerkIds } })
                    .select('email')
                    .lean();
                adminEmails = admins.map(admin => admin.email).filter(Boolean);
            }
        } catch (dbErr) {
            console.error('Erro ao buscar administradores para notificação de webhook:', dbErr);
        }

        const emailFrom = process.env.HELP_EMAIL_FROM || 'suporte@mimochat.com.br';
        const emailTo = process.env.HELP_EMAIL_TO 
            ? process.env.HELP_EMAIL_TO.split(',').map(e => e.trim()) 
            : (adminEmails.length > 0 ? adminEmails : [FALLBACK_ADMIN_EMAIL]);

        // Enviar notificação aos administradores via Resend
        if (process.env.RESEND_API_KEY) {
            try {
                const formattedName = ticket.senderName ? `${ticket.senderName} (${ticket.senderEmail})` : ticket.senderEmail;
                await resend.emails.send({
                    from: emailFrom,
                    to: emailTo,
                    subject: `[Novo E-mail de Ajuda] ${ticket.subject}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                            <h2 style="color: #6D28D9; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 0;">Novo E-mail Recebido na Ajuda</h2>
                            <p style="font-size: 14px; color: #475569; margin: 16px 0;">Um usuário enviou um e-mail para o canal de suporte público.</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b; width: 120px; font-size: 14px;">De:</td>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px;">${formattedName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b; font-size: 14px;">Assunto:</td>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px; font-weight: 600;">${ticket.subject}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b; font-size: 14px;">Data de Chegada:</td>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px;">${ticket.createdAt.toLocaleString('pt-BR')}</td>
                                </tr>
                            </table>
                            
                            <div style="background-color: #f8fafc; border-left: 4px solid #8B5CF6; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                                <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Conteúdo do E-mail:</h4>
                                <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${ticket.message}</p>
                            </div>
                            
                            <div style="text-align: center; margin-top: 25px;">
                                <a href="https://www.mimochat.com.br/admin?tab=help-tickets" style="background-color: #6D28D9; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block;">
                                    Gerenciar no Back-office
                                </a>
                            </div>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error('Erro ao enviar notificação de e-mail inbound pelo Resend:', emailErr);
            }
        }

        return NextResponse.json({ success: true, ticketId: ticket._id });
    } catch (error: any) {
        console.error('Erro no processamento do webhook resend-inbound (POST):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
