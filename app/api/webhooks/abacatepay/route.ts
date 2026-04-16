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

        const transaction = await Transaction.findOne({ abacatePayId: abacateId });

        if (!transaction) {
            console.error('Transação não encontrada:', abacateId);
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        if (transaction.status === 'PAID') {
            console.log('Transação já paga anteriormente:', abacateId);
            return NextResponse.json({ received: true, message: 'Already paid' });
        }

        // Atualiza a transação para PAID
        transaction.status = 'PAID';
        await transaction.save();

        // Credita saldo ao usuário (amount vindo da transação)
        const user = await User.findOne({ clerkId: transaction.userId });

        if (!user) {
            console.error('Usuário da transação não encontrado:', transaction.userId);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // No mimo-api o saldo era incrementado em cents. 
        // Assumindo que o transaction.amount está em reais e o balance em reais também (ou cents conforme as regras de negócio)
        // O código original fazia: user.balance += Math.round((transaction.amount || 0) * 100);
        // Vamos manter a consistência com o mimo-api
        const amountInCents = Math.round((transaction.amount || 0) * 100);
        user.balance += amountInCents;
        await user.save();

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
