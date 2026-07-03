import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { User, Transaction, Subscription, AppSettings } from '@/models';
import { SubscriptionBillingError, subscriptionPriceBRLToCents } from '@/lib/subscriptionBilling';

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
            status: { $in: ['ACTIVE', 'CANCELED'] },
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
                sub.status = 'EXPIRED';
                await sub.save();

                await User.updateOne(
                    { clerkId: professionalId },
                    { $pull: { subscribers: subscriberId } }
                );

                results.expired++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired due to insufficient balance. Price: ${priceInCents} cents, Balance: ${client.balance} cents.`);
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
                        { $inc: { balance: -priceInCents } },
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
                        { $inc: { balance: professionalEarnings } },
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
                    ], { session });

                    const renewResult = await Subscription.updateOne(
                        {
                            _id: sub._id,
                            status: 'ACTIVE',
                            expiresAt: { $lte: now },
                        },
                        {
                            $set: {
                                priceInCents,
                                expiresAt: nextExpiresAt,
                                renewalCanceledAt: null,
                            },
                        },
                        { session }
                    );

                    if (renewResult.modifiedCount === 0) {
                        throw new SubscriptionBillingError('Assinatura ja foi processada');
                    }
                });

                results.renewed++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} successfully renewed. Price: ${priceInCents} cents. New expiration: ${nextExpiresAt.toISOString()}.`);
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
