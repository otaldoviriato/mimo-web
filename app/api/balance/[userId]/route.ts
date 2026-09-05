import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { autoHealUserBalanceIfDivergent } from '@/lib/wallet';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const { userId: authUserId } = await auth();

        // Garantir que o usuário só acessa seu próprio saldo
        if (!authUserId || authUserId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const effectiveBalance = await autoHealUserBalanceIfDivergent(user);

        return NextResponse.json({ balance: effectiveBalance.totalBalance });

    } catch (error) {
        console.error('Error fetching balance:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
