import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { Transaction, ITransaction } from '@/models/Transaction';
import { User, IUser } from '@/models/User';
import { recordAcquisitionEvent } from '@/lib/acquisitionAnalytics';
import { CampaignVisit } from '@/models/CampaignVisit';
import { sendPushNotification } from '@/lib/push';

export interface ExecuteRechargeCreditParams {
    paymentId?: string;
    transactionId?: string;
    userId?: string;
    provider?: 'asaas' | 'abacatepay';
    providerStatus?: string;
    receiptUrl?: string;
    invoiceUrl?: string;
    event?: string;
}

export interface RechargeCreditResult {
    success: boolean;
    alreadyCredited: boolean;
    creditedNow: boolean;
    amountCents: number;
    transaction?: ITransaction | null;
    user?: IUser | null;
    message?: string;
}

/**
 * Executa o crédito de uma recarga com blindagem completa contra duplicidade e falhas de concorrência.
 * 
 * - Idempotente: se a transação já possui 'metadata.creditedAt', nada é creditado novamente.
 * - Atômico: utiliza $inc direto no MongoDB (garante que tanto 'balance' quanto 'customerCashAvailableCents' sejam incrementados com segurança).
 * - Notificações e Analytics: dispara push, evento de aquisição e liquidação de assinaturas pendentes após o crédito.
 */
