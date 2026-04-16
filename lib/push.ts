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

        console.log(`[Push] Tentando enviar notificação para o usuário ${userId} no token: ${pushToken}`);

        // O expo-server-sdk pode enviar para tokens nativos (FCM/APNs) se configurado no painel da Expo.
        // Vamos tentar enviar mesmo que não seja o formato padrão ExponentPushToken[...]
        if (!Expo.isExpoPushToken(pushToken)) {
            console.log(`[Push] O token ${pushToken} não é um token Expo padrão, mas tentaremos enviar como token nativo.`);
        }

        const messages: ExpoPushMessage[] = [{
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
        }];

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('[Push] Error sending chunk', error);
            }
        }

        console.log(`[Push] Notification sent to ${userId}: ${title}`);
    } catch (error) {
        console.error(`[Push] Failed to send push notification to ${userId}:`, error);
    }
}
