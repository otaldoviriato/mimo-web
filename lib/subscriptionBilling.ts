export class SubscriptionBillingError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = 'SubscriptionBillingError';
        this.status = status;
    }
}

export function subscriptionPriceBRLToCents(priceInReais: unknown): number {
    const price = Number(priceInReais);

    if (!Number.isFinite(price) || price < 0) {
        throw new SubscriptionBillingError('Preço da assinatura inválido');
    }

    return Math.round(price * 100);
}

export function normalizeStoredSubscriptionPriceInCents(
    storedPriceInCents: unknown,
    currentProfessionalPriceInReais?: unknown
): number {
    const stored = Number(storedPriceInCents);

    if (!Number.isFinite(stored) || stored < 0) {
        throw new SubscriptionBillingError('Preço da assinatura inválido');
    }

    const currentPrice = Number(currentProfessionalPriceInReais);
    const hasCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0;
    const currentPriceInCents = hasCurrentPrice ? subscriptionPriceBRLToCents(currentPrice) : null;

    // Legacy production records were sometimes saved as BRL in a field named priceInCents.
    // Example: 25.9 was displayed as R$ 0,26 after the UI divided by 100.
    if (!Number.isInteger(stored)) {
        return subscriptionPriceBRLToCents(stored);
    }

    // Defensive repair for legacy integer-rounded BRL values, e.g. 26 instead of 2590.
    if (
        currentPriceInCents &&
        stored > 0 &&
        stored < currentPriceInCents / 10 &&
        Math.abs(stored - Math.round(currentPrice)) <= 1
    ) {
        return currentPriceInCents;
    }

    return stored;
}

/**
 * Tenta liquidar assinaturas que estejam com status PAST_DUE para um usuário após uma recarga de saldo.
 */
export async function settlePendingSubscriptionsForUser(userId: string) {
    if (!userId) return [];

    try {
        const { connectToDatabase } = await import('@/lib/db');
        const { User, Subscription, Transaction, AppSettings } = await import('@/models');
        const { sendPushNotification } = await import('@/lib/push');

        await connectToDatabase();

        const pendingSubs = await Subscription.find({
            subscriberId: userId,
            status: 'PAST_DUE',
        }).sort({ pastDueSince: 1, createdAt: 1 });

        if (!pendingSubs || pendingSubs.length === 0) {
            return [];
        }

        const settings = await AppSettings.findOne({ key: 'global' });
        const feePercentage = settings?.platformFeePercentage ?? 20;

        const settled: string[] = [];

        for (const sub of pendingSubs) {
            const client = await User.findOne({ clerkId: userId }).select('balance clerkId name username');
            if (!client) break;

            const professional = await User.findOne({
                clerkId: sub.professionalId,
                isProfessional: true,
                professionalStatus: 'approved',
                isSubscriptionEnabled: true,
            }).select('clerkId name username subscriptionPrice');

            if (!professional) {
                // Se a profissional não puder mais receber assinaturas, expira de vez
                sub.status = 'EXPIRED';
                await sub.save();
                await User.updateOne({ clerkId: sub.professionalId }, { $pull: { subscribers: userId } });
                continue;
            }

            const priceInCents = normalizeStoredSubscriptionPriceInCents(
                sub.priceInCents,
                professional.subscriptionPrice
            );

            if (client.balance < priceInCents) {
                // Saldo insuficiente para cobrir esta assinatura pendente
                continue;
            }

            const platformFee = Math.ceil((priceInCents * feePercentage) / 100);
            const professionalEarnings = priceInCents - platformFee;

            // Debita do cliente
            const debitResult = await User.updateOne(
                { clerkId: userId, balance: { $gte: priceInCents } },
                [{
                    $set: {
                        balance: { $subtract: ['$balance', priceInCents] },
                        customerCashAvailableCents: {
                            $cond: [
                                { $ne: [{ $type: '$marketplaceWalletMigratedAt' }, 'missing'] },
                                { $max: [0, { $subtract: [{ $ifNull: ['$customerCashAvailableCents', 0] }, priceInCents] }] },
                                '$customerCashAvailableCents',
                            ],
                        },
                    },
                }]
            );

            if (debitResult.modifiedCount === 0) {
                continue;
            }

            // Credita a profissional
            await User.updateOne(
                { clerkId: sub.professionalId },
                [{
                    $set: {
                        balance: { $add: [{ $ifNull: ['$balance', 0] }, professionalEarnings] },
                        professionalAvailableCents: {
                            $cond: [
                                { $ne: [{ $type: '$marketplaceWalletMigratedAt' }, 'missing'] },
                                { $add: [{ $ifNull: ['$professionalAvailableCents', 0] }, professionalEarnings] },
                                '$professionalAvailableCents',
                            ],
                        },
                    },
                }]
            );

            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + 30);

            sub.status = 'ACTIVE';
            sub.expiresAt = newExpiresAt;
            sub.pastDueSince = null;
            sub.lastRetryAt = new Date();
            sub.priceInCents = priceInCents;
            await sub.save();

            // Adiciona de volta ao array de subscribers
            await User.updateOne(
                { clerkId: sub.professionalId },
                { $addToSet: { subscribers: userId } }
            );

            // Registra as transações
            await Transaction.create([
                {
                    userId,
                    type: 'debit',
                    amount: priceInCents,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: sub.professionalId,
                    metadata: { platformFee, isRetrySettle: true },
                },
                {
                    userId: sub.professionalId,
                    type: 'credit',
                    amount: professionalEarnings,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: userId,
                    metadata: { platformFee, isRetrySettle: true },
                },
                {
                    userId: 'platform',
                    type: 'platform_fee',
                    amount: platformFee,
                    source: 'subscription',
                    status: 'COMPLETED',
                    relatedUserId: sub.professionalId,
                    metadata: { senderId: userId, receiverId: sub.professionalId, isRetrySettle: true },
                },
            ]);

            settled.push(sub.professionalId);

            // Notifica ambos
            try {
                const profName = professional.name || (professional.username ? `@${professional.username}` : 'criadora');
                const clientName = client.name || (client.username ? `@${client.username}` : 'Um assinante');
                const amountFormatted = (priceInCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                await sendPushNotification(
                    userId,
                    'Assinatura renovada! ✅',
                    `Sua assinatura de ${profName} foi regularizada e está ativa novamente.`
                );

                await sendPushNotification(
                    sub.professionalId,
                    'Assinatura regularizada! 🌟',
                    `${clientName} regularizou a assinatura no valor de ${amountFormatted}.`
                );
            } catch (pushErr) {
                console.error('[settlePendingSubscriptionsForUser] Push notification error:', pushErr);
            }
        }

        return settled;
    } catch (error) {
        console.error('[settlePendingSubscriptionsForUser] Erro ao liquidar assinaturas pendentes:', error);
        return [];
    }
}

