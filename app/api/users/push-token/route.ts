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

        const { expoPushToken } = body;

        // Permitimos nulo/vazio para remover o token (logout)
        if (expoPushToken === undefined) {
            return NextResponse.json({ error: 'expoPushToken is required' }, { status: 400 });
        }

        await connectToDatabase();

        await User.findOneAndUpdate(
            { clerkId: userId },
            {
                $set: { expoPushToken: expoPushToken },
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

        return NextResponse.json({ success: true, message: 'Push token updated successfully' });
    } catch (error: any) {
        console.error('Push token error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
