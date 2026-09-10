import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { settleAbacatePix } from '@/lib/settleAbacatePix';
import { sendAdminAlert } from '@/lib/adminAlerts';
import { Transaction } from '@/models/Transaction';

export const runtime = 'nodejs';
export const maxDuration = 55;

const RECONCILIATION_WINDOW_MS = 48 * 60 * 60 * 1000;
const MINIMUM_AGE_MS = 30 * 1000;
const BATCH_SIZE = 50;
const STALLED_AFTER_MS = 5 * 60 * 1000;

function retryDelayMs(transaction: { timestamp: Date }, now: number) {
    const age = now - new Date(transaction.timestamp).getTime();
    if (age < 15 * 60 * 1000) return 60 * 1000;
    if (age < 60 * 60 * 1000) return 5 * 60 * 1000;
    return 15 * 60 * 1000;
}

function shouldRetry(transaction: { timestamp: Date; metadata?: Record<string, unknown> }, now: number) {
    const lastAttempt = transaction.metadata?.lastReconciliationAt;
    if (!(lastAttempt instanceof Date)) return true;
    return now - lastAttempt.getTime() >= retryDelayMs(transaction, now);
}

function isAuthorized(request: NextRequest) {
    if (process.env.NODE_ENV === 'development') return true;
    const secret = process.env.CRON_SECRET;
    return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startedAt = Date.now();
    await connectToDatabase();
    const pending = await Transaction.find({
        type: 'PIX', source: 'recharge', status: 'PENDING',
        abacatePayId: /^pix_char_/, 'metadata.provider': 'abacatepay',
        timestamp: {
            $gte: new Date(startedAt - RECONCILIATION_WINDOW_MS),
            $lte: new Date(startedAt - MINIMUM_AGE_MS),
        },
    }).sort({ timestamp: 1 }).limit(BATCH_SIZE * 4)
        .select('abacatePayId amount timestamp metadata.lastReconciliationAt')
        .lean();

    const eligible = pending.filter((transaction) => shouldRetry(transaction, startedAt)).slice(0, BATCH_SIZE);

    const result = { examined: eligible.length, deferred: pending.length - eligible.length, credited: 0, pending: 0, cancelled: 0, failed: 0, stalled: 0 };
    for (const transaction of eligible) {
        const paymentId = transaction.abacatePayId;
        if (!paymentId) continue;
        try {
            const settlement = await settleAbacatePix(paymentId);
            if (!settlement) {
                result.failed++;
                console.error('[pix-reconciliation]', { paymentId, outcome: 'transaction_not_found' });
            } else if (settlement.credited) result.credited++;
            else if (settlement.transaction.status === 'CANCELLED') result.cancelled++;
            else {
                result.pending++;
                if (startedAt - new Date(transaction.timestamp).getTime() >= STALLED_AFTER_MS) {
                    result.stalled++;
                    console.warn('[pix-reconciliation-stalled]', {
                        paymentId, ageMs: startedAt - new Date(transaction.timestamp).getTime(),
                    });
                    const marked = await Transaction.findOneAndUpdate({
                        _id: transaction._id,
                        'metadata.stalledAlertedAt': { $exists: false },
                    }, { $set: { 'metadata.stalledAlertedAt': new Date() } });
                    if (marked) {
                        const ageMinutes = Math.floor((startedAt - new Date(transaction.timestamp).getTime()) / 60000);
                        await sendAdminAlert('payment_reconciliation', {
                            title: 'PIX pendente requer atenção',
                            body: `A recarga ${paymentId} continua pendente após ${ageMinutes} minutos.`,
                            emailSubject: `[MimoChat] PIX pendente há ${ageMinutes} minutos`,
                            emailHtml: `<p>A recarga <strong>${paymentId}</strong>, no valor de R$ ${transaction.amount.toFixed(2)}, continua pendente após ${ageMinutes} minutos.</p>`,
                            url: 'https://www.mimochat.com.br/admin/financial',
                        });
                    }
                }
            }
        } catch (error) {
            result.failed++;
            console.error('[pix-reconciliation]', {
                paymentId, outcome: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    const durationMs = Date.now() - startedAt;
    console.info('[pix-reconciliation]', { ...result, durationMs });
    return NextResponse.json({ ...result, durationMs }, { status: result.failed > 0 ? 503 : 200 });
}
