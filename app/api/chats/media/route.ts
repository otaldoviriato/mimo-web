import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToGCS } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos para processar vídeos grandes

const CHAT_SERVER_URL = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const thumbnail = formData.get('thumbnail') as File | null; 
        const roomId = formData.get('roomId') as string;
        const receiverId = formData.get('receiverId') as string;
        const priceStr = formData.get('lockedPrice') as string;
        const isVideo = formData.get('isVideo') === 'true';
        const preUploadedVideoUrl = formData.get('videoUrl') as string | null;

        if ((!file && !preUploadedVideoUrl) || !roomId || !receiverId || !priceStr) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const lockedPrice = parseFloat(priceStr);
        if (isNaN(lockedPrice) || lockedPrice < 0) {
            return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
        }
        
        const lockedPriceInCents = Math.round(lockedPrice * 100);
        const isLocked = lockedPriceInCents > 0;

        let originalUrl = '';
        let blurredUrl = '';
        let videoUrl = preUploadedVideoUrl || '';
        let thumbnailUrl = '';

        const fileId = uuidv4();

        if (isVideo) {
            // Se for vídeo, o vídeo já foi upado via signed URL ou está vindo como file (legado/pequeno)
            if (file && !videoUrl) {
                const extension = file.name.split('.').pop() || 'mp4';
                videoUrl = await uploadToGCS(file, `chats/${roomId}/${fileId}_video.${extension}`);
            }
            
            if (thumbnail) {
                const thumbBuffer = await thumbnail.arrayBuffer();
                
                // Sempre upamos a thumb original
                thumbnailUrl = await uploadToGCS(thumbnail, `chats/${roomId}/${fileId}_thumb.jpg`);

                if (isLocked) {
                    // Se estiver bloqueado, geramos e upamos uma versão borrada em blurredImageUrl
                    const blurredThumb = await sharp(Buffer.from(thumbBuffer)).blur(60).toBuffer();
                    const blurredFile = new File([new Uint8Array(blurredThumb)], 'blurred.jpg', { type: 'image/jpeg' });
                    blurredUrl = await uploadToGCS(blurredFile, `chats/${roomId}/${fileId}_blurred_thumb.jpg`);
                }
            }
        } else if (file) {
            // Se for imagem, 'file' é a imagem original
            const extension = file.name.split('.').pop() || 'jpg';
            const buffer = Buffer.from(await file.arrayBuffer());
            originalUrl = await uploadToGCS(file, `chats/${roomId}/${fileId}_original.${extension}`);
            
            if (isLocked) {
                const blurredBuffer = await sharp(buffer).blur(60).toBuffer();
                const blurredFile = new File([new Uint8Array(blurredBuffer)], 'blurred.jpg', { type: 'image/jpeg' });
                blurredUrl = await uploadToGCS(blurredFile, `chats/${roomId}/${fileId}_blurred.${extension}`);
            }
        }

        // Send to mimo-chat-server
        const chatServerResponse = await fetch(`${CHAT_SERVER_URL}/api/internal/send-locked-media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                senderId: userId,
                receiverId,
                originalImageUrl: originalUrl,
                blurredImageUrl: blurredUrl,
                lockedImagePriceInCents: lockedPriceInCents,
                isVideo,
                videoUrl,
                thumbnailUrl
            })
        });

        const chatResponseData = await chatServerResponse.json();

        if (!chatServerResponse.ok || !chatResponseData.success) {
            return NextResponse.json({ error: chatResponseData.error || 'Failed to send message' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: chatResponseData.message });
    } catch (error: any) {
        console.error('Error uploading chat media:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
