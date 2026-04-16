import { User } from '@/models/User';
import { adminMessaging } from './firebase-admin';

export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
    try {
        await (await import('./db')).connectToDatabase();
        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            console.error(`[Push] Usuário ${userId} não encontrado no banco de dados.`);
            return { error: 'User not found' };
        }

        if (!user.expoPushToken) {
            console.warn(`[Push] O usuário ${userId} (${user.username}) não possui expoPushToken cadastrado.`);
            return { error: 'Token missing' };
        }

        const pushToken = user.expoPushToken;
        console.log(`[Push] Token encontrado para ${user.username}: ${pushToken.substring(0, 15)}...`);

        console.log(`[Push] Enviando via Firebase Admin (FCM) para o usuário ${userId}...`);
        
        if (!adminMessaging) {
            console.error('[Push] Firebase Admin não configurado. Verifique FIREBASE_SERVICE_ACCOUNT no .env');
            return;
        }

        const payload: any = {
            token: pushToken,
            notification: {
                title,
                body,
            },
            data: data ? Object.entries(data).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}) : {},
            webpush: {
                notification: {
                    title,
                    body,
                    icon: '/icon-192x192.png',
                    badge: '/icon-192x192.png',
                    tag: 'mimo-message',
                },
                fcmOptions: {
                    link: data?.url || 'https://www.mimochat.com.br/chats'
                }
            }
        };

        console.log('[Push] Payload final:', JSON.stringify(payload, null, 2));

        try {
            const response = await adminMessaging.send(payload);
            console.log('[Push] Sucesso ao enviar via Firebase:', response);
        } catch (error: any) {
            console.error('[Push] Erro ao enviar via Firebase:', error.message);
            
            // Se o token for inválido, podemos removê-lo do banco para evitar retentativas inúteis
            if (error.code === 'messaging/registration-token-not-registered') {
                console.log(`[Push] Removendo token inválido do usuário ${userId}`);
                await User.updateOne({ clerkId: userId }, { $unset: { expoPushToken: "" } });
            }
        }

        console.log(`[Push] Processo de envio finalizado para ${userId}`);
    } catch (error) {
        console.error(`[Push] Falha geral ao enviar push para ${userId}:`, error);
    }
}
