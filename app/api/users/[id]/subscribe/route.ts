import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { User, Transaction, Subscription } from '@/models';
import { SubscriptionBillingError, subscriptionPriceBRLToCents } from '@/lib/subscriptionBilling';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ownerId } = await params;
        const { userId: requesterId } = await auth();

        if (!requesterId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (requesterId === ownerId) {
            return NextResponse.json({ error: 'Voce nao pode assinar seu proprio perfil' }, { status: 400 });
        }

        await connectToDatabase();

        const owner = await User.findOne({ clerkId: ownerId });
        const requester = await User.findOne({ clerkId: requesterId });

        if (!owner || !owner.isProfessional || owner.professionalStatus !== 'approved') {
            return NextResponse.json({ error: 'Perfil nao encontrado, nao profissional ou nao verificado' }, { status: 404 });
        }

        if (!owner.isSubscriptionEnabled) {
            return NextResponse.json({ error: 'Este perfil nao aceita assinaturas no momento' }, { status: 400 });
        }

        if (!requester) {
            return NextResponse.json({ error: 'Seu perfil nao foi encontrado' }, { status: 404 });
        }

        const existingActiveSubscription = await Subscription.findOne({
            subscriberId: requesterId,
            professionalId: ownerId,
            status: { $in: ['ACTIVE', 'CANCELED'] },
            expiresAt: { $gt: new Date() },
        });

        if (existingActiveSubscription) {
            return NextResponse.json({ error: 'Voce ja e um assinante' }, { status: 400 });
        }

        // User.subscriptionPrice is BRL. User.balance, Transaction.amount and Subscription.priceInCents are cents.
        const priceInCents = subscriptionPriceBRLToCents(owner.subscriptionPrice || 0);

        if (priceInCents <= 0) {
            return NextResponse.json({ error: 'Preco da assinatura invalido' }, { status: 400 });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const activeSubscription = await Subscription.findOne({
                    subscriberId: requesterId,
                    professionalId: ownerId,
                    status: { $in: ['ACTIVE', 'CANCELED'] },
                    expiresAt: { $gt: new Date() },
                }).session(session);

                if (activeSubscription) {
                    throw new SubscriptionBillingError('Voce ja e um assinante');
                }

                const debitResult = await User.updateOne(
                    { clerkId: requesterId, balance: { $gte: priceInCents } },
                    { $inc: { balance: -priceInCents } },
                    { session }
                );

                if (debitResult.modifiedCount === 0) {
                    throw new SubscriptionBillingError('Saldo insuficiente para assinar');
                }

                const creditResult = await User.updateOne(
                    {
                        clerkId: ownerId,
                        isProfessional: true,
                        professionalStatus: 'approved',
                        isSubscriptionEnabled: true,
                    },
                    { $inc: { balance: priceInCents } },
                    { session }
                );

                if (creditResult.modifiedCount === 0) {
                    throw new SubscriptionBillingError('Perfil nao aceita assinaturas no momento');
                }

                await Transaction.create([
                    {
                        userId: requesterId,
                        type: 'debit',
                        amount: priceInCents,
                        source: 'subscription',
                        status: 'COMPLETED',
                        relatedUserId: ownerId,
                    },
                    {
                        userId: ownerId,
                        type: 'credit',
                        amount: priceInCents,
                        source: 'subscription',
                        status: 'COMPLETED',
                        relatedUserId: requesterId,
                    },
                ], { session });

                await Subscription.findOneAndUpdate(
                    { subscriberId: requesterId, professionalId: ownerId },
                    {
                        status: 'ACTIVE',
                        priceInCents,
                        expiresAt,
                        renewalCanceledAt: null,
                    },
                    { upsert: true, new: true, session }
                );

                await User.updateOne(
                    { clerkId: ownerId },
                    { $addToSet: { subscribers: requesterId } },
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        return NextResponse.json({
            success: true,
            message: 'Assinatura realizada com sucesso!',
            priceInCents,
            expiresAt,
        });
    } catch (error: any) {
        if (error instanceof SubscriptionBillingError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        console.error('Error in subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
