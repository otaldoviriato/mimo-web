import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';
import { AdminAlertPreference } from '@/models/AdminAlertPreference';
import { sendPushNotification } from '@/lib/push';
import { Resend } from 'resend';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function sendAdminAlert(
    type: 'new_professional' | 'new_client_brought',
    payload: {
        title: string;
        body: string;
        emailSubject: string;
        emailHtml: string;
        url?: string;
    }
) {
    try {
        await connectToDatabase();

        // 1. Obter lista de Administradores
        const settings = await AppSettings.findOne({ key: 'global' });
        let adminClerkIds: string[] = settings?.adminClerkIds || [FALLBACK_ADMIN];
        if (!adminClerkIds.includes(FALLBACK_ADMIN)) {
            adminClerkIds.push(FALLBACK_ADMIN);
        }

        if (adminClerkIds.length === 0) {
            console.warn('[AdminAlerts] Nenhum administrador cadastrado para receber alertas.');
            return;
        }

        // Buscar dados dos administradores (e-mails cadastrados)
        const adminUsers = await User.find({ clerkId: { $in: adminClerkIds } }).select('clerkId email name').lean();
        const adminUsersMap = new Map(adminUsers.map(u => [u.clerkId, u]));

        // Configurar Resend se houver chave de API
        const resendApiKey = process.env.RESEND_API_KEY;
        const resend = resendApiKey ? new Resend(resendApiKey) : null;
        const institutionalEmail = settings?.institutionalEmails?.[0] || 'viriatoceo@mimochat.com.br';
        const senderFrom = `"MimoChat Admin" <${institutionalEmail}>`;

        console.log(`[AdminAlerts] Processando alerta "${type}" para ${adminClerkIds.length} administrador(es)...`);

        for (const adminId of adminClerkIds) {
            try {
                // Carregar preferência individual do admin (ou usar defaults se ainda não salvo)
                const pref = await AdminAlertPreference.findOne({ clerkId: adminId });
                const prefObj = pref || {
                    clerkId: adminId,
                    email: '',
                    newProfessionalAlert: true,
                    newClientBroughtAlert: true,
                    pushEnabled: true,
                    emailEnabled: true,
                };

                // Verificar se o alerta do tipo específico está ativado
                const isAlertActive = type === 'new_professional'
                    ? prefObj.newProfessionalAlert
                    : prefObj.newClientBroughtAlert;

                if (!isAlertActive) {
                    console.log(`[AdminAlerts] Alerta "${type}" desativado nas preferências do admin ${adminId}`);
                    continue;
                }

                // ─── 1. DISPARO DE PUSH NOTIFICATION (PWA / FCM / EXPO) ───────────────────
                if (prefObj.pushEnabled !== false) {
                    try {
                        console.log(`[AdminAlerts] Disparando Push para admin ${adminId}...`);
                        await sendPushNotification(adminId, payload.title, payload.body, {
                            url: payload.url || 'https://www.mimochat.com.br/admin',
                            alertType: type
                        });
                    } catch (pushErr: any) {
                        console.error(`[AdminAlerts] Erro ao enviar Push para admin ${adminId}:`, pushErr?.message || pushErr);
                    }
                }

                // ─── 2. DISPARO REDUNDANTE DE E-MAIL (RESEND) ──────────────────────────────
                if (prefObj.emailEnabled !== false && resend) {
                    const adminUser = adminUsersMap.get(adminId);
                    const destinationEmail = (prefObj.email && prefObj.email.trim() !== '')
                        ? prefObj.email.trim()
                        : adminUser?.email;

                    if (destinationEmail && !destinationEmail.includes('@placeholder.com')) {
                        try {
                            console.log(`[AdminAlerts] Enviando E-mail redundante para admin ${destinationEmail}...`);
                            await resend.emails.send({
                                from: senderFrom,
                                to: destinationEmail,
                                subject: payload.emailSubject,
                                html: payload.emailHtml
                            });
                            console.log(`[AdminAlerts] ✓ E-mail enviado com sucesso para ${destinationEmail}`);
                        } catch (emailErr: any) {
                            console.error(`[AdminAlerts] Erro ao enviar E-mail para admin ${destinationEmail}:`, emailErr?.message || emailErr);
                        }
                    } else {
                        console.warn(`[AdminAlerts] E-mail de destino não configurado ou inválido para o admin ${adminId}`);
                    }
                }
            } catch (singleAdminErr: any) {
                console.error(`[AdminAlerts] Erro ao processar alertas para o admin ${adminId}:`, singleAdminErr);
            }
        }
    } catch (globalErr: any) {
        console.error('[AdminAlerts] Erro geral ao processar disparo de alerta do admin:', globalErr);
    }
}
