import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/users/username/[username] - Get user by exact username
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;

        if (!username) {
            return NextResponse.json({ error: 'Username required' }, { status: 400 });
        }

        // Decodifica e limpa o @ se presente na URL
        const cleanUsername = decodeURIComponent(username).replace('@', '');

        await connectToDatabase();

        let user = await User.findOne({ username: cleanUsername }).select(
            'clerkId username name email photoUrl coverUrl isProfessional subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers subscribers'
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Auto-popular name do Clerk se estiver vazio no banco
        if (!user.name) {
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(user.clerkId);
                const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
                
                if (clerkName) {
                    const updatedUser = await User.findOneAndUpdate(
                        { clerkId: user.clerkId },
                        { $set: { name: clerkName } },
                        { new: true }
                    );
                    if (updatedUser) user = updatedUser;
                }
            } catch (clerkErr) {
                console.warn('Could not fetch name from Clerk for user:', user.clerkId, clerkErr);
            }
        }

        return NextResponse.json({
            user: {
                id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                coverUrl: user.coverUrl,
                isProfessional: user.isProfessional,
                subscriptionPrice: user.subscriptionPrice || 0,
                chargePerCharSubscribers: user.chargePerCharSubscribers ?? 0.002,
                chargePerCharNonSubscribers: user.chargePerCharNonSubscribers ?? 0.005,
                subscribers: user.subscribers || [],
            },
        });
    } catch (error: any) {
        console.error('Error getting user by username:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
