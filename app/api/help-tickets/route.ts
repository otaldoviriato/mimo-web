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
        const body = await request.json();
        const { senderEmail, senderName, subject, message } = body;

        // Validação simples
        if (!senderEmail || !subject || !message) {
            return NextResponse.json(
                { error: 'E-mail, assunto e mensagem são obrigatórios.' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Criar o ticket no banco de dados
        const ticket = await HelpTicket.create({
            senderEmail: senderEmail.trim().toLowerCase(),
            senderName: senderName?.trim() || undefined,
            subject: subject.trim(),
            message: message.trim(),
            status: 'novo',
            isFavorite: false,
            isRead: false,
        });

        // Buscar administradores para enviar notificação
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
            console.error('Erro ao buscar e-mails dos administradores:', dbErr);
        }

        // Definir e-mail do remetente e destinatários
        const emailFrom = process.env.HELP_EMAIL_FROM || 'suporte@mimochat.com.br';
        const emailTo = process.env.HELP_EMAIL_TO 
            ? process.env.HELP_EMAIL_TO.split(',').map(e => e.trim()) 
            : (adminEmails.length > 0 ? adminEmails : [FALLBACK_ADMIN_EMAIL]);

        // Enviar notificação usando o Resend
        if (process.env.RESEND_API_KEY) {
            try {
                const formattedName = ticket.senderName ? `${ticket.senderName} (${ticket.senderEmail})` : ticket.senderEmail;
                await resend.emails.send({
                    from: emailFrom,
                    to: emailTo,
                    subject: `[Novo Ticket de Ajuda] ${ticket.subject}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                            <h2 style="color: #6D28D9; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; margin-top: 0;">Novo Ticket Recebido</h2>
                            <p style="font-size: 14px; color: #475569; margin: 16px 0;">Um usuário acabou de abrir um ticket de ajuda pelo aplicativo.</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b; width: 120px; font-size: 14px;">Remetente:</td>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px;">${formattedName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b; font-size: 14px;">Assunto:</td>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px; font-weight: 600;">${ticket.subject}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #1e293b; font-size: 14px;">Data:</td>
                                    <td style="padding: 8px 0; color: #475569; font-size: 14px;">${ticket.createdAt.toLocaleString('pt-BR')}</td>
                                </tr>
                            </table>
                            
                            <div style="background-color: #f8fafc; border-left: 4px solid #8B5CF6; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                                <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Mensagem:</h4>
                                <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${ticket.message}</p>
                            </div>
                            
                            <div style="text-align: center; margin-top: 25px;">
                                <a href="https://www.mimochat.com.br/admin?tab=help-tickets" style="background-color: #6D28D9; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 8px; display: inline-block; shadow: 0 4px 6px -1px rgba(109, 40, 217, 0.1);">
                                    Visualizar no Back-office
                                </a>
                            </div>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error('Erro ao enviar e-mail de notificação pelo Resend:', emailErr);
            }
        } else {
            console.warn('RESEND_API_KEY não configurada no ambiente. E-mail de notificação não enviado.');
        }

        return NextResponse.json({ success: true, ticket }, { status: 201 });
    } catch (error: any) {
        console.error('Erro ao criar ticket de ajuda (POST):', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor ao registrar ticket.' },
            { status: 500 }
        );
    }
}
