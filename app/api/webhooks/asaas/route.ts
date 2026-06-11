import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { mapAsaasPaymentStatus } from '@/lib/asaas';
import { sendPushNotification } from '@/lib/push';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';

type AsaasWebhookBody = {
    id?: string;
    event?: string;
    payment?: {
        id?: string;
        status?: string;
        value?: number;
        billingType?: string;
        externalReference?: string;
        invoiceUrl?: string;
        transactionReceiptUrl?: string;
    };
    transfer?: {
        id?: string;
        status?: string;
        value?: number;
        failReason?: string | null;
    };
};

function isAuthorized(request: NextRequest) {
    const expectedToken = process.env.ASAAS_WEBHOOK_AUTH_TOKEN || process.env.ASSAS_WEBHOOK_AUTH_TOKEN;

    if (!expectedToken) return true;

    const receivedToken =
        request.headers.get('asaas-access-token') ||
        request.headers.get('access_token') ||
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    return receivedToken === expectedToken;
}

export async function POST(request: NextRequest) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json()) as AsaasWebhookBody;
        const event = body.event;

        if (!event) {
            return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Processar Eventos de Transferência (Saques/Pix Automático)
        if (event.startsWith('TRANSFER_')) {
            const transfer = body.transfer;
            const transferId = transfer?.id;

            if (!transferId) {
                console.error('Asaas transfer webhook without transfer id:', body);
                return NextResponse.json({ error: 'Missing transfer id' }, { status: 400 });
            }

            const withdraw = await WithdrawRequest.findOne({ asaasTransferId: transferId });
            if (!withdraw) {
                console.log('Asaas transfer not found in Mimo database, ignoring:', transferId);
                return NextResponse.json({ received: true, message: 'Transfer not found in Mimo database, ignoring' }, { status: 200 });
            }

            if (event === 'TRANSFER_DONE') {
                if (withdraw.status === 'concluido') {
                    return NextResponse.json({ received: true, message: 'Already marked as completed' });
                }

                withdraw.status = 'concluido';
                await withdraw.save();

                const existingTx = await Transaction.findOne({ 'metadata.withdrawRequestId': withdraw._id.toString() });
                if (!existingTx) {
                    await Transaction.create({
                        userId: withdraw.userId,
                        amount: withdraw.amount / 100, // em reais
                        status: 'COMPLETED',
                        type: 'debit',
                        source: 'withdrawal',
                        timestamp: new Date(),
                        metadata: {
                            withdrawRequestId: withdraw._id.toString(),
                            pixKey: withdraw.pixKey,
                            asaasTransferId: transferId
                        }
                    });
                }
            } else if (event === 'TRANSFER_FAILED' || event === 'TRANSFER_CANCELLED') {
                if (withdraw.status === 'rejeitado') {
                    return NextResponse.json({ received: true, message: 'Already marked as rejected' });
                }

                const user = await User.findOneAndUpdate(
                    { clerkId: withdraw.userId },
                    { $inc: { balance: withdraw.amount } }
                );

                if (!user) {
                    console.error('User associated with failed transfer not found:', withdraw.userId);
                    return NextResponse.json({ error: 'User not found for failed transfer' }, { status: 404 });
                }

                withdraw.status = 'rejeitado';
                await withdraw.save();
            }

            return NextResponse.json({ received: true });
        }

        // 2. Processar Eventos de Cobrança (Existente)
        const payment = body.payment;
        const paymentId = payment?.id;
        const providerStatus = payment?.status;

        if (!paymentId || !providerStatus) {
            console.error('Asaas webhook without payment id/status:', body);
            return NextResponse.json({ error: 'Missing payment id or status' }, { status: 400 });
        }

        const status = mapAsaasPaymentStatus(providerStatus);

        if (status !== 'PAID') {
            if (status === 'CANCELLED') {
                await Transaction.findOneAndUpdate(
                    { abacatePayId: paymentId, status: 'PENDING' },
                    {
                        $set: {
                            status: 'CANCELLED',
                            'metadata.providerStatus': providerStatus,
                            'metadata.asaasWebhookEvent': body.event,
                        },
                    }
                );
            }

            return NextResponse.json({ received: true });
        }

        const transaction = await Transaction.findOneAndUpdate(
            { abacatePayId: paymentId, status: { $ne: 'PAID' } },
            {
                $set: {
                    status: 'PAID',
                    'metadata.providerStatus': providerStatus,
                    'metadata.asaasWebhookEvent': body.event,
                    'metadata.invoiceUrl': payment?.invoiceUrl,
                    'metadata.transactionReceiptUrl': payment?.transactionReceiptUrl,
                },
            },
            { new: true }
        );

        if (!transaction) {
            const exists = await Transaction.exists({ abacatePayId: paymentId });
            if (!exists) {
                console.error('Asaas transaction not found:', paymentId);
                return NextResponse.json({ received: true, message: 'Transaction not found in Mimo database, ignoring' }, { status: 200 });
            }

            return NextResponse.json({ received: true, message: 'Already paid' });
        }

        const user = await User.findOneAndUpdate(
            { clerkId: transaction.userId },
            { $inc: { balance: Math.round((transaction.amount || 0) * 100) } },
            { new: true }
        );

        if (!user) {
            console.error('Asaas transaction user not found:', transaction.userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const amountInReais = (transaction.amount || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });

        await sendPushNotification(
            user.clerkId,
            'Recarga realizada!',
            `Sua recarga de ${amountInReais} foi confirmada e ja esta disponivel.`
        );

        return NextResponse.json({ success: true, message: 'Balance updated via Asaas webhook' });
    } catch (error) {
        console.error('Error in Asaas webhook:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
