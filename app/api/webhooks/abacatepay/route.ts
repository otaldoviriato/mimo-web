import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAbacatePixWebhookId } from '@/lib/abacatePix';
import { getWebhookEventId, verifyAbacateWebhook } from '@/lib/abacateWebhook';
import { settleAbacatePix } from '@/lib/settleAbacatePix';
import { sendPushNotification } from '@/lib/push';
import { PaymentWebhookEvent } from '@/models/PaymentWebhookEvent';
import { Transaction } from '@/models/Transaction';

export const runtime = 'nodejs';

function eventName(body: unknown) {
    if (!body || typeof body !== 'object') return undefined;
    const event = (body as Record<string, unknown>).event;
    return typeof event === 'string' ? event : undefined;
}

export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-abacate-signature');
    if (!verifyAbacateWebhook(rawBody, request.nextUrl.searchParams.get('webhookSecret'), signature)) {
        console.warn('[abacatepay-webhook]', { outcome: 'unauthorized' });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const paymentId = getAbacatePixWebhookId(body);
    const eventId = getWebhookEventId(body, rawBody);
    const event = eventName(body);
    await connectToDatabase();

    try {
        await PaymentWebhookEvent.create({
            eventId, provider: 'abacatepay', event, paymentId,
            status: 'RECEIVED', attempts: 1, receivedAt: new Date(),
        });
    } catch (error) {
        const duplicate = error && typeof error === 'object' && 'code' in error && error.code === 11000;
        if (!duplicate) throw error;
        const previous = await PaymentWebhookEvent.findOneAndUpdate(
            { eventId }, { $inc: { attempts: 1 } }, { new: true },
        );
        if (previous?.status === 'PROCESSED') {
            return NextResponse.json({ received: true, duplicate: true });
        }
    }

    try {
        if (!paymentId) throw new Error('Unsupported webhook payload: missing PIX payment ID');

        await Transaction.updateOne({ abacatePayId: paymentId }, {
            $set: { 'metadata.webhookReceivedAt': new Date(), 'metadata.webhookEventId': eventId },
        });
        const settlement = await settleAbacatePix(paymentId);
        if (!settlement) throw new Error('Transaction not found');
        if (settlement.transaction.status !== 'PAID') {
            throw new Error('Provider payment confirmation is not visible yet');
        }

        await PaymentWebhookEvent.updateOne({ eventId }, {
            $set: { status: 'PROCESSED', processedAt: new Date(), paymentId },
            $unset: { lastError: 1 },
        });

        if (settlement.credited) {
            try {
                const amount = settlement.transaction.amount.toLocaleString('pt-BR', {
                    style: 'currency', currency: 'BRL',
                });
                await sendPushNotification(
                    settlement.transaction.userId,
                    'Recarga realizada! ✅',
                    `Sua recarga de ${amount} foi confirmada e já está disponível.`,
                );
            } catch {
                console.error('[abacatepay-webhook]', { eventId, paymentId, outcome: 'notification_failed' });
            }
        }

        console.info('[abacatepay-webhook]', {
            eventId, paymentId, outcome: settlement.credited ? 'credited' : 'processed',
        });
        return NextResponse.json({ received: true, status: settlement.transaction.status });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
        await PaymentWebhookEvent.updateOne({ eventId }, {
            $set: { status: 'FAILED', lastError: message, paymentId },
        });
        console.error('[abacatepay-webhook]', { eventId, paymentId, outcome: 'failed', error: message });
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 503 });
    }
}
