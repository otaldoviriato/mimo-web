import { Resend } from 'resend';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { sendPushNotification } from '@/lib/push';

type NewProfessionalAlertInput = {
    clerkId: string;
    name?: string;
    username?: string;
    email?: string;
};

type EmailSettings = {
    institutionalEmails?: string[];
};

function isRealEmail(email?: string) {
    return Boolean(email && !email.includes('@placeholder.com'));
}

function buildNewProfessionalEmailHtml(professional: NewProfessionalAlertInput) {
    const name = professional.name || 'Nao informado';
    const username = professional.username || 'sem_username';
    const email = professional.email || 'Nao informado';

    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #7e22ce; margin: 0 0 8px 0;">Nova profissional na fila de ativacao</h1>
                <p style="font-size: 14px; color: #64748b; margin: 0;">Uma criadora concluiu o cadastro e precisa de acompanhamento da equipe.</p>
            </div>
            <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #581c87;">Dados da profissional</p>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #334155;"><strong>Nome:</strong> ${name}</p>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #334155;"><strong>Username:</strong> @${username}</p>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #334155;"><strong>E-mail:</strong> ${email}</p>
                <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.mimochat.com.br/activation" style="display: inline-block; background-color: #7e22ce; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px;">Abrir fila de ativacao</a>
            </div>
        </div>
    `;
}

export async function sendNewProfessionalTeamAlert(professional: NewProfessionalAlertInput) {
    try {
        await connectToDatabase();

        const teamMembers = await User.find({ isTeam: true })
            .select('clerkId email name username')
            .lean() as Array<{ clerkId: string; email?: string; name?: string; username?: string }>;

        if (teamMembers.length === 0) {
            console.warn('[TeamAlerts] Nenhum membro da equipe encontrado para alerta de nova profissional.');
            return;
        }

        const title = 'Nova profissional cadastrada';
        const body = `@${professional.username || 'sem_username'} concluiu o cadastro e entrou na fila de ativacao.`;
        const url = 'https://www.mimochat.com.br/activation';

        await Promise.allSettled(teamMembers.map((member) =>
            sendPushNotification(member.clerkId, title, body, {
                url,
                alertType: 'new_professional',
                professionalId: professional.clerkId,
            })
        ));

        if (!process.env.RESEND_API_KEY) {
            console.warn('[TeamAlerts] RESEND_API_KEY nao configurada; e-mails de equipe nao foram enviados.');
            return;
        }

        const settings = await AppSettings.findOne({ key: 'global' }).lean() as EmailSettings | null;
        const institutionalEmail = settings?.institutionalEmails?.[0] || 'viriatoceo@mimochat.com.br';
        const resend = new Resend(process.env.RESEND_API_KEY);
        const recipients = Array.from(new Set(teamMembers.map((member) => member.email).filter(isRealEmail))) as string[];

        if (recipients.length === 0) {
            console.warn('[TeamAlerts] Nenhum e-mail real encontrado para membros da equipe.');
            return;
        }

        await resend.emails.send({
            from: `"Mimo Ativacao" <${institutionalEmail}>`,
            to: recipients,
            subject: `[Mimo] Nova profissional cadastrada: ${professional.name || '@' + professional.username}`,
            html: buildNewProfessionalEmailHtml(professional),
        });
    } catch (error) {
        console.error('[TeamAlerts] Erro ao enviar alerta de nova profissional para equipe:', error);
    }
}
