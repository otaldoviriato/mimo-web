import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';

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
                    isProfessional: false,
                    chargePerCharSubscribers: 0.002,
                    chargePerCharNonSubscribers: 0.005,
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
                    try {
                        user.email = realEmail;
                        await user.save();
                    } catch (saveErr: any) {
                        if (saveErr.code === 11000) {
                            console.warn('Email already exists in another account, skipping sync:', realEmail);
                        } else {
                            throw saveErr;
                        }
                    }
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
                isProfessional: user.isProfessional,
                subscriptionPrice: user.subscriptionPrice || 0,
                chargePerCharSubscribers: user.chargePerCharSubscribers ?? 0.002,
                chargePerCharNonSubscribers: user.chargePerCharNonSubscribers ?? 0.005,
                subscribers: user.subscribers || [],
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
        const { username, name, photoUrl, phone, taxId, isProfessional, subscriptionPrice, chargePerCharSubscribers, chargePerCharNonSubscribers } = body;

        await connectToDatabase();

        const currentUser = await User.findOne({ clerkId: userId });

        // Valida mudança de isProfessional (mesma lógica que era do chargeMode)
        if (isProfessional !== undefined && currentUser && isProfessional !== currentUser.isProfessional) {
            if (currentUser.balance > 0) {
                return NextResponse.json(
                    { error: 'Você só pode alterar o status profissional com saldo zerado' },
                    { status: 400 }
                );
            }
        }

        const isProfessionalChanging =
            isProfessional !== undefined &&
            currentUser &&
            isProfessional !== currentUser.isProfessional;

        const updateData: any = {};
        if (username !== undefined) updateData.username = username;
        if (name !== undefined) updateData.name = name.trim();
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
        if (phone !== undefined) updateData.phone = phone;
        if (taxId !== undefined) updateData.taxId = taxId;
        
        if (isProfessional !== undefined) updateData.isProfessional = isProfessional;
        
        if (subscriptionPrice !== undefined) {
            if (subscriptionPrice < 0) return NextResponse.json({ error: 'Subscription price cannot be negative' }, { status: 400 });
            updateData.subscriptionPrice = subscriptionPrice;
        }

        if (chargePerCharSubscribers !== undefined) {
            if (chargePerCharSubscribers < 0) return NextResponse.json({ error: 'Charge per char cannot be negative' }, { status: 400 });
            updateData.chargePerCharSubscribers = chargePerCharSubscribers;
        }

        if (chargePerCharNonSubscribers !== undefined) {
            if (chargePerCharNonSubscribers < 0) return NextResponse.json({ error: 'Charge per char cannot be negative' }, { status: 400 });
            updateData.chargePerCharNonSubscribers = chargePerCharNonSubscribers;
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
            { returnDocument: 'after', runValidators: true, upsert: true }
        );

        // Se isProfessional mudou, deleta todas as conversas do usuário
        if (isProfessionalChanging) {
            const rooms = await Room.find({ participants: userId }).select('_id').lean();
            const roomIds = rooms.map((r: any) => r._id);

            await Promise.all([
                Room.deleteMany({ participants: userId }),
                Message.deleteMany({ roomId: { $in: roomIds } }),
            ]);
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
                isProfessional: user.isProfessional,
                subscriptionPrice: user.subscriptionPrice || 0,
                chargePerCharSubscribers: user.chargePerCharSubscribers ?? 0.002,
                chargePerCharNonSubscribers: user.chargePerCharNonSubscribers ?? 0.005,
                subscribers: user.subscribers || [],
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
