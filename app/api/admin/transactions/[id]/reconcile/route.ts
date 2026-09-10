import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { settleAbacatePix } from '@/lib/settleAbacatePix';
import { AppSettings } from '@/models/AppSettings';
import { Transaction } from '@/models/Transaction';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    await connectToDatabase();
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    if (userId !== FALLBACK_ADMIN && !settings?.adminClerkIds?.includes(userId)) {
        return NextResponse.json({ error: 'Acesso proibido' }, { status: 403 });
    }

    const { id } = await params;
    const transaction = await Transaction.findById(id);
    if (!transaction) return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    if (transaction.type !== 'PIX' || transaction.source !== 'recharge' ||
        transaction.metadata?.provider !== 'abacatepay' || !transaction.abacatePayId) {
        return NextResponse.json({ error: 'Esta transação não é uma recarga PIX da AbacatePay' }, { status: 400 });
    }

    await Transaction.updateOne({ _id: transaction._id }, { $set: {
        'metadata.lastManualReconciliationAt': new Date(),
        'metadata.lastManualReconciliationBy': userId,
    } });

    try {
        const settlement = await settleAbacatePix(transaction.abacatePayId);
        if (!settlement) throw new Error('Transaction not found during reconciliation');
        console.info('[pix-manual-reconciliation]', {
            paymentId: transaction.abacatePayId, adminId: userId,
            status: settlement.transaction.status, credited: settlement.credited,
        });
        return NextResponse.json({
            success: true, status: settlement.transaction.status, credited: settlement.credited,
        });
    } catch (error) {
        console.error('[pix-manual-reconciliation]', {
            paymentId: transaction.abacatePayId, adminId: userId,
            outcome: 'failed', error: error instanceof Error ? error.message : 'Unknown error',
        });
        return NextResponse.json({ error: 'Não foi possível reconciliar a cobrança' }, { status: 503 });
    }
}