export async function executeRechargeCredit(params: ExecuteRechargeCreditParams): Promise<RechargeCreditResult> {
    await connectToDatabase();

    const { paymentId, transactionId, userId, provider, providerStatus, receiptUrl, invoiceUrl, event } = params;

    const query: Record<string, unknown> = {};
    if (transactionId) {
        query._id = transactionId;
    } else if (paymentId) {
        query.abacatePayId = paymentId;
    } else {
        return { success: false, alreadyCredited: false, creditedNow: false, amountCents: 0, message: 'Missing paymentId or transactionId' };
    }

    if (userId) {
        query.userId = userId;
    }

    const existingTx = await Transaction.findOne(query);
    if (!existingTx) {
        return { success: false, alreadyCredited: false, creditedNow: false, amountCents: 0, message: 'Transaction not found' };
    }

    // Se já tiver sido creditada, retorna imediatamente sem duplicar
    if (existingTx.metadata?.creditedAt) {
        const amountCents = Math.round((existingTx.amount || 0) * 100);
        return {
            success: true,
            alreadyCredited: true,
            creditedNow: false,
            amountCents,
            transaction: existingTx,
        };
    }

    const amountCents = Math.round((existingTx.amount || 0) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
        return {
            success: false,
            alreadyCredited: false,
            creditedNow: false,
            amountCents: 0,
            message: `Invalid transaction amount: ${existingTx.amount}`,
        };
    }

    let updatedTx: ITransaction | null = null;
    let updatedUser: IUser | null = null;

    const setFields: Record<string, unknown> = {
        status: 'PAID',
        'metadata.creditedAt': new Date(),
    };
    if (provider) setFields['metadata.provider'] = provider;
    if (providerStatus) setFields['metadata.providerStatus'] = providerStatus;
    if (receiptUrl) setFields['metadata.receiptUrl'] = receiptUrl;
    if (invoiceUrl) setFields['metadata.invoiceUrl'] = invoiceUrl;
    if (event) setFields['metadata.webhookEvent'] = event;

    // Tenta usar transação de sessão caso o MongoDB seja Replica Set
    try {
        const sessionResult = await mongoose.connection.transaction(async (session) => {
            const tx = await Transaction.findOneAndUpdate(
                { _id: existingTx._id, 'metadata.creditedAt': { $exists: false } },
                { $set: setFields },
                { new: true, session }
            );

            if (!tx) {
                // Outra requisição em paralelo já marcou creditedAt
                return null;
            }

            const user = await User.findOneAndUpdate(
                { clerkId: tx.userId },
                {
                    $inc: {
                        balance: amountCents,
                        customerCashAvailableCents: amountCents,
                    },
                },
                { new: true, session }
            );

            if (!user) {
                throw new Error(`User not found for recharge credit: ${tx.userId}`);
            }

            return { tx, user };
        });

        if (sessionResult) {
            updatedTx = sessionResult.tx;
            updatedUser = sessionResult.user;
        } else {
            // Concorrência evitada: já creditado
            const currentTx = await Transaction.findById(existingTx._id);
            return {
                success: true,
                alreadyCredited: true,
                creditedNow: false,
                amountCents,
                transaction: currentTx || existingTx,
            };
        }
    } catch (sessionErr: unknown) {
        // Se der erro de transações não suportadas (ex: standalone em ambiente de dev local)
        const errMsg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
        if (
            errMsg.includes('Transaction numbers are only allowed on a replica set member') ||
            errMsg.includes('This MongoDB deployment does not support retryable writes')
        ) {
            // Fallback atômico sem session
            const tx = await Transaction.findOneAndUpdate(
                { _id: existingTx._id, 'metadata.creditedAt': { $exists: false } },
                { $set: setFields },
                { new: true }
            );

            if (!tx) {
                const currentTx = await Transaction.findById(existingTx._id);
                return {
                    success: true,
                    alreadyCredited: true,
                    creditedNow: false,
                    amountCents,
                    transaction: currentTx || existingTx,
                };
            }

            const user = await User.findOneAndUpdate(
                { clerkId: tx.userId },
                {
                    $inc: {
                        balance: amountCents,
                        customerCashAvailableCents: amountCents,
                    },
                },
                { new: true }
            );

            if (!user) {
                console.error(`[creditRecharge] User ${tx.userId} not found after tx ${tx._id} marked PAID`);
            }

            updatedTx = tx;
            updatedUser = user;
        } else {
            console.error('[creditRecharge] Erro na transação de crédito:', sessionErr);
            throw sessionErr;
        }
    }

    if (!updatedTx || !updatedUser) {
        return {
            success: false,
            alreadyCredited: false,
            creditedNow: false,
            amountCents,
            message: 'Failed to credit balance',
        };
    }

    // Passos pós-crédito com captura individual de erros para não interromper a resposta
    try {
        await recordAcquisitionEvent({
            eventType: 'first_recharge',
            dedupeKey: `first_recharge:${updatedTx.userId}`,
            actorId: updatedTx.userId,
            clientId: updatedTx.userId,
            professionalId: updatedUser.acquiredByProfessionalId,
            origin: updatedUser.acquisitionSource || 'unknown',
            amountCents,
            occurredAt: updatedTx.timestamp || new Date(),
            metadata: {
                provider: provider || updatedTx.metadata?.provider || 'unknown',
                transactionId: updatedTx._id.toString(),
            },
        });

        await CampaignVisit.findOneAndUpdate(
            { userId: updatedTx.userId, firstRechargeAt: null },
            {
                $set: {
                    firstRechargeAt: updatedTx.timestamp || new Date(),
                    firstRechargeAmountCents: amountCents,
                },
            },
            { sort: { signupCompletedAt: -1, createdAt: -1 } }
        );
    } catch (analyticsErr) {
        console.error('[creditRecharge] Erro ao registrar analytics pós-recarga:', analyticsErr);
    }

    try {
        const amountInReais = (amountCents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
        await sendPushNotification(
            updatedUser.clerkId,
            'Recarga realizada!',
            `Sua recarga de ${amountInReais} foi confirmada e ja esta disponivel.`
        );
    } catch (pushErr) {
        console.error('[creditRecharge] Erro ao enviar push pós-recarga:', pushErr);
    }

    try {
        const { settlePendingSubscriptionsForUser } = await import('@/lib/subscriptionBilling');
        await settlePendingSubscriptionsForUser(updatedUser.clerkId);
    } catch (settleErr) {
        console.error('[creditRecharge] Erro ao liquidar assinaturas pendentes após recarga:', settleErr);
    }

    console.info(`[creditRecharge] Recarga de R$ ${(amountCents / 100).toFixed(2)} creditada com sucesso para ${updatedUser.clerkId}`);

    return {
        success: true,
        alreadyCredited: false,
        creditedNow: true,
        amountCents,
        transaction: updatedTx,
        user: updatedUser,
    };
}
