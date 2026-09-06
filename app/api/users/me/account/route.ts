import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
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

        // 1. Deletar do MongoDB (independentemente de ter saldo)
        const deletedUser = await User.findOneAndDelete({ clerkId: userId });
        if (!deletedUser) {
            return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
        }

        // 2. Deletar do Clerk para permitir que o usuário recrie conta caso queira
        try {
            const client = await clerkClient();
            await client.users.deleteUser(userId);
        } catch (clerkErr: any) {
            console.warn('Falha ao excluir usuário do Clerk (pode já ter sido removido):', clerkErr);
        }

        return NextResponse.json({ success: true, message: 'Conta excluída com sucesso.' });
    } catch (error) {
        console.error('Error deleting user account:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
