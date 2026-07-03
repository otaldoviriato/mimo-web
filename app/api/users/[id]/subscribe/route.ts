import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, Transaction, Subscription } from '@/models';

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
            return NextResponse.json({ error: 'Você não pode assinar seu próprio perfil' }, { status: 400 });
        }

        await connectToDatabase();

        const owner = await User.findOne({ clerkId: ownerId });
        const requester = await User.findOne({ clerkId: requesterId });

        if (!owner || !owner.isProfessional || owner.professionalStatus !== 'approved') {
            return NextResponse.json({ error: 'Perfil não encontrado, não profissional ou não verificado' }, { status: 404 });
        }

        if (!owner.isSubscriptionEnabled) {
            return NextResponse.json({ error: 'Este perfil não aceita assinaturas no momento' }, { status: 400 });
        }

        if (!requester) {
            return NextResponse.json({ error: 'Seu perfil não foi encontrado' }, { status: 404 });
        }

        // Verificar se já é assinante
        if (owner.subscribers.includes(requesterId)) {
            return NextResponse.json({ error: 'Você já é um assinante' }, { status: 400 });
        }

        // subscriptionPrice é armazenado em reais; balance é em centavos
        const priceInCents = Math.round((owner.subscriptionPrice || 0) * 100);

        if (priceInCents > 0) {
            if (requester.balance < priceInCents) {
                return NextResponse.json({ error: 'Saldo insuficiente para assinar' }, { status: 400 });
            }

            // Realizar transação
            // Tira de quem assina
            await User.updateOne(
                { clerkId: requesterId },
                { $inc: { balance: -priceInCents } }
            );

            // Dá para o dono do perfil
            await User.updateOne(
                { clerkId: ownerId },
                { $inc: { balance: priceInCents } }
            );

            // Registrar transações
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
                }
            ]);
        }

        // Criar ou atualizar a validade da assinatura na coleção Subscription
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias de validade

        await Subscription.findOneAndUpdate(
            { subscriberId: requesterId, professionalId: ownerId },
            {
                status: 'ACTIVE',
                priceInCents: priceInCents,
                expiresAt,
            },
            { upsert: true, new: true }
        );

        // Adicionar à lista de assinantes
        await User.updateOne(
            { clerkId: ownerId },
            { $addToSet: { subscribers: requesterId } }
        );

        return NextResponse.json({ success: true, message: 'Assinatura realizada com sucesso!' });
    } catch (error: any) {
        console.error('Error in subscription:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
