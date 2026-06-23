import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, type ICard } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';
import { Resend } from 'resend';
import { buildProfileRoleMetadata, getExplicitProfileRole } from '@/lib/profileRole';

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

                const roleMetadata = getExplicitProfileRole(clerkUser.unsafeMetadata);
                const isProfessional = roleMetadata === 'professional' ? true : (roleMetadata === 'client' ? false : undefined);
                const professionalStatus = null; // Inicializa como null (verificação pendente de envio)

                const userFields: any = {
                    clerkId: userId,
                    email: email,
                    username: username,
                    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' '),
                    balance: 0,
                    professionalStatus,
                    chargePerCharSubscribers: 0.002,
                    chargePerCharNonSubscribers: 0.005,
                };
                if (isProfessional !== undefined) {
                    userFields.isProfessional = isProfessional;
                }

                user = await User.create(userFields);

                if (isProfessional) {
                    try {
                        await resend.emails.send({
                            from: 'Mimo Cadastro <onboarding@resend.dev>',
                            to: 'viriatoceo@gmail.com',
                            subject: `Nova Conta de Criadora Criada (Lazy) - @${username}`,
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                    <h2 style="color: #6d28d9; margin-top: 0;">Nova Profissional Cadastrada</h2>
                                    <p style="color: #475569; font-size: 16px;">Uma nova conta de criadora foi criada e está pendente de verificação de identidade/documentos.</p>
                                    <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                                        <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${user.name}</li>
                                        <li style="margin-bottom: 8px;"><strong>E-mail:</strong> ${email}</li>
                                        <li style="margin-bottom: 8px;"><strong>Username:</strong> @${username}</li>
                                        <li style="margin-bottom: 0;"><strong>Data de Cadastro:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                                    </ul>
                                    <p style="color: #475569;">O perfil só aparecerá no painel de moderação de documentos após o envio de fotos do documento e selfie de maioridade (+18) pela própria criadora.</p>
                                </div>
                            `
                        });
                    } catch (e) {
                        console.error('Erro ao enviar email lazy create:', e);
                    }
                }
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
                const explicitRole = getExplicitProfileRole(clerkUser.unsafeMetadata);
                const isProfessionalClerk = explicitRole === 'professional';

                if (isProfessionalClerk && !user.isProfessional) {
                    user.isProfessional = true;
                    user.professionalStatus = null;
                    await user.save();
                    console.log(`[GET /api/users/me] Sincronizado status profissional para o usuário ${userId} baseado nos metadados do Clerk.`);

                    // Envia email de notificação se for promovido aqui
                    try {
                        await resend.emails.send({
                            from: 'Mimo Cadastro <onboarding@resend.dev>',
                            to: 'viriatoceo@gmail.com',
                            subject: `Nova Conta de Criadora Criada (Sync GET) - @${user.username}`,
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                    <h2 style="color: #6d28d9; margin-top: 0;">Nova Profissional Cadastrada</h2>
                                    <p style="color: #475569; font-size: 16px;">Uma nova conta de criadora foi criada e está pendente de verificação de identidade/documentos.</p>
                                    <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                                        <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${user.name || user.username}</li>
                                        <li style="margin-bottom: 8px;"><strong>E-mail:</strong> ${user.email}</li>
                                        <li style="margin-bottom: 8px;"><strong>Username:</strong> @${user.username}</li>
                                        <li style="margin-bottom: 0;"><strong>Data de Cadastro:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                                    </ul>
                                    <p style="color: #475569;">O perfil só aparecerá no painel de moderação de documentos após o envio de fotos do documento e selfie de maioridade (+18) pela própria criadora.</p>
                                </div>
                            `
                        });
                    } catch (e) {
                        console.error('Erro ao enviar email de sincronização GET:', e);
                    }
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
                photoUrl: user.photoUrl,
                coverUrl: user.coverUrl,
                balance: user.balance,
                isProfessional: user.isProfessional,
                professionalStatus: user.professionalStatus,
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
                isAdmin: user.clerkId === 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM' || Boolean(settings?.adminClerkIds?.includes(user.clerkId)),
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

            // Se mudou para profissional, dispara o e-mail administrativo e define professionalStatus = null
            if (isProfessional) {
                user.professionalStatus = null;
                await user.save();

                try {
                    await resend.emails.send({
                        from: 'Mimo Cadastro <onboarding@resend.dev>',
                        to: 'viriatoceo@gmail.com',
                        subject: `Nova Conta de Criadora Criada - @${user.username}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <h2 style="color: #6d28d9; margin-top: 0;">Nova Profissional Cadastrada</h2>
                                <p style="color: #475569; font-size: 16px;">Uma nova conta de criadora foi criada e está pendente de verificação de identidade/documentos.</p>
                                <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                                    <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${user.name || user.username}</li>
                                    <li style="margin-bottom: 8px;"><strong>E-mail:</strong> ${user.email}</li>
                                    <li style="margin-bottom: 8px;"><strong>Username:</strong> @${user.username}</li>
                                    <li style="margin-bottom: 0;"><strong>Data de Cadastro:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                                </ul>
                                <p style="color: #475569;">O perfil só aparecerá no painel de moderação de documentos após o envio de fotos do documento e selfie de maioridade (+18) pela própria criadora.</p>
                            </div>
                        `
                    });
                    console.log(`[PATCH /api/users/me] E-mail de notificação de profissional enviado.`);
                } catch (emailErr) {
                    console.error('[PATCH /api/users/me] Erro ao enviar e-mail de notificação:', emailErr);
                }
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
                professionalStatus: user.professionalStatus,
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
