import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { checkTransparentCharge } from '@/lib/abacatepay';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';

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

        let transaction = await Transaction.findOne({
            abacatePayId: id,
            userId: userId
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        if (transaction.status === 'PENDING') {
            try {
                const providerStatus = await checkTransparentCharge(id);
                const status = providerStatus.status?.toUpperCase();

                if (status === 'PAID') {
                    const paidTransaction = await Transaction.findOneAndUpdate(
                        { abacatePayId: id, userId, status: { $ne: 'PAID' } },
                        { $set: { status: 'PAID', 'metadata.providerStatus': status } },
                        { new: true }
                    );

                    if (paidTransaction) {
                        transaction = paidTransaction;
                        await User.findOneAndUpdate(
                            { clerkId: userId },
                            { $inc: { balance: Math.round((transaction.amount || 0) * 100) } }
                        );
                    } else {
                        transaction = await Transaction.findOne({ abacatePayId: id, userId }) || transaction;
                    }
                } else if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'FAILED') {
                    transaction = await Transaction.findOneAndUpdate(
                        { abacatePayId: id, userId, status: 'PENDING' },
                        { $set: { status: 'CANCELLED', 'metadata.providerStatus': status } },
                        { new: true }
                    ) || transaction;
                }
            } catch {
                // If AbacatePay status lookup is unavailable, return local state.
            }
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
