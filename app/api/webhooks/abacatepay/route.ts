import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { sendPushNotification } from '@/lib/push';
import { recordAcquisitionEvent } from '@/lib/acquisitionAnalytics';
import { CampaignVisit } from '@/models/CampaignVisit';
import { getAbacatePixWebhookId } from '@/lib/abacatePix';
import { settleAbacatePix } from '@/lib/settleAbacatePix';
import { executeRechargeCredit } from '@/lib/creditRecharge';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('=== Webhook AbacatePay RECEBIDO ===');
        const pixId = getAbacatePixWebhookId(body);
        if (pixId) {
            await connectToDatabase();
            const result = await settleAbacatePix(pixId);
            if (!result) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
            if (result.credited) {
                try {
                    const amount = result.transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    await sendPushNotification(result.transaction.userId, 'Recarga realizada! ✅', `Sua recarga de ${amount} foi confirmada e já está disponível.`);
                } catch { console.error('[PIX] Post-credit notification failed', { paymentId: pixId }); }
            }
            return NextResponse.json({ received: true, status: result.transaction.status });
        }
        
        let abacateId = '';
        if (body?.data?.transparent?.id) {
            abacateId = body.data.transparent.id;
        } else if (body?.data?.pixQrCode?.id) {
            abacateId = body.data.pixQrCode.id;
        } else if (body?.data?.billing?.id) {
            abacateId = body.data.billing.id;
        } else if (body?.data?.id) {
            abacateId = body.data.id;
        } else if (body?.id) {
            abacateId = body.id;
        }

        const eventStatus =
            body?.data?.transparent?.status ||
            body?.data?.pixQrCode?.status ||
            body?.data?.billing?.status ||
            body?.data?.status ||
            body?.status ||
            body?.event;

        if (!abacateId) {
            console.error('Webhook payload sem id:', body);
            return NextResponse.json({ error: 'Missing Id' }, { status: 400 });
        }

        // Se o status indicar que foi pago ('PAID' / 'payment.paid')
        const isPaid =
            typeof eventStatus === 'string' &&
            (eventStatus.toUpperCase() === 'PAID' ||
                eventStatus.toLowerCase().includes('paid') ||
                eventStatus.toLowerCase().includes('completed'));

        if (!isPaid) {
            console.log('Webhook evento ignorado (não é pago):', eventStatus);
            return NextResponse.json({ received: true });
        }

        await connectToDatabase();

        const creditResult = await executeRechargeCredit({
            paymentId: abacateId,
            provider: 'abacatepay',
            providerStatus: eventStatus,
            receiptUrl: body?.data?.transparent?.receiptUrl || body?.data?.billing?.receiptUrl,
        });

        if (!creditResult.success) {
            const exists = await Transaction.exists({ abacatePayId: abacateId });
            if (!exists) {
                console.error('Transação não encontrada:', abacateId);
                return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
            }

            console.error('Falha ao creditar recarga AbacatePay:', creditResult.message);
            return NextResponse.json({ error: creditResult.message || 'Failed to credit recharge' }, { status: 500 });
        }

        if (creditResult.alreadyCredited) {
            console.log('Transação já paga/creditada anteriormente:', abacateId);
            return NextResponse.json({ received: true, message: 'Already paid' });
        }

        return NextResponse.json({
            success: true,
            message: 'Balance updated via webhook'
        });

    } catch (error) {
        console.error('Error no Webhook AbacatePay:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
