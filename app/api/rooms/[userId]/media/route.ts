import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Message } from '@/models/Message';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const { userId: authUserId } = await auth();

        // Garantir que o usuário só acessa suas próprias mídias
        if (!authUserId || authUserId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) {
            return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });
        }

        // Validar se o usuário faz parte da sala (segurança adicional)
        const parts = roomId.split('_');
        const participants = parts.length >= 4 
            ? [`${parts[0]}_${parts[1]}`, `${parts[2]}_${parts[3]}`] 
            : [roomId];
            
        if (!participants.includes(userId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Buscar mensagens com mídia da sala que não foram deletadas, não estão bloqueadas e não expiraram
        const now = new Date();
        const filter: any = {
            roomId,
            deletedFor: { $nin: [userId] },
            isLockedImage: { $ne: true },
            $and: [
                {
                    $or: [
                        { originalImageUrl: { $ne: null, $exists: true } },
                        { isVideo: true, videoUrl: { $ne: null, $exists: true } }
                    ]
                },
                {
                    $or: [
                        { isTemporary: { $ne: true } },
                        { isTemporary: true, expiresAt: { $gt: now } }
                    ]
                }
            ]
        };

        const messages = await Message.find(filter)
            .sort({ timestamp: 1 }) // Ordem cronológica (antigas primeiro)
            .lean();

        // Mapear para o formato esperado pelo frontend no mediaItems
        const mediaItems = messages.map(m => ({
            url: m.isVideo ? m.videoUrl! : m.originalImageUrl!,
            thumbnailUrl: m.isVideo ? m.thumbnailUrl : m.originalImageUrl,
            isVideo: !!m.isVideo,
            messageId: m._id.toString()
        }));

        return NextResponse.json(mediaItems);

    } catch (error) {
        console.error('Error fetching room media:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
