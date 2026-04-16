import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { messageId } = await params;

        if (!messageId) {
            return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
        }

        // Call internal chat server to handle transactions and unlock logic
        const chatServerResponse = await fetch(`${CHAT_SERVER_URL}/api/internal/unlock-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messageId,
                userId,
            })
        });

        const chatResponseData = await chatServerResponse.json();

        if (!chatServerResponse.ok || !chatResponseData.success) {
            return NextResponse.json({ error: chatResponseData.error || 'Failed to unlock image' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: chatResponseData.message });
    } catch (error: any) {
        console.error('Error unlocking chat image:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
