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

        console.log(`[Test Notification] User found:`, {
            id: user?._id,
            clerkId: user?.clerkId,
            hasFcmToken: !!user?.fcmToken,
            fcmTokenValue: user?.fcmToken,
            rawFields: user ? Object.keys(user.toObject ? user.toObject() : user) : 'null'
        });

        if (!user || !user.fcmToken) {
            console.log(`[Test Notification] Usuário ${userId} não tem token cadastrado. (User present: ${!!user})`);
            return NextResponse.json({ 
                error: 'Token não encontrado', 
                details: 'Certifique-se de que deu permissão de notificações no navegador.' 
            }, { status: 404 });
        }

        console.log(`[Test Notification] Disparando teste para ${user.username}...`);
        console.log(`[Test Notification] Token: ${user.fcmToken.substring(0, 15)}...`);

        await sendPushNotification(
            userId,
            'Teste de Notificação 🚀',
            'Sua configuração de notificações está funcionando perfeitamente!'
        );

        return NextResponse.json({ 
            success: true, 
            message: 'Notificação de teste enviada!',
        });

    } catch (error: any) {
        console.error('Error in test notification route:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
