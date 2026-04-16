import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/users/search?username=@username
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const username = searchParams.get('username');

        if (!username) {
            return NextResponse.json({ error: 'Username parameter required' }, { status: 400 });
        }

        const cleanUsername = username.replace('@', '');

        await connectToDatabase();

        // Busca o próprio usuário para saber seu chargeMode
        const me = await User.findOne({ clerkId: userId }).select('chargeMode').lean() as any;
        const myChargeMode = me?.chargeMode ?? false;

        const foundUser = await User.findOne({
            username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') },
            clerkId: { $ne: userId },
        }).select('clerkId username email photoUrl chargeMode chargePerChar');

        if (!foundUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Só permite buscar o oposto: quem cobra busca quem não cobra, e vice-versa
        if (foundUser.chargeMode === myChargeMode) {
            return NextResponse.json(
                { error: 'incompatible_charge_mode' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            user: {
                id: foundUser._id,
                clerkId: foundUser.clerkId,
                username: foundUser.username,
                email: foundUser.email,
                photoUrl: foundUser.photoUrl,
                chargeMode: foundUser.chargeMode,
                chargePerChar: foundUser.chargePerChar,
            },
        });
    } catch (error: any) {
        console.error('Error searching user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
