import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToGCS } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('photo') as File;
        const roomId = formData.get('roomId') as string;
        const receiverId = formData.get('receiverId') as string;
        const priceStr = formData.get('lockedImagePrice') as string;

        if (!file || !roomId || !receiverId || !priceStr) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
        }

        const lockedImagePrice = parseFloat(priceStr);
        if (isNaN(lockedImagePrice) || lockedImagePrice < 0) {
            return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
        }
        
        const lockedImagePriceInCents = Math.round(lockedImagePrice * 100);

        const isLocked = lockedImagePriceInCents > 0;

        // Process images
        const fileBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(fileBuffer);

        const fileExtension = file.name.split('.').pop() || 'jpg';
        const originalFileName = `chats/${roomId}/${uuidv4()}_original.${fileExtension}`;
        const blurredFileName = isLocked ? `chats/${roomId}/${uuidv4()}_blurred.${fileExtension}` : '';

        // Create blurred image only if locked
        let blurredImageUrl = '';
        let originalImageUrl = '';

        if (isLocked) {
            const blurredBuffer = await sharp(buffer)
                .blur(60) // high blur
                .toBuffer();

            const originalFileWrap = new File([buffer], originalFileName, { type: file.type });
            const blurredFileWrap = new File([blurredBuffer], blurredFileName, { type: file.type });

            const [origUrl, blurUrl] = await Promise.all([
                uploadToGCS(originalFileWrap, originalFileName),
                uploadToGCS(blurredFileWrap, blurredFileName),
            ]);
            originalImageUrl = origUrl;
            blurredImageUrl = blurUrl;
        } else {
            const originalFileWrap = new File([buffer], originalFileName, { type: file.type });
            originalImageUrl = await uploadToGCS(originalFileWrap, originalFileName);
        }

        // Send to mimo-chat-server directly to handle balances and socket dispatch
        const chatServerResponse = await fetch(`${CHAT_SERVER_URL}/api/internal/send-locked-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                senderId: userId,
                receiverId,
                originalImageUrl,
                blurredImageUrl,
                lockedImagePriceInCents
            })
        });

        const chatResponseData = await chatServerResponse.json();

        if (!chatServerResponse.ok || !chatResponseData.success) {
            return NextResponse.json({ error: chatResponseData.error || 'Failed to send message' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: chatResponseData.message });
    } catch (error: any) {
        console.error('Error uploading chat image:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
