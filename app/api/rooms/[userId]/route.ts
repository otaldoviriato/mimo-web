import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
import { User } from '@/models/User';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const { userId: authUserId } = await auth();

        // Garantir que o usuário só acessa suas próprias salas
        if (!authUserId || authUserId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Busca todas as salas onde o usuário é participante
        const rooms = await Room.find({
            participants: userId
        }).sort({ updatedAt: -1 }).lean();

        // Enriquece cada sala com os dados do OUTRO participante
        const enrichedRooms = await Promise.all(rooms.map(async (room) => {
            const otherParticipantId = room.participants.find(p => p !== userId);
            
            let otherUser = null;
            if (otherParticipantId) {
                const found = await User.findOne({ clerkId: otherParticipantId })
                    .select('clerkId name username photoUrl')
                    .lean() as any;
                if (found) {
                    otherUser = {
                        clerkId: found.clerkId,
                        name: found.name,
                        username: found.username,
                        photoUrl: found.photoUrl,
                    };
                }
            }

            return {
                ...room,
                otherUser
            };
        }));

        return NextResponse.json(enrichedRooms);

    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
