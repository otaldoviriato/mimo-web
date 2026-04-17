import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSignedUploadURL } from '@/lib/gcs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { roomId, contentType, fileName, isVideo } = await request.body ? await request.json() : {};
        
        if (!roomId || !contentType) {
            return NextResponse.json({ error: 'Missing roomId or contentType' }, { status: 400 });
        }

        const fileId = uuidv4();
        const extension = fileName?.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        const path = `chats/${roomId}/${fileId}_${isVideo ? 'video' : 'original'}.${extension}`;
        
        const signedUrl = await getSignedUploadURL(path, contentType);
        const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${path}`;

        return NextResponse.json({ signedUrl, publicUrl, path });
    } catch (error: any) {
        console.error('Error generating signed URL:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
