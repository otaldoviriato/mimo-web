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

        const tokens: string[] = [];
        if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
            tokens.push(...user.fcmTokens);
        }
        if (user.fcmToken && !tokens.includes(user.fcmToken)) {
            tokens.push(user.fcmToken);
        }

        if (tokens.length === 0) {
            console.warn(`[Push] O usuário ${userId} (${user.username}) não possui tokens de push cadastrados.`);
            return { error: 'Token missing' };
        }

        console.log(`[Push] ${tokens.length} token(s) encontrado(s) para ${user.username} (ID: ${userId})`);

        if (!adminMessaging) {
            console.error('[Push] Firebase Admin não configurado. Verifique FIREBASE_SERVICE_ACCOUNT no .env');
            return { error: 'Firebase Admin not configured' };
        }

        console.log(`[Push] Contexto do envio:`, { title, body, hasData: !!data });
        console.log(`[Push] Enviando via Firebase Admin (FCM Multicast)...`);

        const payload: any = {
            tokens: tokens,
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
                    badge: '/notification-badge.png',
                    tag: 'mimo-message',
                    vibrate: [200, 100, 200],
                },
                fcmOptions: {
                    link: data?.url || 'https://www.mimochat.com.br/chats'
                }
            }
        };

        console.log('[Push] Payload final:', JSON.stringify(payload, null, 2));

        try {
            const response = await adminMessaging.sendEachForMulticast(payload);
            console.log(`[Push] ✓ Processamento multicast concluído. Sucessos: ${response.successCount}, Falhas: ${response.failureCount}`);

            const tokensToRemove: string[] = [];
            response.responses.forEach((res, idx) => {
                if (!res.success && res.error) {
                    const token = tokens[idx];
                    console.warn(`[Push] Falha no token ${token.substring(0, 10)}... - Código do Erro: ${res.error.code}`);
                    
                    if (
                        res.error.code === 'messaging/registration-token-not-registered' ||
                        res.error.code === 'messaging/invalid-argument'
                    ) {
                        tokensToRemove.push(token);
                    }
                }
            });

            if (tokensToRemove.length > 0) {
                console.log(`[Push] Removendo ${tokensToRemove.length} token(s) inválido(s) do usuário ${userId}`);
                await User.updateOne(
                    { clerkId: userId },
                    {
                        $pull: { fcmTokens: { $in: tokensToRemove } },
                        ...(user.fcmToken && tokensToRemove.includes(user.fcmToken) ? { $unset: { fcmToken: "" } } : {})
                    }
                );
            }

            return { success: true, successCount: response.successCount, failureCount: response.failureCount };
        } catch (error: any) {
            console.error('[Push] ✗ Erro ao enviar lote multicast via Firebase:', error.message);
            return { error: error.message, code: error.code };
        }

        console.log(`[Push] Processo de envio finalizado para ${userId}`);
    } catch (error) {
        console.error(`[Push] Falha geral ao enviar push para ${userId}:`, error);
    }
}
