import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';

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

        const transaction = await Transaction.findOne({
            abacatePayId: id,
            userId: userId
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        return NextResponse.json({
            status: transaction.status,
            amount: transaction.amount,
            updatedAt: transaction.updatedAt
        });

    } catch (error: any) {
        console.error('Error checking Pix status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
