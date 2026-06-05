import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { mapAsaasPaymentStatus } from '@/lib/asaas';
import { sendPushNotification } from '@/lib/push';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';

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
        const payment = body.payment;
        const paymentId = payment?.id;
        const providerStatus = payment?.status;

        if (!paymentId || !providerStatus) {
            console.error('Asaas webhook without payment id/status:', body);
            return NextResponse.json({ error: 'Missing payment id or status' }, { status: 400 });
        }

        await connectToDatabase();

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
                return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
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
