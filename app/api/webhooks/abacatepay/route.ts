import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { sendPushNotification } from '@/lib/push';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('=== Webhook AbacatePay RECEBIDO ===');
        
        let abacateId = '';
        if (body?.data?.pixQrCode?.id) {
            abacateId = body.data.pixQrCode.id;
        } else if (body?.data?.billing?.id) {
            abacateId = body.data.billing.id;
        } else if (body?.data?.id) {
            abacateId = body.data.id;
        } else if (body?.id) {
            abacateId = body.id;
        }

        let eventStatus = body?.data?.pixQrCode?.status || body?.data?.billing?.status || body?.data?.status || body?.status || body?.event;

        if (!abacateId) {
            console.error('Webhook payload sem id:', body);
            return NextResponse.json({ error: 'Missing Id' }, { status: 400 });
        }

        // Se o status indicar que foi pago ('PAID' / 'payment.paid')
        const isPaid =
            typeof eventStatus === 'string' &&
            (eventStatus.toUpperCase() === 'PAID' || eventStatus.includes('paid'));

        if (!isPaid) {
            console.log('Webhook evento ignorado (não é pago):', eventStatus);
            return NextResponse.json({ received: true });
        }

        await connectToDatabase();

        // Operação atômica: só atualiza se ainda estiver PENDING, evitando duplicatas
        const transaction = await Transaction.findOneAndUpdate(
            { abacatePayId: abacateId, status: { $ne: 'PAID' } },
            { $set: { status: 'PAID' } },
            { new: true }
        );

        if (!transaction) {
            // Ou não existe, ou já foi processada antes
            const exists = await Transaction.exists({ abacatePayId: abacateId });
            if (!exists) {
                console.error('Transação não encontrada:', abacateId);
                return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
            }
            console.log('Transação já paga anteriormente:', abacateId);
            return NextResponse.json({ received: true, message: 'Already paid' });
        }

        // Credita saldo ao usuário com $inc atômico
        const amountInCents = Math.round((transaction.amount || 0) * 100);
        const user = await User.findOneAndUpdate(
            { clerkId: transaction.userId },
            { $inc: { balance: amountInCents } },
            { new: true }
        );

        if (!user) {
            console.error('Usuário da transação não encontrado:', transaction.userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log(`[SUCESSO] Saldo creditado para ${user.username} via webhook.`);

        // Envia notificação push para o usuário
        const amountInReais = (transaction.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        await sendPushNotification(
            user.clerkId,
            'Recarga realizada! ✅',
            `Sua recarga de ${amountInReais} foi confirmada e já está disponível.`
        );

        return NextResponse.json({
            success: true,
            message: 'Balance updated via webhook'
        });

    } catch (error) {
        console.error('Error no Webhook AbacatePay:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
