import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { sendPushNotification } from '@/lib/push';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId });

        if (!user || !user.expoPushToken) {
            return NextResponse.json({ 
                error: 'Token não encontrado', 
                details: 'Certifique-se de que deu permissão de notificações no navegador.' 
            }, { status: 404 });
        }

        console.log(`[Test Notification] Disparando teste para ${user.username}...`);

        await sendPushNotification(
            userId,
            'Teste de Notificação 🚀',
            'Sua configuração de notificações está funcionando perfeitamente!'
        );

        return NextResponse.json({ success: true, message: 'Notificação de teste enviada!' });

    } catch (error: any) {
        console.error('Error in test notification route:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
