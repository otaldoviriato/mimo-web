import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { connectToDatabase } from '@/lib/db';
import { mapAsaasPaymentStatus } from '@/lib/asaas';
import { sendPushNotification } from '@/lib/push';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

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

                const user = await User.findOne({ clerkId: withdraw.userId });
                const amountInReais = (withdraw.amount / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                });

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

                if (user) {
                    await sendPushNotification(
                        user.clerkId,
                        'Saque realizado!',
                        `Seu saque de ${amountInReais} foi enviado via Pix.`,
                        {
                            type: 'withdrawal_completed',
                            amount: withdraw.amount,
                            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.mimochat.com.br'}/wallet`,
                        }
                    );

                    if (user.email && process.env.RESEND_API_KEY) {
                        try {
                            await resend.emails.send({
                                from: 'Mimo Financeiro <onboarding@resend.dev>',
                                to: user.email,
                                subject: `Saque de ${amountInReais} realizado`,
                                html: `
                                    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
                                        <h2 style="margin: 0 0 12px; color: #0f172a;">Saque realizado com sucesso</h2>
                                        <p style="font-size: 16px; line-height: 1.5; color: #334155;">Seu saque de <strong>${amountInReais}</strong> foi confirmado e enviado via Pix para a chave cadastrada.</p>
                                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0;">
                                            <p style="margin: 0 0 8px;"><strong>Valor:</strong> ${amountInReais}</p>
                                            <p style="margin: 0 0 8px;"><strong>Status:</strong> Realizado</p>
                                            <p style="margin: 0;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                                        </div>
                                        <p style="font-size: 13px; color: #64748b;">Se você não reconhece essa movimentação, responda este e-mail ou fale com o suporte do Mimo.</p>
                                    </div>
                                `,
                            });
                        } catch (emailError) {
                            console.error('Erro ao enviar e-mail de confirmação de saque:', emailError);
                        }
                    }
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
