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

            // [SEGURANÇA] Verificar se profissional ainda existe, está aprovado e com assinaturas ativas
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
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired because professional disabled subscriptions, is not approved, or does not exist.`);
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
                results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired because client profile was not found.`);
                continue;
            }

            // [SEGURANÇA] subscriptionPrice é armazenado em reais; balance é em centavos
            const priceInCents = Math.round((professional.subscriptionPrice || 0) * 100);

            if (priceInCents > 0) {
                // [SEGURANÇA] Verificar se o cliente tem saldo suficiente
                if (client.balance < priceInCents) {
                    sub.status = 'EXPIRED';
                    await sub.save();

                    await User.updateOne(
                        { clerkId: professionalId },
                        { $pull: { subscribers: subscriberId } }
                    );

                    results.expired++;
                    results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired due to insufficient balance. Price: ${priceInCents} cents, Balance: ${client.balance} cents`);
                    continue;
                }

                // [SEGURANÇA] Débito atômico: só debita se ainda tiver saldo suficiente
                // Evita race condition caso o saldo seja consumido entre a leitura e o débito
                const debitResult = await User.updateOne(
                    { clerkId: subscriberId, balance: { $gte: priceInCents } },
                    { $inc: { balance: -priceInCents } }
                );

                if (debitResult.modifiedCount === 0) {
                    // Saldo foi consumido entre a verificação e o débito (race condition)
                    sub.status = 'EXPIRED';
                    await sub.save();

                    await User.updateOne(
                        { clerkId: professionalId },
                        { $pull: { subscribers: subscriberId } }
                    );

                    results.expired++;
                    results.details.push(`Subscription of ${subscriberId} to ${professionalId} expired due to race condition on balance debit.`);
                    continue;
                }

                // Creditar na profissional
                await User.updateOne(
                    { clerkId: professionalId },
                    { $inc: { balance: priceInCents } }
                );

                // Registrar transações de histórico
                await Transaction.create([
                    {
                        userId: subscriberId,
                        type: 'debit',
                        amount: priceInCents,
                        source: 'subscription',
                        status: 'COMPLETED',
                        relatedUserId: professionalId,
                    },
                    {
                        userId: professionalId,
                        type: 'credit',
                        amount: priceInCents,
                        source: 'subscription',
                        status: 'COMPLETED',
                        relatedUserId: subscriberId,
                    }
                ]);
            }

            // Renovar assinatura (+30 dias a partir da data de expiração anterior)
            const newExpiresAt = new Date(sub.expiresAt);
            newExpiresAt.setDate(newExpiresAt.getDate() + 30);

            // Se a data ficou muito atrasada, renovar a partir de agora
            if (newExpiresAt <= now) {
                const altExpiresAt = new Date();
                altExpiresAt.setDate(altExpiresAt.getDate() + 30);
                sub.expiresAt = altExpiresAt;
            } else {
                sub.expiresAt = newExpiresAt;
            }

            // [CORRIGIDO] Salvar priceInCents correto (era `price`, variável inexistente)
            sub.priceInCents = priceInCents;
            await sub.save();

            results.renewed++;
            results.details.push(`Subscription of ${subscriberId} to ${professionalId} successfully renewed. Price: ${priceInCents} cents. New expiration: ${sub.expiresAt.toISOString()}`);
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
