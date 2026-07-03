import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/users/check-username?username=xxx - Verifica se um username está disponível
// (ignora o próprio usuário autenticado, permitindo salvar sem alterar o username)
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rawUsername = request.nextUrl.searchParams.get('username') || '';
        const cleanUsername = rawUsername.trim().toLowerCase().replace('@', '');

        if (!cleanUsername || cleanUsername.length < 2 || !/^[a-z0-9._-]+$/.test(cleanUsername)) {
            return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
        }

        await connectToDatabase();

        const existing = await User.findOne({
            username: cleanUsername,
            clerkId: { $ne: userId },
        }).select('_id');

        return NextResponse.json({ available: !existing });
    } catch (error: any) {
        console.error('Error checking username availability:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
