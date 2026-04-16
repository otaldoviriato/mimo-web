import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { roomId, receiverId, amount } = await request.json();

        if (!roomId || !receiverId || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const amountInCents = Math.round(parseFloat(amount) * 100);
        if (isNaN(amountInCents) || amountInCents <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        // Call internal chat server
        const chatServerResponse = await fetch(`${CHAT_SERVER_URL}/api/internal/send-gift`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                senderId: userId,
                receiverId,
                amountInCents
            })
        });

        const chatResponseData = await chatServerResponse.json();

        if (!chatServerResponse.ok || !chatResponseData.success) {
            return NextResponse.json({ error: chatResponseData.error || 'Failed to send gift' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: chatResponseData.message });
    } catch (error: any) {
        console.error('Error sending gift:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
