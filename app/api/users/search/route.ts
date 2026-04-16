import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/users/search?username=@username
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const username = searchParams.get('username');

        if (!username) {
            return NextResponse.json({ error: 'Username parameter required' }, { status: 400 });
        }

        // Remove @ se presente para a busca
        const cleanUsername = username.replace('@', '');

        await connectToDatabase();

        const user = await User.findOne({
            username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') }
        }).select('clerkId username email photoUrl chargeMode chargePerChar');

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                email: user.email,
                photoUrl: user.photoUrl,
                chargeMode: user.chargeMode,
                chargePerChar: user.chargePerChar,
            },
        });
    } catch (error: any) {
        console.error('Error searching user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
