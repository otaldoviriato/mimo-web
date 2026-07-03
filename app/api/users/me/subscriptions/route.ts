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

        // Busca assinaturas vigentes do subscriber. Registros legados CANCELED com
        // expiresAt futuro ainda representam acesso pago ate o fim do ciclo.
        const subscriptions = await Subscription.find({
            subscriberId: userId,
            expiresAt: { $gt: now },
            status: { $in: ['ACTIVE', 'CANCELED'] },
        }).lean();

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

            return {
                _id: String(sub._id),
                professionalId: sub.professionalId,
                priceInCents,
                expiresAt: sub.expiresAt,
                status: sub.status,
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

// DELETE /api/users/me/subscriptions?subscriptionId=<id> — Cancela uma assinatura
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
            status: { $in: ['ACTIVE', 'CANCELED'] },
            expiresAt: { $gt: now },
        });

        if (!subscription) {
            return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
        }

        // Mantem a assinatura vigente ate expiresAt; apenas impede a renovacao automatica.
        subscription.status = 'ACTIVE';
        subscription.renewalCanceledAt = subscription.renewalCanceledAt ?? now;
        await subscription.save();

        // Garante o cache de privilegios ate o vencimento, inclusive para reparar
        // cancelamentos legados que removeram o assinante cedo demais.
        await User.updateOne(
            { clerkId: subscription.professionalId },
            { $addToSet: { subscribers: userId } }
        );

        return NextResponse.json({
            success: true,
            message: 'Renovacao da assinatura cancelada. O acesso permanece ativo ate o fim do ciclo.',
            expiresAt: subscription.expiresAt,
            renewalCanceledAt: subscription.renewalCanceledAt,
        });
    } catch (error) {
        console.error('[DELETE /api/users/me/subscriptions]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
