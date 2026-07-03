import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, Subscription } from '@/models';

// GET /api/users/me/subscriptions — Retorna as assinaturas ativas do cliente
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Busca assinaturas ativas do subscriber
        const subscriptions = await Subscription.find({
            subscriberId: userId,
            status: 'ACTIVE',
        }).lean();

        if (subscriptions.length === 0) {
            return NextResponse.json({ subscriptions: [] });
        }

        // Busca dados das profissionais
        const professionalIds = subscriptions.map((s) => s.professionalId);
        const professionals = await User.find(
            { clerkId: { $in: professionalIds } },
            { clerkId: 1, name: 1, username: 1, photoUrl: 1 }
        ).lean();

        const profMap: Record<string, { name?: string; username: string; photoUrl?: string }> = {};
        for (const prof of professionals) {
            profMap[prof.clerkId] = {
                name: prof.name,
                username: prof.username,
                photoUrl: prof.photoUrl,
            };
        }

        const result = subscriptions.map((sub) => ({
            _id: String(sub._id),
            professionalId: sub.professionalId,
            priceInCents: sub.priceInCents,
            expiresAt: sub.expiresAt,
            status: sub.status,
            professional: profMap[sub.professionalId] ?? null,
        }));

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

        // Garante que o subscriber só cancele a própria assinatura
        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            subscriberId: userId,
            status: 'ACTIVE',
        });

        if (!subscription) {
            return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
        }

        const professionalId = subscription.professionalId;

        // Marca como CANCELED
        subscription.status = 'CANCELED';
        await subscription.save();

        // Remove da lista de subscribers da profissional
        await User.updateOne(
            { clerkId: professionalId },
            { $pull: { subscribers: userId } }
        );

        return NextResponse.json({ success: true, message: 'Assinatura cancelada com sucesso.' });
    } catch (error) {
        console.error('[DELETE /api/users/me/subscriptions]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
