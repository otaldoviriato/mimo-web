import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function PATCH() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOneAndUpdate(
            { clerkId: userId },
            {
                $set: {
                    isSuspended: true,
                    suspendedAt: new Date(),
                    fcmToken: '',
                    fcmTokens: [],
                    isOnline: false,
                    lastSeen: new Date(),
                },
            },
            { returnDocument: 'after' }
        );

        if (!user) {
            return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error suspending user account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOneAndUpdate(
            { clerkId: userId },
            { $set: {
                isSuspended: true,
                suspendedAt: new Date(),
                accountDeletionRequestedAt: new Date(),
                isOnline: false,
                fcmToken: '',
                fcmTokens: [],
            } },
            { new: true },
        );
        if (!user) return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });

        return NextResponse.json({ success: true, retainedForAudit: true });
    } catch (error) {
        console.error('Error deleting user account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
