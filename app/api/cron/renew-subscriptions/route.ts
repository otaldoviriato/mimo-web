import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { User, Transaction, Subscription, AppSettings } from '@/models';
import { SubscriptionBillingError, subscriptionPriceBRLToCents } from '@/lib/subscriptionBilling';
import { sendPushNotification } from '@/lib/push';

function getNextExpiration(previousExpiresAt: Date, now: Date) {
    const nextExpiresAt = new Date(previousExpiresAt);
    nextExpiresAt.setDate(nextExpiresAt.getDate() + 30);

    if (nextExpiresAt <= now) {
        const fromNow = new Date(now);
        fromNow.setDate(fromNow.getDate() + 30);
        return fromNow;
    }

    return nextExpiresAt;
}

export async function GET(request: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const isDev = process.env.NODE_ENV === 'development';

        if (!isDev && cronSecret) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        await connectToDatabase();
        const settings = await AppSettings.findOne({ key: 'global' });
        const feePercentage = settings?.platformFeePercentage ?? 20;

        const now = new Date();
        const expiredSubscriptions = await Subscription.find({
            status: { $in: ['ACTIVE', 'PAST_DUE', 'CANCELED'] },
            expiresAt: { $lte: now },
        });

        const results = {
            processed: 0,
            renewed: 0,
            expired: 0,
            failed: 0,
            details: [] as string[],
        };

        for (const sub of expiredSubscriptions) {
            results.processed++;

            const { subscriberId, professionalId } = sub;

            if (sub.renewalCanceledAt || sub.status === 'CANCELED') {
                sub.status = 'EXPIRED';
                sub.pastDueSince = null;
                await sub.save();

                await User.updateOne(
                    { clerkId: professionalId },
                    { $pull: { subscribers: subscriberId } }
                );

                results.expired++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired because renewal was canceled.`);
                continue;
            }

            const client = await User.findOne({ clerkId: subscriberId });
            const professional = await User.findOne({ clerkId: professionalId });

            if (
                !professional ||
                !professional.isProfessional ||
                professional.professionalStatus !== 'approved' ||
                !professional.isSubscriptionEnabled
            ) {
                sub.status = 'EXPIRED';
                sub.pastDueSince = null;
                await sub.save();

                await User.updateOne(
                    { clerkId: professionalId },
                    { $pull: { subscribers: subscriberId } }
                );

                results.expired++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired because the professional cannot receive subscriptions.`);
                continue;
            }

            if (!client) {
                sub.status = 'EXPIRED';
                sub.pastDueSince = null;
                await sub.save();

                await User.updateOne(
                    { clerkId: professionalId },
                    { $pull: { subscribers: subscriberId } }
                );

                results.expired++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired because the client profile was not found.`);
                continue;
            }

            // User.subscriptionPrice is BRL. User.balance, Transaction.amount and Subscription.priceInCents are cents.
            const priceInCents = subscriptionPriceBRLToCents(professional.subscriptionPrice || 0);

            if (priceInCents <= 0) {
                sub.status = 'EXPIRED';
                sub.pastDueSince = null;
                await sub.save();

                await User.updateOne(
                    { clerkId: professionalId },
                    { $pull: { subscribers: subscriberId } }
                );

                results.expired++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired because the subscription price is invalid.`);
                continue;
            }

            if (client.balance < priceInCents) {
                const pastDueSince = sub.pastDueSince || now;
                const daysInPastDue = Math.floor((now.getTime() - new Date(pastDueSince).getTime()) / (1000 * 60 * 60 * 24));
                const profName = professional.name || (professional.username ? `@${professional.username}` : 'criadora');

                if (sub.status === 'PAST_DUE' && daysInPastDue >= 3) {
                    // Passou dos 3 dias de tolerância: expira definitivamente
                    sub.status = 'EXPIRED';
                    sub.pastDueSince = null;
                    await sub.save();

                    await User.updateOne(
                        { clerkId: professionalId },
                        { $pull: { subscribers: subscriberId } }
                    );

                    results.expired++;
                    results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired after 3 days in PAST_DUE without balance.`);

                    try {
                        await sendPushNotification(
                            subscriberId,
                            'Assinatura encerrada',
                            `Sua assinatura de ${profName} expirou por falta de saldo. Recarregue para voltar a assinar quando quiser.`
                        );
                    } catch {}
                    continue;
                }

                // Marca como PAST_DUE ou atualiza retry se ainda dentro dos 3 dias de carência
                sub.status = 'PAST_DUE';
                sub.pastDueSince = pastDueSince;
                sub.lastRetryAt = now;
                await sub.save();

                results.details.push(`Subscription of ${subscriberId} to ${professionalId} set to PAST_DUE (day ${daysInPastDue} of 3).`);

                try {
                    await sendPushNotification(
                        subscriberId,
                        'Renovação pendente ⚠️',
                        `Sua assinatura de ${profName} não pôde ser renovada por falta de saldo. Recarregue em até 3 dias para manter seus benefícios!`
                    );
                } catch {}
                continue;
            }

            const nextExpiresAt = getNextExpiration(sub.expiresAt, now);
            const session = await mongoose.startSession();

            try {
                await session.withTransaction(async () => {
                    const platformFee = Math.ceil((priceInCents * feePercentage) / 100);
                    const professionalEarnings = priceInCents - platformFee;

                    const debitResult = await User.updateOne(
                        { clerkId: subscriberId, balance: { $gte: priceInCents } },
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
                        { session }
                    );

                    if (debitResult.modifiedCount === 0) {
                        throw new SubscriptionBillingError('Saldo insuficiente para renovar assinatura');
                    }

                    const creditResult = await User.updateOne(
                        {
                            clerkId: professionalId,
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
                        { session }
                    );

                    if (creditResult.modifiedCount === 0) {
                        throw new SubscriptionBillingError('Profissional nao pode receber assinaturas');
                    }

                    await Transaction.create([
                        {
                            userId: subscriberId,
                            type: 'debit',
                            amount: priceInCents,
                            source: 'subscription',
                            status: 'COMPLETED',
                            relatedUserId: professionalId,
                            metadata: { platformFee }
                        },
                        {
                            userId: professionalId,
                            type: 'credit',
                            amount: professionalEarnings,
                            source: 'subscription',
                            status: 'COMPLETED',
                            relatedUserId: subscriberId,
                            metadata: { platformFee }
                        },
                        {
                            userId: 'platform',
                            type: 'platform_fee',
                            amount: platformFee,
                            source: 'subscription',
                            status: 'COMPLETED',
                            relatedUserId: professionalId,
                            metadata: { senderId: subscriberId, receiverId: professionalId }
                        },
                    ], { session, ordered: true });

                    const renewResult = await Subscription.updateOne(
                        {
                            _id: sub._id,
                            status: { $in: ['ACTIVE', 'PAST_DUE'] },
                            expiresAt: { $lte: now },
                        },
                        {
                            $set: {
                                priceInCents,
                                expiresAt: nextExpiresAt,
                                renewalCanceledAt: null,
                                status: 'ACTIVE',
                                pastDueSince: null,
                                lastRetryAt: now,
                            },
                        },
                        { session }
                    );

                    if (renewResult.modifiedCount === 0) {
                        throw new SubscriptionBillingError('Assinatura ja foi processada');
                    }
                });

                // Garante que o assinante permaneça no cache de subscribers da profissional
                await User.updateOne(
                    { clerkId: professionalId },
                    { $addToSet: { subscribers: subscriberId } }
                );

                results.renewed++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} successfully renewed. Price: ${priceInCents} cents. New expiration: ${nextExpiresAt.toISOString()}.`);

                try {
                    const profName = professional?.name || (professional?.username ? `@${professional.username}` : 'criadora');
                    const clientName = client?.name || (client?.username ? `@${client.username}` : 'Um assinante');
                    const amountFormatted = (priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                    await sendPushNotification(
                        subscriberId,
                        'Assinatura renovada! ✅',
                        `Sua assinatura de ${profName} foi renovada com sucesso.`
                    );

                    await sendPushNotification(
                        professionalId,
                        'Assinatura renovada! 🌟',
                        `A assinatura de ${clientName} foi renovada (${amountFormatted}).`
                    );
                } catch (pushErr) {
                    console.error('[renew-subscriptions] Push notification error on success:', pushErr);
                }
            } catch (error) {
                if (error instanceof SubscriptionBillingError) {
                    sub.status = 'EXPIRED';
                    await sub.save();

                    await User.updateOne(
                        { clerkId: professionalId },
                        { $pull: { subscribers: subscriberId } }
                    );

                    results.expired++;
                    results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired during renewal: ${error.message}.`);
                } else {
                    results.failed++;
                    results.details.push(`Subscription of ${subscriberId} to ${professionalId} failed during renewal.`);
                    console.error('[renew-subscriptions] Failed to renew subscription:', error);
                }
            } finally {
                await session.endSession();
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('Error renewing subscriptions:', error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    return GET(request);
}
