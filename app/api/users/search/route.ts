import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

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
        const query = searchParams.get('username') || searchParams.get('query');

        if (!query) {
            return NextResponse.json({ error: 'Search query required' }, { status: 400 });
        }

        const cleanQuery = query.replace('@', '');

        await connectToDatabase();



        const foundUsers = await User.find({
            $or: [
                { username: { $regex: new RegExp(cleanQuery, 'i') } },
                { name: { $regex: new RegExp(cleanQuery, 'i') } }
            ],
            clerkId: { $ne: userId },
            isProfessional: true,
            professionalStatus: 'approved',
        }).select('clerkId username name email photoUrl coverUrl isProfessional subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers').limit(20).lean() as any[];

        if (!foundUsers || foundUsers.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Ordenação manual: Exact username matches primeiro
        const sortedUsers = foundUsers.sort((a, b) => {
            const aExact = a.username.toLowerCase() === cleanQuery.toLowerCase();
            const bExact = b.username.toLowerCase() === cleanQuery.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return 0;
        });

        const settings = await AppSettings.findOne({ key: 'global' }).select('defaultPricePerCharSubscribers defaultPricePerCharNonSubscribers').lean();
        const defaultSub = settings?.defaultPricePerCharSubscribers ?? 0.002;
        const defaultNonSub = settings?.defaultPricePerCharNonSubscribers ?? 0.005;

        return NextResponse.json({
            users: sortedUsers.map(u => ({
                id: u._id,
                clerkId: u.clerkId,
                username: u.username,
                name: u.name,
                email: u.email,
                photoUrl: u.photoUrl,
                coverUrl: u.coverUrl,
                isProfessional: u.isProfessional,
                subscriptionPrice: u.subscriptionPrice || 0,
                chargePerCharSubscribers: u.chargePerCharSubscribers ?? defaultSub,
                chargePerCharNonSubscribers: u.chargePerCharNonSubscribers ?? defaultNonSub,
            })),
        });
    } catch (error: any) {
        console.error('Error searching user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
