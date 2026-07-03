import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { CreditGrant } from '@/models/CreditGrant';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { grantId } = body;

        if (!grantId) {
            return NextResponse.json({ error: 'Missing grantId' }, { status: 400 });
        }

        await connectToDatabase();

        // Atualiza a flag noticeShown para true de forma atômica
        const updatedGrant = await CreditGrant.findOneAndUpdate(
            { _id: grantId, userId },
            { $set: { noticeShown: true } },
            { new: true }
        );

        if (!updatedGrant) {
            return NextResponse.json({ error: 'Credit grant not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error marking credit notice as shown:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
