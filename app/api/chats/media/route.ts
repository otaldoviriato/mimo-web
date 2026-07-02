import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToGCS, uploadBufferToGCS } from '@/lib/gcs';
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
        const tempId = formData.get('tempId') as string | null;
        const isTemporary = formData.get('isTemporary') === 'true';
        const expiryMinutesStr = formData.get('expiryMinutes') as string | null;
        let expiryMinutes = 0;
        if (isTemporary && expiryMinutesStr) {
            expiryMinutes = parseFloat(expiryMinutesStr);
        }

        if ((!file && !preUploadedVideoUrl) || !roomId || !receiverId || !priceStr) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const lockedPrice = parseFloat(priceStr);
        if (isNaN(lockedPrice) || lockedPrice < 0) {
            return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
        }
        
        const lockedPriceInCents = Math.round(lockedPrice * 100);
        const isLocked = lockedPriceInCents > 0 || isTemporary;

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
                
                // Converter a thumbnail original para WebP para otimizar
                let processedThumb: any = Buffer.from(thumbBuffer);
                let thumbExtension = 'webp';
                let thumbContentType = 'image/webp';
                
                try {
                    processedThumb = await sharp(Buffer.from(thumbBuffer))
                        .webp({ quality: 80 })
                        .toBuffer();
                } catch (err) {
                    console.error('Failed to convert video thumb to WebP, uploading original:', err);
                    thumbExtension = 'jpg';
                    thumbContentType = 'image/jpeg';
                }
                
                thumbnailUrl = await uploadBufferToGCS(processedThumb, `chats/${roomId}/${fileId}_thumb.${thumbExtension}`, thumbContentType);

                if (isLocked) {
                    // Se estiver bloqueado, geramos e upamos uma versão borrada em blurredImageUrl
                    let blurredThumbBuffer: any;
                    let blurredThumbExtension = 'webp';
                    let blurredThumbContentType = 'image/webp';
                    
                    try {
                        blurredThumbBuffer = await sharp(processedThumb).blur(60).webp({ quality: 60 }).toBuffer();
                    } catch (err) {
                        console.error('Failed to blur video thumb to WebP, falling back:', err);
                        try {
                            blurredThumbBuffer = await sharp(Buffer.from(thumbBuffer)).blur(60).toBuffer();
                            blurredThumbExtension = 'jpg';
                            blurredThumbContentType = 'image/jpeg';
                        } catch (innerErr) {
                            blurredThumbBuffer = Buffer.from(thumbBuffer);
                            blurredThumbExtension = 'jpg';
                            blurredThumbContentType = 'image/jpeg';
                        }
                    }
                    
                    blurredUrl = await uploadBufferToGCS(blurredThumbBuffer, `chats/${roomId}/${fileId}_blurred_thumb.${blurredThumbExtension}`, blurredThumbContentType);
                }
            }
        } else if (file) {
            // Se for imagem, 'file' é a imagem original
            const buffer = Buffer.from(await file.arrayBuffer());
            let processedBuffer: any = buffer;
            let fileExtension = 'webp';
            let contentType = 'image/webp';
            
            try {
                processedBuffer = await sharp(buffer)
                    .resize(1600, null, { withoutEnlargement: true }) // Redimensionar se for foto gigante (largura max 1600px)
                    .webp({ quality: 80 })
                    .toBuffer();
            } catch (err) {
                console.error('Failed to convert chat image to WebP, uploading original:', err);
                fileExtension = file.name.split('.').pop() || 'jpg';
                contentType = file.type;
            }
            
            originalUrl = await uploadBufferToGCS(processedBuffer, `chats/${roomId}/${fileId}_original.${fileExtension}`, contentType);
            
            if (isLocked) {
                let blurredBuffer: any;
                let blurredExtension = 'webp';
                let blurredContentType = 'image/webp';
                
                try {
                    blurredBuffer = await sharp(processedBuffer).blur(60).webp({ quality: 60 }).toBuffer();
                } catch (err) {
                    console.error('Failed to blur chat image to WebP, falling back:', err);
                    try {
                        blurredBuffer = await sharp(buffer).blur(60).toBuffer();
                        blurredExtension = fileExtension;
                        blurredContentType = contentType;
                    } catch (innerErr) {
                        blurredBuffer = buffer;
                        blurredExtension = file.name.split('.').pop() || 'jpg';
                        blurredContentType = file.type;
                    }
                }
                
                blurredUrl = await uploadBufferToGCS(blurredBuffer, `chats/${roomId}/${fileId}_blurred.${blurredExtension}`, blurredContentType);
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
                thumbnailUrl,
                tempId,
                isTemporary,
                expiryMinutes,
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
