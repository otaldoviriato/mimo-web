import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { connectToDatabase } from '@/lib/db';
import { User, Transaction, Subscription } from '@/models';
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

        let debited = false;
        let credited = false;
        let subscriptionActivated = false;
        let subscriberCached = false;

        try {
            const activeSubscription = await Subscription.findOne({
                subscriberId: requesterId,
                professionalId: ownerId,
                status: { $in: ['ACTIVE', 'CANCELED'] },
                expiresAt: { $gt: new Date() },
            });

            if (activeSubscription) {
                throw new SubscriptionBillingError('Voce ja e um assinante');
            }

            const debitResult = await User.updateOne(
                { clerkId: requesterId, balance: { $gte: priceInCents } },
                { $inc: { balance: -priceInCents } }
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
                { $inc: { balance: priceInCents } }
            );

            if (creditResult.modifiedCount === 0) {
                throw new SubscriptionBillingError('Perfil nao aceita assinaturas no momento');
            }
            credited = true;

            await Subscription.findOneAndUpdate(
                { subscriberId: requesterId, professionalId: ownerId },
                {
                    status: 'ACTIVE',
                    priceInCents,
                    expiresAt,
                    renewalCanceledAt: null,
                },
                { upsert: true, new: true }
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
                },
                {
                    userId: ownerId,
                    type: 'credit',
                    amount: priceInCents,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: requesterId,
                },
            ]);
        } catch (error) {
            if (debited) {
                await User.updateOne(
                    { clerkId: requesterId },
                    { $inc: { balance: priceInCents } }
                ).catch((refundError) => {
                    console.error('[POST /api/users/[id]/subscribe] Failed to refund subscriber after subscription error:', refundError);
                });
            }

            if (credited) {
                await User.updateOne(
                    { clerkId: ownerId },
                    { $inc: { balance: -priceInCents } }
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
