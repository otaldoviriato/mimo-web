import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { checkAsaasPayment, mapAsaasPaymentStatus } from '@/lib/asaas';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { isAbacatePix } from '@/lib/abacatePix';
import { settleAbacatePix } from '@/lib/settleAbacatePix';
import { executeRechargeCredit } from '@/lib/creditRecharge';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        await connectToDatabase();

        let transaction: any = await Transaction.findOne({
            abacatePayId: id,
            userId: userId
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // Reconciliação AbacatePay PIX (se não estiver PAID ou se PAID sem creditedAt)
        if ((transaction.status !== 'PAID' || !transaction.metadata?.creditedAt) && isAbacatePix(transaction)) {
            try {
                const result = await settleAbacatePix(id, userId);
                if (result?.transaction) transaction = result.transaction;
            } catch {
                console.error('[PIX] Status reconciliation failed', { paymentId: id });
                return NextResponse.json({ error: 'Payment verification temporarily unavailable' }, { status: 503 });
            }
        }

        // Reconciliação Asaas Cartão de Crédito
        if (transaction && transaction.metadata?.provider === 'asaas') {
            if (transaction.status === 'PENDING') {
                try {
                    const providerStatus = await checkAsaasPayment(id);
                    const status = mapAsaasPaymentStatus(providerStatus.status);

                    if (status === 'PAID') {
                        const creditResult = await executeRechargeCredit({
                            paymentId: id,
                            userId,
                            provider: 'asaas',
                            providerStatus: providerStatus.status,
                            invoiceUrl: providerStatus.invoiceUrl,
                            receiptUrl: providerStatus.transactionReceiptUrl,
                        });
                        if (creditResult.transaction) {
                            transaction = creditResult.transaction;
                        }
                    } else if (status === 'CANCELLED') {
                        transaction = await Transaction.findOneAndUpdate(
                            { abacatePayId: id, userId, status: 'PENDING' },
                            { $set: { status: 'CANCELLED', 'metadata.providerStatus': providerStatus.status } },
                            { new: true }
                        ) || transaction;
                    }
                } catch {
                    // If Asaas status lookup is unavailable, return local state.
                }
            } else if (transaction.status === 'PAID' && !transaction.metadata?.creditedAt) {
                // FAIL-SAFE CRÍTICO: transação marcada como PAID mas saldo ainda não creditado
                try {
                    const creditResult = await executeRechargeCredit({
                        paymentId: id,
                        userId,
                        provider: 'asaas',
                    });
                    if (creditResult.transaction) {
                        transaction = creditResult.transaction;
                    }
                } catch (err) {
                    console.error('[Asaas Poll] Error auto-reconciling uncredited PAID transaction:', err);
                }
            }
        }

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        return NextResponse.json({
            status: transaction.status,
            amount: transaction.amount,
            updatedAt: transaction.updatedAt
        });

    } catch (error) {
        console.error('Error checking Pix status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
