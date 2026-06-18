import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Message } from '@/models/Message';
import { Room } from '@/models/Room';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const { userId: authUserId } = await auth();

        // Garantir que o usuário só acessa suas próprias mensagens
        if (!authUserId || authUserId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');
        const before = searchParams.get('before'); // timestamp ISO
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr, 10) : 50;

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

        const filter: any = { roomId };
        
        // Mensagens que não foram deletadas pelo usuário
        filter.deletedFor = { $nin: [userId] };

        // Filtrar mensagens anteriores ao timestamp
        if (before) {
            filter.timestamp = { $lt: new Date(before) };
        }

        const messages = await Message.find(filter)
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        // Retorna em ordem cronológica (mais antiga primeiro)
        return NextResponse.json(messages.reverse());

    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
