import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, type ICard } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';

// GET /api/users/me - Get current user
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' });
        const maxPricePerChar = settings?.maxPricePerChar ?? 0.2;
        const maxSubscriptionPrice = settings?.maxSubscriptionPrice ?? 200;
        const minSubscriptionPrice = settings?.minSubscriptionPrice ?? 10;
        const subscriberDiscountPercentage = settings?.subscriberDiscountPercentage ?? 20;

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
            } catch (createError: any) {
                if (createError.code === 11000) {
                    user = await User.findOne({ clerkId: userId });
                    if (user) {
                        console.log(`💡 Concorrência de cadastro: Usuário ${userId} inserido concorrentemente.`);
                    }
                }
                if (!user) {
                    console.error("Error lazy creating user:", createError);
                    return NextResponse.json({ error: 'User not found' }, { status: 404 });
                }
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
                coverUrl: user.coverUrl,
                balance: user.balance,
                isProfessional: user.isProfessional,
                subscriptionPrice: user.subscriptionPrice || 0,
                isSubscriptionEnabled: user.isSubscriptionEnabled ?? false,
                chargePerCharSubscribers: user.chargePerCharSubscribers ?? 0.002,
                chargePerCharNonSubscribers: user.chargePerCharNonSubscribers ?? 0.005,
                subscribers: user.subscribers || [],
                pixKey: user.pixKey,
                savedCards: (user.savedCards || []).map((card: ICard) => ({
                    id: card.id,
                    label: card.label,
                    lastFour: card.lastFour,
                    brand: card.brand,
                    canUseForPayments: Boolean(card.token && card.asaasCustomerId),
                    createdAt: card.createdAt,
                })),
                bio: user.bio || '',
                maxPricePerChar,
                maxSubscriptionPrice,
                minSubscriptionPrice,
                subscriberDiscountPercentage,
                minPublicPhotos: settings?.minPublicPhotos ?? 6,
                maxPublicPhotos: settings?.maxPublicPhotos ?? 12,
                minExclusivePhotos: settings?.minExclusivePhotos ?? 2,
                maxExclusivePhotos: settings?.maxExclusivePhotos ?? 4,
                emailNotificationsEnabled: user.emailNotificationsEnabled ?? false,
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
        const { username, name, photoUrl, coverUrl, phone, taxId, pixKey, isProfessional, subscriptionPrice, isSubscriptionEnabled, chargePerCharSubscribers, chargePerCharNonSubscribers, bio, emailNotificationsEnabled } = body;

        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' });
        const maxPricePerChar = settings?.maxPricePerChar ?? 0.2;
        const maxSubscriptionPrice = settings?.maxSubscriptionPrice ?? 200;
        const minSubscriptionPrice = settings?.minSubscriptionPrice ?? 10;
        const subscriberDiscountPercentage = settings?.subscriberDiscountPercentage ?? 20;

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
        if (coverUrl !== undefined) updateData.coverUrl = coverUrl;
        if (phone !== undefined) updateData.phone = phone;
        if (taxId !== undefined) updateData.taxId = taxId;
        if (pixKey !== undefined) updateData.pixKey = pixKey;
        
        if (isProfessional !== undefined) updateData.isProfessional = isProfessional;
        
        if (isSubscriptionEnabled !== undefined) {
            updateData.isSubscriptionEnabled = Boolean(isSubscriptionEnabled);
        }

        const currentIsSubscriptionEnabled = isSubscriptionEnabled !== undefined ? Boolean(isSubscriptionEnabled) : (currentUser?.isSubscriptionEnabled ?? false);
        const currentSubscriptionPrice = subscriptionPrice !== undefined ? Number(subscriptionPrice) : (currentUser?.subscriptionPrice ?? 0);

        if (subscriptionPrice !== undefined) {
            if (subscriptionPrice < 0) return NextResponse.json({ error: 'Subscription price cannot be negative' }, { status: 400 });
            if (subscriptionPrice > maxSubscriptionPrice) {
                return NextResponse.json({ error: `O preço da assinatura não pode ser maior que R$ ${maxSubscriptionPrice}` }, { status: 400 });
            }
            updateData.subscriptionPrice = subscriptionPrice;
        }

        if (currentIsSubscriptionEnabled) {
            if (currentSubscriptionPrice <= 0) {
                return NextResponse.json({ error: 'O preço da assinatura deve ser maior que zero ao habilitar o recurso' }, { status: 400 });
            }
            if (currentSubscriptionPrice < minSubscriptionPrice) {
                return NextResponse.json({ error: `O preço mínimo da assinatura é R$ ${minSubscriptionPrice.toFixed(2)}` }, { status: 400 });
            }
        }

        if (chargePerCharSubscribers !== undefined) {
            if (chargePerCharSubscribers < 0) return NextResponse.json({ error: 'Charge per char cannot be negative' }, { status: 400 });
            updateData.chargePerCharSubscribers = chargePerCharSubscribers;
        }

        if (chargePerCharNonSubscribers !== undefined) {
            if (chargePerCharNonSubscribers < 0) return NextResponse.json({ error: 'Charge per char cannot be negative' }, { status: 400 });
            if (chargePerCharNonSubscribers > maxPricePerChar) {
                return NextResponse.json({ error: `O preço por caractere não pode ser maior que R$ ${maxPricePerChar}` }, { status: 400 });
            }
            updateData.chargePerCharNonSubscribers = chargePerCharNonSubscribers;
        }

        const isProf = isProfessional !== undefined ? isProfessional : (currentUser?.isProfessional ?? false);
        if (bio !== undefined) {
            if (bio && !isProf) {
                return NextResponse.json({ error: 'Apenas profissionais podem ter biografia.' }, { status: 400 });
            }
            if (bio.length > 300) {
                return NextResponse.json({ error: 'A biografia deve ter no máximo 300 caracteres.' }, { status: 400 });
            }
            updateData.bio = bio;
        }

        if (isProfessional === false) {
            updateData.bio = '';
        }

        if (emailNotificationsEnabled !== undefined) {
            updateData.emailNotificationsEnabled = Boolean(emailNotificationsEnabled);
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
                coverUrl: user.coverUrl,
                balance: user.balance,
                isProfessional: user.isProfessional,
                subscriptionPrice: user.subscriptionPrice || 0,
                isSubscriptionEnabled: user.isSubscriptionEnabled ?? false,
                chargePerCharSubscribers: user.chargePerCharSubscribers ?? 0.002,
                chargePerCharNonSubscribers: user.chargePerCharNonSubscribers ?? 0.005,
                subscribers: user.subscribers || [],
                pixKey: user.pixKey,
                savedCards: (user.savedCards || []).map((card: ICard) => ({
                    id: card.id,
                    label: card.label,
                    lastFour: card.lastFour,
                    brand: card.brand,
                    canUseForPayments: Boolean(card.token && card.asaasCustomerId),
                    createdAt: card.createdAt,
                })),
                bio: user.bio || '',
                maxPricePerChar,
                maxSubscriptionPrice,
                minSubscriptionPrice,
                subscriberDiscountPercentage,
                minPublicPhotos: settings?.minPublicPhotos ?? 6,
                maxPublicPhotos: settings?.maxPublicPhotos ?? 12,
                minExclusivePhotos: settings?.minExclusivePhotos ?? 2,
                maxExclusivePhotos: settings?.maxExclusivePhotos ?? 4,
                emailNotificationsEnabled: user.emailNotificationsEnabled ?? false,
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
