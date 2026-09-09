import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { connectToDatabase } from '@/lib/db';
import { User, Transaction, Subscription, AppSettings } from '@/models';
import { sendPushNotification } from '@/lib/push';
import { SubscriptionBillingError, subscriptionPriceBRLToCents } from '@/lib/subscriptionBilling';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function notifyProfessionalAboutNewSubscriber({
    professional,
    subscriber,
    priceInCents,
}: {
    professional: {
        clerkId: string;
        email?: string;
        username?: string;
        name?: string;
    };
    subscriber: {
        clerkId: string;
        username?: string;
        name?: string;
    };
    priceInCents: number;
}) {
    const subscriberDisplayName = subscriber.name || (subscriber.username ? `@${subscriber.username}` : 'Uma nova pessoa');
    const amountInReais = (priceInCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mimochat.com.br';

    try {
        await sendPushNotification(
            professional.clerkId,
            'Nova assinatura no seu perfil',
            `${subscriberDisplayName} assinou seu perfil por ${amountInReais}.`,
            {
                type: 'new_subscriber',
                subscriberId: subscriber.clerkId,
                amount: priceInCents,
                url: `${appUrl}/wallet`,
            }
        );
    } catch (pushError) {
        console.error('[POST /api/users/[id]/subscribe] Failed to send new subscriber push:', pushError);
    }

    if (!professional.email || !process.env.RESEND_API_KEY) {
        return;
    }

    try {
        const safeSubscriberName = escapeHtml(subscriberDisplayName);
        const safeProfessionalName = escapeHtml(professional.name || professional.username || 'criadora');

        await resend.emails.send({
            from: 'Mimo <onboarding@resend.dev>',
            to: professional.email,
            subject: 'Nova assinatura no seu perfil',
            html: `
                <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
                    <h2 style="margin: 0 0 12px; color: #0f172a;">Nova assinatura recebida</h2>
                    <p style="font-size: 16px; line-height: 1.5; color: #334155;">Oi, ${safeProfessionalName}. <strong>${safeSubscriberName}</strong> acabou de assinar seu perfil no Mimo.</p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0 0 8px;"><strong>Valor:</strong> ${amountInReais}</p>
                        <p style="margin: 0 0 8px;"><strong>Status:</strong> Assinatura ativa</p>
                        <p style="margin: 0;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">Voce pode acompanhar suas assinaturas e ganhos na carteira do Mimo.</p>
                </div>
            `,
        });
    } catch (emailError) {
        console.error('[POST /api/users/[id]/subscribe] Failed to send new subscriber email:', emailError);
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawOwnerId } = await params;
        const { userId: requesterId } = await auth();

        if (!requesterId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Busca flexível: aceita clerkId, _id do MongoDB ou username
        const mongooseModule = await import('mongoose');
        const ownerQuery: any[] = [{ clerkId: rawOwnerId }, { username: rawOwnerId }];
        if (mongooseModule.Types.ObjectId.isValid(rawOwnerId)) {
            ownerQuery.push({ _id: new mongooseModule.Types.ObjectId(rawOwnerId) });
        }

        const [owner, requester] = await Promise.all([
            User.findOne({ $or: ownerQuery }),
            User.findOne({ clerkId: requesterId }),
        ]);

        if (!owner || !owner.isProfessional || owner.professionalStatus !== 'approved') {
            return NextResponse.json({ error: 'Perfil não encontrado, não profissional ou não verificado' }, { status: 404 });
        }

        const ownerId = owner.clerkId;

        if (requesterId === ownerId) {
            return NextResponse.json({ error: 'Você não pode assinar seu próprio perfil' }, { status: 400 });
        }

        if (!owner.isSubscriptionEnabled) {
            return NextResponse.json({ error: 'Este perfil não aceita assinaturas no momento' }, { status: 400 });
        }

        if (!requester) {
            return NextResponse.json({ error: 'Seu perfil não foi encontrado' }, { status: 404 });
        }

        const existingActiveSubscription = await Subscription.findOne({
            subscriberId: requesterId,
            professionalId: ownerId,
            status: { $in: ['ACTIVE', 'CANCELED'] },
            expiresAt: { $gt: new Date() },
        });

        if (existingActiveSubscription) {
            return NextResponse.json({ error: 'Você já é um assinante ativo deste perfil' }, { status: 400 });
        }

        // User.subscriptionPrice is BRL. User.balance, Transaction.amount and Subscription.priceInCents are cents.
        const priceInCents = subscriptionPriceBRLToCents(owner.subscriptionPrice || 0);

        if (priceInCents <= 0) {
            return NextResponse.json({ error: 'Preço da assinatura inválido' }, { status: 400 });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        let debited = false;
        let credited = false;
        let subscriptionActivated = false;
        let subscriberCached = false;

        const settings = await AppSettings.findOne({ key: 'global' });
        const feePercentage = settings?.platformFeePercentage ?? 20;
        const platformFee = Math.ceil((priceInCents * feePercentage) / 100);
        const professionalEarnings = priceInCents - platformFee;

        try {
            const activeSubscription = await Subscription.findOne({
                subscriberId: requesterId,
                professionalId: ownerId,
                status: { $in: ['ACTIVE', 'CANCELED'] },
                expiresAt: { $gt: new Date() },
            });

            if (activeSubscription) {
                throw new SubscriptionBillingError('Você já é um assinante');
            }

            const debitResult = await User.updateOne(
                { clerkId: requesterId, balance: { $gte: priceInCents } },
                [{
                    $set: {
                        balance: { $subtract: ['$balance', priceInCents] },
                        customerCashAvailableCents: {
                            $cond: [
                                { $ne: [{ $type: '$marketplaceWalletMigratedAt' }, 'missing'] },
                                { $max: [0, { $subtract: [{ $ifNull: ['$customerCashAvailableCents', 0] }, priceInCents] }] },
                                '$customerCashAvailableCents',
                            ],
                        },
                    },
                }],
                { updatePipeline: true } as any
            );

            if (debitResult.modifiedCount === 0) {
                throw new SubscriptionBillingError('Saldo insuficiente para assinar');
            }
            debited = true;

            const creditResult = await User.updateOne(
                {
                    clerkId: ownerId,
                    isProfessional: true,
                    professionalStatus: 'approved',
                    isSubscriptionEnabled: true,
                },
                [{
                    $set: {
                        balance: { $add: [{ $ifNull: ['$balance', 0] }, professionalEarnings] },
                        professionalAvailableCents: {
                            $cond: [
                                { $ne: [{ $type: '$marketplaceWalletMigratedAt' }, 'missing'] },
                                { $add: [{ $ifNull: ['$professionalAvailableCents', 0] }, professionalEarnings] },
                                '$professionalAvailableCents',
                            ],
                        },
                    },
                }],
                { updatePipeline: true } as any
            );

            if (creditResult.modifiedCount === 0) {
                throw new SubscriptionBillingError('Perfil não aceita assinaturas no momento');
            }
            credited = true;

            // Atualização parcial atômica com $set evitando document replacement
            await Subscription.findOneAndUpdate(
                { subscriberId: requesterId, professionalId: ownerId },
                {
                    $set: {
                        status: 'ACTIVE',
                        priceInCents,
                        expiresAt,
                        renewalCanceledAt: null,
                        pastDueSince: null,
                        lastRetryAt: null,
                    },
                    $setOnInsert: {
                        subscriberId: requesterId,
                        professionalId: ownerId,
                    }
                },
                { upsert: true, returnDocument: 'after' }
            );
            subscriptionActivated = true;

            await User.updateOne(
                { clerkId: ownerId },
                { $addToSet: { subscribers: requesterId } }
            );
            subscriberCached = true;

            await Transaction.create([
                {
                    userId: requesterId,
                    type: 'debit',
                    amount: priceInCents,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: ownerId,
                    metadata: { platformFee }
                },
                {
                    userId: ownerId,
                    type: 'credit',
                    amount: professionalEarnings,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: requesterId,
                    metadata: { platformFee }
                },
                {
                    userId: 'platform',
                    type: 'platform_fee',
                    amount: platformFee,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: ownerId,
                    metadata: { senderId: requesterId, receiverId: ownerId }
                }
            ]);
        } catch (error) {
            if (debited) {
                await User.updateOne(
                    { clerkId: requesterId },
                    [{
                        $set: {
                            balance: { $add: [{ $ifNull: ['$balance', 0] }, priceInCents] },
                            customerCashAvailableCents: {
                                $cond: [
                                    { $ne: [{ $type: '$marketplaceWalletMigratedAt' }, 'missing'] },
                                    { $add: [{ $ifNull: ['$customerCashAvailableCents', 0] }, priceInCents] },
                                    '$customerCashAvailableCents',
                                ],
                            },
                        },
                    }],
                    { updatePipeline: true } as any
                ).catch((refundError) => {
                    console.error('[POST /api/users/[id]/subscribe] Failed to refund subscriber after subscription error:', refundError);
                });
            }

            if (credited) {
                await User.updateOne(
                    { clerkId: ownerId },
                    [{
                        $set: {
                            balance: { $max: [0, { $subtract: [{ $ifNull: ['$balance', 0] }, professionalEarnings] }] },
                            professionalAvailableCents: {
                                $cond: [
                                    { $ne: [{ $type: '$marketplaceWalletMigratedAt' }, 'missing'] },
                                    { $max: [0, { $subtract: [{ $ifNull: ['$professionalAvailableCents', 0] }, professionalEarnings] }] },
                                    '$professionalAvailableCents',
                                ],
                            },
                        },
                    }],
                    { updatePipeline: true } as any
                ).catch((revertCreditError) => {
                    console.error('[POST /api/users/[id]/subscribe] Failed to revert professional credit after subscription error:', revertCreditError);
                });
            }

            if (subscriptionActivated) {
                await Subscription.updateOne(
                    { subscriberId: requesterId, professionalId: ownerId, expiresAt },
                    { $set: { status: 'EXPIRED' }, $unset: { renewalCanceledAt: '' } }
                ).catch((subscriptionRevertError) => {
                    console.error('[POST /api/users/[id]/subscribe] Failed to revert subscription after error:', subscriptionRevertError);
                });
            }

            if (subscriberCached) {
                await User.updateOne(
                    { clerkId: ownerId },
                    { $pull: { subscribers: requesterId } }
                ).catch((subscriberRevertError) => {
                    console.error('[POST /api/users/[id]/subscribe] Failed to revert subscribers cache after error:', subscriberRevertError);
                });
            }

            throw error;
        }

        await notifyProfessionalAboutNewSubscriber({
            professional: owner,
            subscriber: requester,
            priceInCents,
        });

        // Cria mensagem de sistema no chat entre os dois para subir a conversa no topo
        try {
            const { Room, Message } = await import('@/models');
            const participants = [requesterId, ownerId].sort();
            const derivedRoomId = participants.join('_');
            const subscriberDisplayName = requester.name || (requester.username ? `@${requester.username}` : 'Um novo assinante');

            await Room.findOneAndUpdate(
                { participants: { $all: [requesterId, ownerId], $size: 2 } },
                {
                    $setOnInsert: { participants },
                    $set: {
                        lastMessage: `⭐ ${subscriberDisplayName} assinou o seu perfil!`,
                        lastMessageSenderId: requesterId,
                        lastMessageTime: new Date(),
                    },
                    $pull: { deletedBy: { $in: [requesterId, ownerId] } }
                },
                { upsert: true, new: true }
            );

            await Message.create({
                roomId: derivedRoomId,
                senderId: requesterId,
                receiverId: ownerId,
                content: `⭐ ${subscriberDisplayName} agora é assinante do perfil! Prioridade nas respostas ativada.`,
                charCount: 0,
                cost: 0,
                platformFee: 0,
                receiverEarnings: 0,
                timestamp: new Date(),
                isRead: false,
                isSystem: true,
            });
        } catch (chatMsgErr) {
            console.error('[POST /api/users/[id]/subscribe] Failed to create system message in chat:', chatMsgErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Assinatura realizada com sucesso!',
            priceInCents,
            expiresAt,
        });
    } catch (error: any) {
        const isBillingError = error instanceof SubscriptionBillingError || error?.name === 'SubscriptionBillingError';
        if (isBillingError) {
            return NextResponse.json({ error: error.message }, { status: error.status || 400 });
        }

        console.error('[POST /api/users/[id]/subscribe] Error in subscription:', error);
        return NextResponse.json({ 
            error: error?.message || 'Internal server error',
            status: 500
        }, { status: 500 });
    }
}
