import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { HelpTicket } from '@/models/HelpTicket';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FALLBACK_ADMIN_EMAIL = 'suporte@mimochat.com.br';

function cleanEmailBody(bodyText: string): string {
    if (!bodyText) return '';
    const splitMarkers = [
        /^\s*On\s+.*wrote:\s*$/mi,
        /^\s*Em\s+.*escreveu:\s*$/mi,
        /^\s*De:\s+.*\s*$/mi,
        /^\s*From:\s+.*\s*$/mi,
        /^\s*-----\s*Original Message\s*-----\s*$/mi,
        /^\s*-----\s*Mensagem Original\s*-----\s*$/mi,
        /^\s*Para:\s+.*\s*$/mi,
        /^\s*To:\s+.*\s*$/mi,
        /^\s*_+\s*$/m
    ];
    let cleanText = bodyText;
    for (const marker of splitMarkers) {
        const match = cleanText.match(marker);
        if (match && match.index !== undefined) {
            cleanText = cleanText.substring(0, match.index);
        }
    }
    return cleanText.trim();
}

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

        // Buscar o corpo do e-mail completo a partir do ID do e-mail
        const emailId = body.data?.email_id || body.email_id || emailData.id || emailData.email_id;
        let textContent = '';
        let htmlContent = '';
        if (emailId && process.env.RESEND_API_KEY) {
            try {
                const resendReceiving = (resend.emails as any).receiving;
                if (resendReceiving && typeof resendReceiving.get === 'function') {
                    const result = await resendReceiving.get(emailId);
                    const fullEmail = (result?.data || result) as any;
                    if (fullEmail) {
                        textContent = fullEmail.text || '';
                        htmlContent = fullEmail.html || '';
                    }
                } else {
                    const result = await resend.emails.get(emailId);
                    const fullEmail = (result?.data || result) as any;
                    if (fullEmail) {
                        textContent = fullEmail.text || '';
                        htmlContent = fullEmail.html || '';
                    }
                }
            } catch (apiErr) {
                console.error(`[Webhook Resend] Erro ao buscar e-mail recebido pelo id ${emailId}:`, apiErr);
            }
        }

        let message = 'Sem conteúdo de mensagem';
        if (textContent) {
            const cleanText = cleanEmailBody(textContent);
            message = cleanText.replace(/\r?\n/g, '<br>');
        } else if (htmlContent) {
            let cleanHtml = htmlContent;
            const gmailQuoteIndex = cleanHtml.indexOf('<div class="gmail_quote"');
            if (gmailQuoteIndex !== -1) {
                cleanHtml = cleanHtml.substring(0, gmailQuoteIndex);
            }
            const blockquoteIndex = cleanHtml.indexOf('<blockquote');
            if (blockquoteIndex !== -1) {
                cleanHtml = cleanHtml.substring(0, blockquoteIndex);
            }
            message = cleanHtml.trim();
        } else {
            const fallbackText = emailData.text || '';
            if (fallbackText) {
                message = cleanEmailBody(fallbackText).replace(/\r?\n/g, '<br>');
            } else if (emailData.html) {
                message = emailData.html;
            }
        }

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

        // Extrair destinatário (campo "to")
        const toVal = emailData.to;
        let recipientEmail = 'suporte@mimochat.com.br';
        let toString = '';
        if (Array.isArray(toVal) && toVal.length > 0) {
            toString = toVal[0];
        } else if (typeof toVal === 'string') {
            toString = toVal;
        }

        if (toString) {
            const toMatch = toString.match(fromRegex);
            if (toMatch) {
                recipientEmail = toMatch[2]?.trim().toLowerCase() || toString.trim().toLowerCase();
            } else {
                recipientEmail = toString.trim().toLowerCase();
            }
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

        // 1. Detectar se é uma resposta para o proxy de-para (reply-TICKETID@dominio)
        const proxyMatch = recipientEmail.match(/^reply-([a-f\d]{24})@(.+)$/i);
        if (proxyMatch) {
            const ticketId = proxyMatch[1];
            const domain = proxyMatch[2];

            // Buscar o ticket original
            const parentTicket = await HelpTicket.findById(ticketId);
            if (!parentTicket) {
                console.error(`[Webhook Resend Proxy] Ticket original com ID ${ticketId} não encontrado.`);
                return NextResponse.json({ message: 'Ticket original não encontrado.' }, { status: 200 });
            }

            // Buscar as regras de redirecionamento global para verificar permissões de envio
            let emailRedirections: { sourceEmail: string; targetEmail: string; displayName?: string }[] = [];
            try {
                const settings = await AppSettings.findOne({ key: 'global' });
                if (settings) {
                    emailRedirections = settings.emailRedirections || [];
                }
            } catch (dbErr) {
                console.error('[Webhook Resend Proxy] Erro ao carregar configurações globais:', dbErr);
            }

            // Achar o redirecionamento correspondente ao e-mail institucional original
            const redirection = emailRedirections.find(
                r => r.sourceEmail.toLowerCase() === parentTicket.recipientEmail.toLowerCase()
            );

            if (!redirection) {
                console.error(`[Webhook Resend Proxy] Nenhuma regra de redirecionamento de e-mail cadastrada para ${parentTicket.recipientEmail}.`);
                return NextResponse.json({ message: 'Regra de redirecionamento não configurada.' }, { status: 200 });
            }

            // Garantir que quem está respondendo é o e-mail privado correto (segurança)
            if (redirection.targetEmail.toLowerCase() !== senderEmail.toLowerCase()) {
                console.error(`[Webhook Resend Proxy] Tentativa de envio rejeitada. E-mail privado '${senderEmail}' não corresponde ao e-mail cadastrado '${redirection.targetEmail}' para o institucional '${parentTicket.recipientEmail}'.`);
                return NextResponse.json({ message: 'Envio não autorizado para esta conversa.' }, { status: 200 });
            }

            // Salvar a resposta no banco de dados como um registro filho
            const replyTicket = await HelpTicket.create({
                senderEmail: parentTicket.recipientEmail.toLowerCase(), // Do institucional
                senderName: senderName || undefined,
                recipientEmail: parentTicket.senderEmail.toLowerCase(), // Para o cliente original
                subject: subject.trim(),
                message: message.trim(),
                status: 'lido',
                isFavorite: false,
                isRead: true,
                parentId: parentTicket._id,
                isOutbox: true
            });

            // Atualizar status do ticket original
            parentTicket.status = 'em_atendimento';
            parentTicket.isRead = true;
            await parentTicket.save();

            // Disparar resposta para o cliente original usando o remetente institucional oficial
            if (process.env.RESEND_API_KEY) {
                try {
                    // Garantir que o assunto tenha prefixo "Re:"
                    let replySubject = subject.trim();
                    if (!replySubject.toLowerCase().startsWith('re:')) {
                        replySubject = `Re: ${replySubject}`;
                    }

                    let displayName = redirection.displayName;
                    if (displayName) {
                        if (!displayName.toLowerCase().includes('mimo')) {
                            displayName = `${displayName} (Mimo Chat)`;
                        }
                    }
                    const fromSender = displayName
                        ? `"${displayName}" <${parentTicket.recipientEmail}>`
                        : parentTicket.recipientEmail;

                    await resend.emails.send({
                        from: fromSender,
                        to: parentTicket.senderEmail.trim().toLowerCase(),
                        subject: replySubject,
                        html: htmlContent || `<p style="white-space: pre-wrap;">${message.trim()}</p>`
                    });
                    console.log(`[Webhook Resend Proxy] Resposta do ticket ${ticketId} encaminhada com sucesso para o cliente ${parentTicket.senderEmail}`);
                } catch (sendErr) {
                    console.error(`[Webhook Resend Proxy] Erro ao disparar e-mail de resposta para o cliente:`, sendErr);
                }
            }

            return NextResponse.json({ success: true, replyTicketId: replyTicket._id });
        }

        // Limpar assunto para remover prefixos comuns de resposta (Re:, Res:, Fwd:, etc.)
        const cleanSubject = subject.replace(/^(re|fwd|res|enc|resposta):\s*/i, '').trim();
        
        // Buscar se existe um ticket raiz compatível (mesmo assunto e participantes correspondentes)
        let parentId: string | undefined = undefined;
        try {
            const possibleParent = await HelpTicket.findOne({
                subject: { $regex: new RegExp('^' + cleanSubject.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
                $or: [
                    { senderEmail: senderEmail.toLowerCase(), recipientEmail: recipientEmail.toLowerCase() },
                    { senderEmail: recipientEmail.toLowerCase(), recipientEmail: senderEmail.toLowerCase() }
                ],
                parentId: { $exists: false }
            }).sort({ createdAt: -1 });

            if (possibleParent) {
                parentId = possibleParent._id.toString();
                
                // Se o pai for reaberto, mudar status e marcar como não lido
                possibleParent.status = 'novo';
                possibleParent.isRead = false;
                await possibleParent.save();
            }
        } catch (threadErr) {
            console.error('[Webhook Resend Threading] Erro ao tentar associar resposta a um ticket existente:', threadErr);
        }

        // Salvar ticket no banco de dados (vinculando com parentId se encontrado)
        const ticket = await HelpTicket.create({
            senderEmail: senderEmail.toLowerCase(),
            senderName: senderName || undefined,
            recipientEmail: recipientEmail,
            subject: subject.trim(),
            message: message.trim(),
            status: parentId ? 'em_atendimento' : 'novo',
            isFavorite: false,
            isRead: false,
            parentId: parentId || undefined
        });

        // Buscar administradores cadastrados para notificação e redirecionamentos
        let adminEmails: string[] = [];
        let emailRedirections: { sourceEmail: string; targetEmail: string; displayName?: string }[] = [];
        try {
            const settings = await AppSettings.findOne({ key: 'global' });
            if (settings) {
                emailRedirections = settings.emailRedirections || [];
                if (settings.adminClerkIds && settings.adminClerkIds.length > 0) {
                    const admins = await User.find({ clerkId: { $in: settings.adminClerkIds } })
                        .select('email')
                        .lean();
                    adminEmails = admins.map(admin => admin.email).filter(Boolean);
                }
            }
        } catch (dbErr) {
            console.error('Erro ao buscar administradores para notificação de webhook:', dbErr);
        }

        const emailFrom = process.env.HELP_EMAIL_FROM || 'suporte@mimochat.com.br';
        const emailTo = process.env.HELP_EMAIL_TO 
            ? process.env.HELP_EMAIL_TO.split(',').map(e => e.trim()) 
            : (adminEmails.length > 0 ? adminEmails : [FALLBACK_ADMIN_EMAIL]);

        // Redirecionar/encaminhar e-mail institucional automaticamente se cadastrado
        const redirection = emailRedirections.find(
            r => r.sourceEmail.toLowerCase() === recipientEmail.toLowerCase()
        );
        if (redirection && redirection.targetEmail && process.env.RESEND_API_KEY) {
            try {
                const forwardHeader = `
                    <div style="font-family: sans-serif; font-size: 13px; color: #475569; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 15px; margin-bottom: 20px; border-radius: 6px;">
                        <strong>E-mail original encaminhado pelo MimoChat</strong><br/>
                        <strong>Remetente original:</strong> ${ticket.senderName ? `${ticket.senderName} &lt;${ticket.senderEmail}&gt;` : ticket.senderEmail}<br/>
                        <strong>Destinatário original:</strong> ${recipientEmail}<br/>
                        <strong>Assunto:</strong> ${ticket.subject}<br/>
                        <strong>Data:</strong> ${new Date(ticket.createdAt).toLocaleString('pt-BR')}
                    </div>
                `;
                const mainHtml = htmlContent || `<p style="white-space: pre-wrap;">${ticket.message}</p>`;

                // Determinar o domínio e-mail
                const domainMatch = recipientEmail.match(/@(.+)$/);
                const domain = domainMatch ? domainMatch[1] : 'mimochat.com.br';
                const replyToAddress = `reply-${ticket._id}@${domain}`;

                // Formatar remetente amigável contanto que termine com o domínio verificado
                const friendlySenderName = ticket.senderName ? `${ticket.senderName} [via MimoChat]` : 'Cliente [via MimoChat]';

                await resend.emails.send({
                    from: `${friendlySenderName} <${recipientEmail}>`,
                    to: redirection.targetEmail.trim().toLowerCase(),
                    replyTo: replyToAddress,
                    subject: ticket.subject,
                    html: forwardHeader + mainHtml
                });
                console.log(`[Webhook Resend] E-mail de ${recipientEmail} encaminhado com sucesso para ${redirection.targetEmail} com replyTo ${replyToAddress}`);
            } catch (forwardErr) {
                console.error(`[Webhook Resend] Erro ao processar redirecionamento para ${redirection.targetEmail}:`, forwardErr);
            }
        }

        // Enviar notificação aos administradores via Resend apenas se for e-mail de suporte
        if (process.env.RESEND_API_KEY && recipientEmail === 'suporte@mimochat.com.br') {
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
