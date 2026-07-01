import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToGCS } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const roomId = formData.get('roomId') as string;
        const receiverId = formData.get('receiverId') as string;
        const durationStr = formData.get('duration') as string;
        const tempId = formData.get('tempId') as string | null;

        if (!file || !roomId || !receiverId || !durationStr) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const duration = parseFloat(durationStr);
        if (isNaN(duration) || duration <= 0) {
            return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
        }

        // Determinar extensão do arquivo
        const extension = file.type.includes('mp4') || file.name.endsWith('.mp4') ? 'mp4' : 'webm';
        const fileId = uuidv4();
        const gcsPath = `chats/${roomId}/${fileId}_audio.${extension}`;

        // Fazer upload para o Google Cloud Storage
        const audioUrl = await uploadToGCS(file, gcsPath);

        // Chamar o chat server interno para persistência no MongoDB e emissão via sockets
        const chatServerResponse = await fetch(`${CHAT_SERVER_URL}/api/internal/send-audio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                senderId: userId,
                receiverId,
                audioUrl,
                audioDuration: duration,
                tempId,
            })
        });

        const chatResponseData = await chatServerResponse.json();

        if (!chatServerResponse.ok || !chatResponseData.success) {
            return NextResponse.json({ error: chatResponseData.error || 'Failed to send message' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: chatResponseData.message });
    } catch (error: any) {
        console.error('Error uploading chat audio:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
