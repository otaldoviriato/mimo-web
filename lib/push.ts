import { User } from '@/models/User';
import { adminMessaging } from './firebase-admin';

export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
    try {
        await (await import('./db')).connectToDatabase();
        const user = await User.findOne({ clerkId: userId });

        if (!user || !user.expoPushToken) {
            console.log(`[Push] Nenhum token cadastrado para o usuário ${userId}`);
            return;
        }

        const pushToken = user.expoPushToken;

        console.log(`[Push] Enviando via Firebase Admin (FCM) para o usuário ${userId}...`);
        
        if (!adminMessaging) {
            console.error('[Push] Firebase Admin não configurado. Verifique FIREBASE_SERVICE_ACCOUNT no .env');
            return;
        }

        try {
            const response = await adminMessaging.send({
                token: pushToken,
                notification: {
                    title,
                    body,
                },
                data: data ? Object.entries(data).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}) : undefined,
                webpush: {
                    notification: {
                        icon: '/icon-192x192.jpeg',
                        badge: '/icon-192x192.jpeg',
                        vibrate: [100, 50, 100],
                        data: data,
                    },
                    fcmOptions: {
                        link: data?.url || 'https://www.mimochat.com.br/chats'
                    }
                }
            });
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
