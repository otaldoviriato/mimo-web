import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

// GET /api/users/me - Get current user
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        let user = await User.findOne({ clerkId: userId });

        // Se usuário não existe, criar (Lazy creation)
        if (!user) {
            try {
                // Tenta buscar o email básico se disponível via Clerk (opcional, para inicialização)
                user = await User.create({
                    clerkId: userId,
                    email: `user_${userId}@placeholder.com`,
                    username: `user_${userId.substring(0, 8)}`,
                    balance: 0,
                    chargeMode: false,
                    chargePerChar: 0.002,
                });
            } catch (createError) {
                console.error("Error lazy creating user:", createError);
                return NextResponse.json({ error: 'User not found. Could not lazy create.' }, { status: 404 });
            }
        }

        // Se o nome não estiver preenchido no banco, tenta buscar do Clerk
        if (!user.name) {
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(userId);
                const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
                
                if (clerkName) {
                    const updatedUser = await User.findOneAndUpdate(
                        { clerkId: userId },
                        { $set: { name: clerkName } },
                        { new: true }
                    );
                    if (updatedUser) user = updatedUser;
                }
            } catch (clerkErr) {
                console.warn('Could not fetch name from Clerk:', clerkErr);
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
                balance: user.balance,
                chargeMode: user.chargeMode,
                chargePerChar: user.chargePerChar,
            },
        });
    } catch (error: any) {
        console.error('Error getting user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/users/me - Update current user
export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { username, name, photoUrl, chargeMode, chargePerChar } = body;

        await connectToDatabase();

        const updateData: any = {};
        if (username !== undefined) updateData.username = username;
        if (name !== undefined) updateData.name = name.trim();
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
        if (chargeMode !== undefined) updateData.chargeMode = chargeMode;
        if (chargePerChar !== undefined) {
            if (chargePerChar < 0) {
                return NextResponse.json({ error: 'Charge per char cannot be negative' }, { status: 400 });
            }
            updateData.chargePerChar = chargePerChar;
        }

        const user = await User.findOneAndUpdate(
            { clerkId: userId },
            {
                $set: updateData,
                $setOnInsert: {
                    email: `user_${userId}@placeholder.com`,
                    ...(updateData.username ? {} : { username: `user_${userId.substring(0, 8)}` }),
                    balance: 0
                }
            },
            { new: true, runValidators: true, upsert: true }
        );

        return NextResponse.json({
            user: {
                id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                balance: user.balance,
                chargeMode: user.chargeMode,
                chargePerChar: user.chargePerChar,
            },
        });
    } catch (error: any) {
        console.error('Error updating user:', error);

        if (error.code === 11000) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
