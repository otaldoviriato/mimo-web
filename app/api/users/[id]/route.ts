import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

// GET /api/users/[id] - Get user by Clerk ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        await connectToDatabase();

        let user = await User.findOne({ clerkId: id }).select(
            'clerkId username name email photoUrl chargeMode chargePerChar'
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Auto-popular name do Clerk se estiver vazio no banco
        if (!user.name) {
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(id);
                const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
                
                if (clerkName) {
                    const updatedUser = await User.findOneAndUpdate(
                        { clerkId: id },
                        { $set: { name: clerkName } },
                        { new: true }
                    );
                    if (updatedUser) user = updatedUser;
                }
            } catch (clerkErr) {
                console.warn('Could not fetch name from Clerk for user:', id, clerkErr);
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
                chargeMode: user.chargeMode,
                chargePerChar: user.chargePerChar,
            },
        });
    } catch (error: any) {
        console.error('Error getting user by ID:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
