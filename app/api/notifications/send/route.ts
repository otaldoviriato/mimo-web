import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push';

// Endpoint interno chamado pelo mimo-chat-server para disparar push notifications via FCM.
// Protegido por um secret compartilhado (MIMO_NOTIFICATION_SECRET).
export async function POST(req: NextRequest) {
    try {
        const secret = req.headers.get('x-notification-secret');

        if (!secret || secret !== process.env.MIMO_NOTIFICATION_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, title, body, data } = await req.json();

        if (!userId || !title || !body) {
            return NextResponse.json({ error: 'userId, title and body are required' }, { status: 400 });
        }

        await sendPushNotification(userId, title, body, data);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Notifications/Send] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
