import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { RECEIPT_TERMS_VERSION } from '@/lib/receiptBilling';

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    if (body.accepted !== true || body.version !== RECEIPT_TERMS_VERSION) {
        return NextResponse.json({ error: 'É necessário aceitar os termos atuais.' }, { status: 400 });
    }
    await connectToDatabase();
    const user = await User.findOneAndUpdate({ clerkId: userId,
        $or: [{ receiptTermsVersion: { $ne: RECEIPT_TERMS_VERSION } }, { receiptTermsAcceptedAt: null }] },
        { $set: { receiptTermsVersion: RECEIPT_TERMS_VERSION, receiptTermsAcceptedAt: new Date() } },
        { returnDocument: 'after' });
    if (!user && !await User.exists({ clerkId: userId })) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: true });
}
