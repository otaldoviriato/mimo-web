import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { HelpTicket } from '@/models/HelpTicket';
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

// PATCH /api/admin/help-tickets/[id] - Atualiza campos de um ticket
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await context.params;

        await connectToDatabase();

        const isAdmin = await checkIsAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { status, isFavorite, isRead, notes } = body;

        const ticket = await HelpTicket.findById(id);
        if (!ticket) {
            return NextResponse.json({ error: 'Ticket não encontrado.' }, { status: 404 });
        }

        // Atualizar campos permitidos
        if (status !== undefined && ['novo', 'em_atendimento', 'lido', 'resolvido', 'arquivado'].includes(status)) {
            ticket.status = status;
        }

        if (isFavorite !== undefined) {
            ticket.isFavorite = Boolean(isFavorite);
        }

        if (isRead !== undefined) {
            ticket.isRead = Boolean(isRead);
        }

        if (notes !== undefined) {
            ticket.notes = notes.trim();
        }

        await ticket.save();

        return NextResponse.json({ success: true, ticket });
    } catch (error: any) {
        console.error('Erro na API administrativa (PATCH ticket):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// DELETE /api/admin/help-tickets/[id] - Exclui um ticket
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await context.params;

        await connectToDatabase();

        const isAdmin = await checkIsAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const deleted = await HelpTicket.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ error: 'Ticket não encontrado.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Erro na API administrativa (DELETE ticket):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// POST /api/admin/help-tickets/[id] - Responde ao e-mail do remetente
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await context.params;

        await connectToDatabase();

        const isAdmin = await checkIsAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { replyMessage } = body;

        if (!replyMessage || !replyMessage.trim()) {
            return NextResponse.json({ error: 'A mensagem de resposta é obrigatória.' }, { status: 400 });
        }

        const ticket = await HelpTicket.findById(id);
        if (!ticket) {
            return NextResponse.json({ error: 'Ticket não encontrado.' }, { status: 404 });
        }

        // Determinar o e-mail de envio com base no recipientEmail do ticket ou fallback
        const emailFrom = (ticket.recipientEmail || process.env.HELP_EMAIL_FROM || 'suporte@mimochat.com.br').trim().toLowerCase();

        // Buscar configurações para encontrar o displayName correspondente
        const settings = await AppSettings.findOne({ key: 'global' });
        const emailRedirections = settings?.emailRedirections || [];
        const redirection = emailRedirections.find(
            (r: any) => r.sourceEmail.toLowerCase() === emailFrom
        );
        let displayName = redirection?.displayName;
        if (displayName) {
            if (!displayName.toLowerCase().includes('mimo')) {
                displayName = `${displayName} (Mimo Chat)`;
            }
        }

        // Montar o remetente oficial formatado com aspas duplas
        let fromSender = emailFrom;
        if (displayName) {
            fromSender = `"${displayName}" <${emailFrom}>`;
        } else if (emailFrom === 'suporte@mimochat.com.br') {
            fromSender = `"Suporte MimoChat" <suporte@mimochat.com.br>`;
        }

        // Enviar e-mail de resposta usando Resend
        if (process.env.RESEND_API_KEY) {
            try {
                const mailSubject = ticket.subject.toLowerCase().startsWith('re:') 
                    ? ticket.subject 
                    : `Re: ${ticket.subject}`;

                await resend.emails.send({
                    from: fromSender,
                    to: ticket.senderEmail,
                    subject: mailSubject,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 12px; background-color: #ffffff; color: #334155;">
                            <!-- Cabeçalho de Resposta -->
                            <div style="margin-bottom: 25px;">
                                <div style="font-size: 15px; line-height: 1.6; color: #1e293b;">${replyMessage.trim()}</div>
                            </div>
                            
                            <!-- Rodapé Corporativo -->
                            <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 30px; font-size: 12px; color: #94a3b8;">
                                <p style="margin: 0; font-weight: bold;">${displayName || 'Suporte MimoChat'}</p>
                                <p style="margin: 4px 0 0 0;">Esta é uma mensagem enviada através dos canais de comunicação do MimoChat.</p>
                            </div>
                            
                            <!-- Histórico do Ticket Original -->
                            <div style="margin-top: 40px; border-left: 2px solid #e2e8f0; padding-left: 15px; color: #64748b; font-size: 13px;">
                                <p style="font-weight: bold; margin: 0 0 10px 0;">Histórico do Ticket original:</p>
                                <p style="margin: 4px 0;"><strong>Enviado por:</strong> ${ticket.senderName ? `${ticket.senderName} (${ticket.senderEmail})` : ticket.senderEmail}</p>
                                <p style="margin: 4px 0;"><strong>Data:</strong> ${ticket.createdAt.toLocaleString('pt-BR')}</p>
                                <p style="margin: 4px 0;"><strong>Assunto:</strong> ${ticket.subject}</p>
                                <div style="margin-top: 10px; line-height: 1.5;">${ticket.message}</div>
                            </div>
                        </div>
                    `
                });
            } catch (emailErr: any) {
                console.error('Erro ao enviar e-mail de resposta pela Resend:', emailErr);
                return NextResponse.json({ error: `Erro ao enviar e-mail: ${emailErr.message}` }, { status: 500 });
            }
        } else {
            console.warn('RESEND_API_KEY não configurada. Resposta simulada localmente.');
        }

        // Salvar a resposta no histórico de anotações internas
        const historyLog = `\n\n--- RESPOSTA ENVIADA EM ${new Date().toLocaleString('pt-BR')} ---\n${replyMessage.trim()}`;
        ticket.notes = (ticket.notes || '') + historyLog;
        
        // Se for novo, muda automaticamente para em_atendimento
        if (ticket.status === 'novo') {
            ticket.status = 'em_atendimento';
        }
        ticket.isRead = true;

        await ticket.save();

        return NextResponse.json({ success: true, ticket });
    } catch (error: any) {
        console.error('Erro na API administrativa de resposta a ticket (POST):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
