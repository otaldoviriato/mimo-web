import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { User } from '@/models/User';

const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
});

export async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
    try {
        const user = await User.findOne({ clerkId: userId });

        if (!user || !user.expoPushToken) {
            console.log(`[Push] No push token for user ${userId}`);
            return;
        }

        const pushToken = user.expoPushToken;

        const isExpoToken = Expo.isExpoPushToken(pushToken);
        if (!isExpoToken) {
            console.warn(`[Push] O token ${pushToken.substring(0, 10)}... não é um formato Expo padrão. Certifique-se de que o FCM está configurado no painel da Expo para PWAs.`);
        }

        const message = {
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
        };

        console.log(`[Push] Enviando notificação para Expo (${isExpoToken ? 'Expo Token' : 'Native/Web Token'})...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(process.env.EXPO_ACCESS_TOKEN ? { 'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
                },
                body: JSON.stringify(message),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[Push] Erro na API da Expo:', errorData);
                return;
            }

            const result = await response.json();
            console.log('[Push] Resposta da Expo:', JSON.stringify(result));

            if (result.data && result.data.status === 'error') {
                console.error(`[Push] Erro no ticket: ${result.data.message}`);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.error('[Push] Timeout ao chamar API da Expo (8s)');
            } else {
                console.error('[Push] Erro na requisição para Expo:', error.message);
            }
        }

        console.log(`[Push] Processo de envio finalizado para ${userId}`);
    } catch (error) {
        console.error(`[Push] Falha geral ao enviar push para ${userId}:`, error);
    }
}
