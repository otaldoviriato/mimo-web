import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

// POST /api/users/push-token - Update Expo Push Token for current user
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body: any = {};
        try {
            body = await request.json();
        } catch (e) {
            console.error('Error parsing body:', e);
        }

        const { fcmToken } = body;

        // Permitimos nulo/vazio para remover o token (logout)
        if (fcmToken === undefined) {
            return NextResponse.json({ error: 'fcmToken is required' }, { status: 400 });
        }

        await connectToDatabase();

        console.log(`[Push Token API] Salvando token para ${userId}: ${fcmToken.substring(0, 10)}...`);

        const updatedUser = await User.findOneAndUpdate(
            { clerkId: userId },
            {
                $set: { fcmToken: fcmToken },
                $setOnInsert: {
                    email: `user_${userId}@placeholder.com`,
                    username: `user_${userId.substring(0, 8)}`,
                    balance: 0,
                    chargeMode: false,
                    chargePerChar: 0.002
                }
            },
            { returnDocument: 'after', upsert: true }
        );

        console.log(`[Push Token API] Usuário atualizado. fcmToken no doc: ${updatedUser?.fcmToken ? 'SIM' : 'NÃO'}`);

        return NextResponse.json({ success: true, message: 'Push token updated successfully' });
    } catch (error: any) {
        console.error('Push token error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
