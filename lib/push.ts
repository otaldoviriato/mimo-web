import { User } from '@/models/User';
import { adminMessaging } from './firebase-admin';

type PushData = Record<string, unknown>;
type ExpoTicket = {
    status?: string;
    details?: {
        error?: string;
    };
};

function isExpoPushToken(token: string) {
    return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

function stringifyPushData(data?: PushData) {
    return data ? Object.entries(data).reduce((acc, [key, value]) => ({ ...acc, [key]: String(value) }), {}) : {};
}

async function removeInvalidTokens(userId: string, currentToken: string | undefined, tokensToRemove: string[]) {
    if (tokensToRemove.length === 0) return;

    await User.updateOne(
        { clerkId: userId },
        {
            $pull: { fcmTokens: { $in: tokensToRemove } },
            ...(currentToken && tokensToRemove.includes(currentToken) ? { $unset: { fcmToken: '' } } : {})
        }
    );
}

async function sendExpoPushNotifications(tokens: string[], title: string, body: string, data?: PushData) {
    if (tokens.length === 0) {
        return { successCount: 0, failureCount: 0, tokensToRemove: [] as string[] };
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokens.map((to) => ({
            to,
            sound: 'default',
            title,
            body,
            data: data || {},
        }))),
    });

    const result = await response.json();
    const tickets = Array.isArray(result?.data) ? result.data : [];
    const tokensToRemove: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    tickets.forEach((ticket: ExpoTicket, index: number) => {
        if (ticket?.status === 'ok') {
            successCount++;
            return;
        }

        failureCount++;
        if (ticket?.details?.error === 'DeviceNotRegistered') {
            tokensToRemove.push(tokens[index]);
        }
    });

    if (!response.ok && tickets.length === 0) {
        failureCount = tokens.length;
        console.error('[Push] Expo push request failed:', result);
    }

    return { successCount, failureCount, tokensToRemove };
}

async function sendFcmPushNotifications(tokens: string[], title: string, body: string, data?: PushData) {
    if (tokens.length === 0) {
        return { successCount: 0, failureCount: 0, tokensToRemove: [] as string[] };
    }

    if (!adminMessaging) {
        console.error('[Push] Firebase Admin nao configurado. Verifique FIREBASE_SERVICE_ACCOUNT no .env');
        return { successCount: 0, failureCount: tokens.length, tokensToRemove: [] as string[] };
    }

    const response = await adminMessaging.sendEachForMulticast({
        tokens,
        notification: {
            title,
            body,
        },
        data: stringifyPushData(data),
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
                link: typeof data?.url === 'string' ? data.url : 'https://www.mimochat.com.br/chats',
            }
        }
    });

    const tokensToRemove: string[] = [];
    response.responses.forEach((res, index) => {
        if (!res.success && res.error) {
            const token = tokens[index];
            console.warn(`[Push] Falha no token ${token.substring(0, 10)}... - Codigo do Erro: ${res.error.code}`);

            if (
                res.error.code === 'messaging/registration-token-not-registered' ||
                res.error.code === 'messaging/invalid-argument'
            ) {
                tokensToRemove.push(token);
            }
        }
    });

    return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        tokensToRemove,
    };
}

export async function sendPushNotification(userId: string, title: string, body: string, data?: PushData) {
    try {
        await (await import('./db')).connectToDatabase();
        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            console.error(`[Push] Usuario ${userId} nao encontrado no banco de dados.`);
            return { error: 'User not found' };
        }

        const tokens = Array.from(new Set([
            ...(Array.isArray(user.fcmTokens) ? user.fcmTokens : []),
            ...(user.fcmToken ? [user.fcmToken] : []),
        ].filter(Boolean)));

        if (tokens.length === 0) {
            console.warn(`[Push] O usuario ${userId} (${user.username}) nao possui tokens de push cadastrados.`);
            return { error: 'Token missing' };
        }

        const expoTokens = tokens.filter(isExpoPushToken);
        const fcmTokens = tokens.filter((token) => !isExpoPushToken(token));
        const tokensToRemove: string[] = [];
        let successCount = 0;
        let failureCount = 0;

        if (expoTokens.length > 0) {
            try {
                const expoResult = await sendExpoPushNotifications(expoTokens, title, body, data);
                successCount += expoResult.successCount;
                failureCount += expoResult.failureCount;
                tokensToRemove.push(...expoResult.tokensToRemove);
            } catch (error: unknown) {
                failureCount += expoTokens.length;
                console.error('[Push] Erro ao enviar via Expo:', error instanceof Error ? error.message : error);
            }
        }

        if (fcmTokens.length > 0) {
            try {
                const fcmResult = await sendFcmPushNotifications(fcmTokens, title, body, data);
                successCount += fcmResult.successCount;
                failureCount += fcmResult.failureCount;
                tokensToRemove.push(...fcmResult.tokensToRemove);
            } catch (error: unknown) {
                failureCount += fcmTokens.length;
                console.error('[Push] Erro ao enviar via Firebase:', error instanceof Error ? error.message : error);
            }
        }

        await removeInvalidTokens(userId, user.fcmToken, tokensToRemove);
        return { success: true, successCount, failureCount };
    } catch (error) {
        console.error(`[Push] Falha geral ao enviar push para ${userId}:`, error);
        return { error: 'Internal push error' };
    }
}
