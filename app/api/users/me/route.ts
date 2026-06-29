import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, type ICard } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';
import { Resend } from 'resend';
import { buildProfileRoleMetadata, getCreatorLandingProfileRole } from '@/lib/profileRole';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

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
                const cleanId = userId.startsWith('user_') ? userId.slice(5) : userId;
                const username = clerkUser.username || `user_${cleanId.substring(Math.max(0, cleanId.length - 8))}`;

                const roleMetadata = getCreatorLandingProfileRole(clerkUser.unsafeMetadata);
                const isProfessional = roleMetadata === 'professional' ? true : (roleMetadata === 'client' ? false : undefined);
                const professionalStatus = null; // Inicializa como null (verificação pendente de envio)

                const defaultSub = settings?.defaultPricePerCharSubscribers ?? 0.002;
                const defaultNonSub = settings?.defaultPricePerCharNonSubscribers ?? 0.005;

                const userFields: any = {
                    clerkId: userId,
                    email: email,
                    username: username,
                    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
                    balance: 0,
                    professionalStatus,
                    chargePerCharSubscribers: defaultSub,
                    chargePerCharNonSubscribers: defaultNonSub,
                };
                if (isProfessional !== undefined) {
                    userFields.isProfessional = isProfessional;
                }

                user = await User.create(userFields);

                // Envio de e-mail de notificação para o admin desativado conforme solicitado
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
        } else {
            // Se o usuário antigo não tiver o isProfessional definido no MongoDB, considera cliente (false)
            // se a conta tiver mais de 10 minutos (para evitar pegar contas que acabaram de ser criadas)
            if (user.isProfessional === undefined) {
                const isOldAccount = user.createdAt ? (Date.now() - new Date(user.createdAt).getTime() > 600000) : true;
                if (isOldAccount) {
                    user.isProfessional = false;
                    await user.save();
                }
            }

            // O usuário já existe no MongoDB. Sincroniza o status profissional se houver discrepância com o Clerk
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(userId);
                const explicitRole = getCreatorLandingProfileRole(clerkUser.unsafeMetadata);
                const isProfessionalClerk = explicitRole === 'professional';

                if (isProfessionalClerk && !user.isProfessional) {
                    user.isProfessional = true;
                    user.professionalStatus = null;
                    await user.save();
                    console.log(`[GET /api/users/me] Sincronizado status profissional para o usuário ${userId} baseado nos metadados do Clerk.`);

                    // Envio de e-mail de notificação para o admin desativado conforme solicitado
                }
            } catch (syncErr) {
                console.warn('[GET /api/users/me] Falha ao sincronizar metadados do Clerk:', syncErr);
            }
        }

        if (user.isSuspended) {
            return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
        }

        if (user.email.includes('@placeholder.com')) {
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
                birthDate: user.birthDate,
                photoUrl: user.photoUrl,
                coverUrl: user.coverUrl,
                balance: user.balance,
                isProfessional: user.isProfessional,
                professionalStatus: user.professionalStatus,
                subscriptionPrice: user.subscriptionPrice || 0,
                isSubscriptionEnabled: user.isSubscriptionEnabled ?? false,
                chargePerCharSubscribers: user.chargePerCharSubscribers ?? (settings?.defaultPricePerCharSubscribers ?? 0.002),
                chargePerCharNonSubscribers: user.chargePerCharNonSubscribers ?? (settings?.defaultPricePerCharNonSubscribers ?? 0.005),
                subscribers: user.subscribers || [],
                pixKey: user.taxId || user.pixKey,
                savedCards: (user.savedCards || []).map((card: ICard) => ({
                    id: card.id,
                    label: card.label,
                    lastFour: card.lastFour,
                    brand: card.brand,
                    canUseForPayments: Boolean(card.token && card.asaasCustomerId),
                    createdAt: card.createdAt,
                })),
                bio: user.bio || '',
                isAdmin: user.clerkId === 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM' || Boolean(settings?.adminClerkIds?.includes(user.clerkId)),
                maxPricePerChar,
                maxSubscriptionPrice,
                minSubscriptionPrice,
                subscriberDiscountPercentage,
                minPublicPhotos: settings?.minPublicPhotos ?? 6,
                maxPublicPhotos: settings?.maxPublicPhotos ?? 12,
                minExclusivePhotos: settings?.minExclusivePhotos ?? 2,
                maxExclusivePhotos: settings?.maxExclusivePhotos ?? 4,
                pwaShowAgainIntervalDays: settings?.pwaShowAgainIntervalDays ?? 7,
                emailNotificationsEnabled: user.emailNotificationsEnabled ?? false,
                hasPushToken: Boolean(user.fcmToken || (user.fcmTokens && user.fcmTokens.length > 0)),
                hideFromExplore: user.hideFromExplore ?? false,
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
        const { username, name, photoUrl, coverUrl, phone, taxId, isProfessional, subscriptionPrice, isSubscriptionEnabled, chargePerCharSubscribers, chargePerCharNonSubscribers, bio, emailNotificationsEnabled, hideFromExplore } = body;

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

        if (hideFromExplore !== undefined) {
            updateData.hideFromExplore = Boolean(hideFromExplore);
        }

        const user = await User.findOneAndUpdate(
            { clerkId: userId },
            {
                $set: updateData,
                $setOnInsert: {
                    email: `user_${userId}@placeholder.com`,
                    ...(updateData.username ? {} : { 
                        username: `user_${(userId.startsWith('user_') ? userId.slice(5) : userId).substring(Math.max(0, (userId.startsWith('user_') ? userId.slice(5) : userId).length - 8))}` 
                    }),
                    balance: 0
                }
            },
            { returnDocument: 'after', runValidators: true, upsert: true }
        );

        // Se isProfessional mudou, deleta todas as conversas do usuário e atualiza metadados
        if (isProfessionalChanging) {
            const rooms = await Room.find({ participants: userId }).select('_id').lean();
            const roomIds = rooms.map((r: any) => r._id);

            await Promise.all([
                Room.deleteMany({ participants: userId }),
                Message.deleteMany({ roomId: { $in: roomIds } }),
            ]);

            // Sincroniza metadados no Clerk
            try {
                const client = await clerkClient();
                await client.users.updateUserMetadata(userId, {
                    unsafeMetadata: buildProfileRoleMetadata(isProfessional ? 'professional' : 'client')
                });
                console.log(`[PATCH /api/users/me] Clerk unsafeMetadata atualizado para role "${isProfessional ? 'professional' : 'client'}" para o usuário ${userId}`);
            } catch (clerkErr) {
                console.error('[PATCH /api/users/me] Erro ao atualizar metadados no Clerk:', clerkErr);
            }

            // Se mudou para profissional, define professionalStatus = null e salva
            if (isProfessional) {
                user.professionalStatus = null;
                await user.save();
                // Envio de e-mail de notificação para o admin desativado conforme solicitado
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
                birthDate: user.birthDate,
                photoUrl: user.photoUrl,
                coverUrl: user.coverUrl,
                balance: user.balance,
                isProfessional: user.isProfessional,
                professionalStatus: user.professionalStatus,
                subscriptionPrice: user.subscriptionPrice || 0,
                isSubscriptionEnabled: user.isSubscriptionEnabled ?? false,
                chargePerCharSubscribers: user.chargePerCharSubscribers ?? (settings?.defaultPricePerCharSubscribers ?? 0.002),
                chargePerCharNonSubscribers: user.chargePerCharNonSubscribers ?? (settings?.defaultPricePerCharNonSubscribers ?? 0.005),
                subscribers: user.subscribers || [],
                pixKey: user.taxId || user.pixKey,
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
                pwaShowAgainIntervalDays: settings?.pwaShowAgainIntervalDays ?? 7,
                emailNotificationsEnabled: user.emailNotificationsEnabled ?? false,
                hasPushToken: Boolean(user.fcmToken || (user.fcmTokens && user.fcmTokens.length > 0)),
                hideFromExplore: user.hideFromExplore ?? false,
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
