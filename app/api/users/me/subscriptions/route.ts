import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, Subscription } from '@/models';
import { normalizeStoredSubscriptionPriceInCents } from '@/lib/subscriptionBilling';

// GET /api/users/me/subscriptions — Retorna as assinaturas ativas do cliente
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const now = new Date();
        const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

        // Busca assinaturas vigentes, pendentes de saldo ou expiradas recentemente
        const subscriptions = await Subscription.find({
            subscriberId: userId,
            $or: [
                { status: { $in: ['ACTIVE', 'PAST_DUE'] } },
                { status: 'CANCELED', expiresAt: { $gt: now } },
                { status: 'EXPIRED', updatedAt: { $gte: fifteenDaysAgo } },
            ],
        }).sort({ createdAt: -1 }).lean();

        if (subscriptions.length === 0) {
            return NextResponse.json({ subscriptions: [] });
        }

        // Busca dados das profissionais
        const professionalIds = subscriptions.map((s) => s.professionalId);
        const professionals = await User.find(
            { clerkId: { $in: professionalIds } },
            { clerkId: 1, name: 1, username: 1, photoUrl: 1, subscriptionPrice: 1 }
        ).lean();

        const profMap: Record<string, { name?: string; username: string; photoUrl?: string; subscriptionPrice?: number }> = {};
        for (const prof of professionals) {
            profMap[prof.clerkId] = {
                name: prof.name,
                username: prof.username,
                photoUrl: prof.photoUrl,
                subscriptionPrice: prof.subscriptionPrice,
            };
        }

        const repairs: Promise<unknown>[] = [];
        const result = subscriptions.map((sub) => {
            const professional = profMap[sub.professionalId] ?? null;
            const priceInCents = normalizeStoredSubscriptionPriceInCents(
                sub.priceInCents,
                professional?.subscriptionPrice
            );

            if (priceInCents !== sub.priceInCents) {
                repairs.push(Subscription.updateOne(
                    { _id: sub._id, status: 'ACTIVE' },
                    { $set: { priceInCents } }
                ));
            }

            const isPastDue = sub.status === 'PAST_DUE';
            const pastDueSince = sub.pastDueSince ?? null;
            const daysLeftInGrace = isPastDue && pastDueSince
                ? Math.max(0, 3 - Math.floor((now.getTime() - new Date(pastDueSince).getTime()) / (1000 * 60 * 60 * 24)))
                : null;

            return {
                _id: String(sub._id),
                professionalId: sub.professionalId,
                priceInCents,
                expiresAt: sub.expiresAt,
                status: sub.status,
                pastDueSince,
                daysLeftInGrace,
                renewalCanceledAt: sub.renewalCanceledAt ?? (sub.status === 'CANCELED' ? sub.updatedAt : null),
                cancelAtPeriodEnd: Boolean(sub.renewalCanceledAt || sub.status === 'CANCELED'),
                professional: professional
                    ? {
                        name: professional.name,
                        username: professional.username,
                        photoUrl: professional.photoUrl,
                    }
                    : null,
            };
        });

        if (repairs.length > 0) {
            await Promise.all(repairs);
        }

        return NextResponse.json({ subscriptions: result });
    } catch (error) {
        console.error('[GET /api/users/me/subscriptions]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/users/me/subscriptions — Reativa renovação automática de uma assinatura
export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const subscriptionId = body?.subscriptionId;
        if (!subscriptionId) {
            return NextResponse.json({ error: 'subscriptionId é obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            subscriberId: userId,
            status: { $in: ['ACTIVE', 'PAST_DUE', 'CANCELED'] },
        });

        if (!subscription) {
            return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
        }

        subscription.status = 'ACTIVE';
        subscription.renewalCanceledAt = null;
        await subscription.save();

        await User.updateOne(
            { clerkId: subscription.professionalId },
            { $addToSet: { subscribers: userId } }
        );

        return NextResponse.json({
            success: true,
            message: 'Renovação automática reativada com sucesso.',
            subscription: {
                _id: String(subscription._id),
                status: subscription.status,
                renewalCanceledAt: null,
            },
        });
    } catch (error) {
        console.error('[PATCH /api/users/me/subscriptions]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/users/me/subscriptions?subscriptionId=<id> — Cancela renovação de uma assinatura
export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscriptionId = request.nextUrl.searchParams.get('subscriptionId');
        if (!subscriptionId) {
            return NextResponse.json({ error: 'subscriptionId é obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        const now = new Date();

        // Garante que o subscriber so cancele a propria assinatura vigente
        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            subscriberId: userId,
            status: { $in: ['ACTIVE', 'CANCELED', 'PAST_DUE'] },
        });

        if (!subscription) {
            return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
        }

        // Mantem a assinatura vigente ate expiresAt; apenas impede a renovacao automatica.
        subscription.renewalCanceledAt = subscription.renewalCanceledAt ?? now;
        await subscription.save();

        return NextResponse.json({
            success: true,
            message: 'Renovação da assinatura cancelada. O acesso permanece ativo até o fim do ciclo.',
            expiresAt: subscription.expiresAt,
            renewalCanceledAt: subscription.renewalCanceledAt,
        });
    } catch (error) {
        console.error('[DELETE /api/users/me/subscriptions]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
