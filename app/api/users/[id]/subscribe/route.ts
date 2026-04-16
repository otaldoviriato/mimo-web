import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User, Transaction } from '@/models';

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

        if (!owner || !owner.isProfessional) {
            return NextResponse.json({ error: 'Perfil não encontrado ou não profissional' }, { status: 404 });
        }

        if (!requester) {
            return NextResponse.json({ error: 'Seu perfil não foi encontrado' }, { status: 404 });
        }

        // Verificar se já é assinante
        if (owner.subscribers.includes(requesterId)) {
            return NextResponse.json({ error: 'Você já é um assinante' }, { status: 400 });
        }

        const price = owner.subscriptionPrice || 0;

        if (price > 0) {
            if (requester.balance < price) {
                return NextResponse.json({ error: 'Saldo insuficiente para assinar' }, { status: 400 });
            }

            // Realizar transação
            // Tira de quem assina
            await User.updateOne(
                { clerkId: requesterId },
                { $inc: { balance: -price } }
            );

            // Dá para o dono do perfil
            await User.updateOne(
                { clerkId: ownerId },
                { $inc: { balance: price } }
            );

            // Registrar transações (Opcional, mas boa prática)
            await Transaction.create([
                {
                    userId: requesterId,
                    type: 'debit',
                    amount: price,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: ownerId,
                },
                {
                    userId: ownerId,
                    type: 'credit',
                    amount: price,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: requesterId,
                }
            ]);
        }

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
