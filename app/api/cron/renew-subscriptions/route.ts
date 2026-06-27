import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User, Transaction, Subscription } from '@/models';

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

        const now = new Date();

        // Buscar assinaturas ativas expiradas (expiresAt <= now)
        const expiredSubscriptions = await Subscription.find({
            status: 'ACTIVE',
            expiresAt: { $lte: now }
        });

        const results = {
            processed: 0,
            renewed: 0,
            expired: 0,
            details: [] as string[]
        };

        for (const sub of expiredSubscriptions) {
            results.processed++;
            const { subscriberId, professionalId } = sub;

            // Carregar cliente e profissional
            const client = await User.findOne({ clerkId: subscriberId });
            const professional = await User.findOne({ clerkId: professionalId });

            if (!professional || !professional.isProfessional || !professional.isSubscriptionEnabled) {
                // Profissional não existe ou desativou assinaturas: expirar acesso
                sub.status = 'EXPIRED';
                await sub.save();

                // Remover da lista de assinantes
                await User.updateOne(
                    { clerkId: professionalId },
                    { $pull: { subscribers: subscriberId } }
                );

                results.expired++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired because professional disabled subscriptions or does not exist.`);
                continue;
            }

            if (!client) {
                // Cliente não encontrado: expirar acesso
                sub.status = 'EXPIRED';
                await sub.save();

                await User.updateOne(
                    { clerkId: professionalId },
                    { $pull: { subscribers: subscriberId } }
                );

                results.expired++;
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired because client profile was not found.`);
                continue;
            }

            const price = professional.subscriptionPrice || 0;

            if (price > 0) {
                // Verificar se o cliente tem saldo
                if (client.balance < price) {
                    // Sem saldo suficiente: expirar assinatura
                    sub.status = 'EXPIRED';
                    await sub.save();

                    // Remover da lista de assinantes
                    await User.updateOne(
                        { clerkId: professionalId },
                        { $pull: { subscribers: subscriberId } }
                    );

                    results.expired++;
                    results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired due to insufficient balance. Price: ${price}, Balance: ${client.balance}`);
                    continue;
                }

                // Se tiver saldo, debitar do cliente e creditar na profissional
                await User.updateOne(
                    { clerkId: subscriberId },
                    { $inc: { balance: -price } }
                );

                await User.updateOne(
                    { clerkId: professionalId },
                    { $inc: { balance: price } }
                );

                // Criar transações de histórico
                await Transaction.create([
                    {
                        userId: subscriberId,
                        type: 'debit',
                        amount: price,
                        source: 'subscription',
                        status: 'COMPLETED',
                        relatedUserId: professionalId,
                    },
                    {
                        userId: professionalId,
                        type: 'credit',
                        amount: price,
                        source: 'subscription',
                        status: 'COMPLETED',
                        relatedUserId: subscriberId,
                    }
                ]);
            }

            // Renovar assinatura (estender validade por +30 dias a partir da data de expiração anterior)
            const newExpiresAt = new Date(sub.expiresAt);
            newExpiresAt.setDate(newExpiresAt.getDate() + 30);
            
            // Caso por algum motivo a assinatura já esteja muito atrasada, renovar a partir de agora
            if (newExpiresAt <= now) {
                const altExpiresAt = new Date();
                altExpiresAt.setDate(altExpiresAt.getDate() + 30);
                sub.expiresAt = altExpiresAt;
            } else {
                sub.expiresAt = newExpiresAt;
            }

            sub.priceInCents = price;
            await sub.save();

            results.renewed++;
            results.details.push(`Subscription of ${subscriberId} to ${professionalId} successfully renewed. New expiration: ${sub.expiresAt.toISOString()}`);
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
