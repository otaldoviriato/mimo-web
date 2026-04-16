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

        if (!user) {
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(userId);
                const email = clerkUser.emailAddresses[0]?.emailAddress || `user_${userId}@placeholder.com`;
                const username = clerkUser.username || `user_${userId.substring(userId.length - 8)}`;
                
                user = await User.create({
                    clerkId: userId,
                    email: email,
                    username: username,
                    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
                    balance: 0,
                    chargeMode: false,
                    chargePerChar: 0.002,
                });
            } catch (createError) {
                console.error("Error lazy creating user:", createError);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
        } else if (user.email.includes('@placeholder.com')) {
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(userId);
                const realEmail = clerkUser.emailAddresses[0]?.emailAddress;
                if (realEmail && realEmail !== user.email) {
                    user.email = realEmail;
                    await user.save();
                }
            } catch (err) {
                console.warn('Could not sync email from Clerk:', err);
            }
        }

        return NextResponse.json({
            user: {
                id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                name: user.name,
                email: user.email,
                phone: user.phone,
                taxId: user.taxId,
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
        const { username, name, photoUrl, chargeMode, chargePerChar, phone, taxId } = body;

        await connectToDatabase();

        const updateData: any = {};
        if (username !== undefined) updateData.username = username;
        if (name !== undefined) updateData.name = name.trim();
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
        if (chargeMode !== undefined) updateData.chargeMode = chargeMode;
        if (phone !== undefined) updateData.phone = phone;
        if (taxId !== undefined) updateData.taxId = taxId;
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
                    ...(updateData.username ? {} : { username: `user_${userId.substring(userId.length - 8)}` }),
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
                phone: user.phone,
                taxId: user.taxId,
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

// Forçando recompilação para limpar cache do Turbopack
