import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
import { User } from '@/models/User';
import mongoose from 'mongoose';

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

        const currentUser = await User.findOne({ clerkId: userId })
            .select('isProfessional')
            .lean();

        // Professionals only see a conversation after its first message.
        // This also hides empty rooms left behind by the previous join flow.
        const roomFilter = currentUser?.isProfessional
            ? { participants: userId, lastMessageTime: { $exists: true }, deletedBy: { $nin: [userId] } }
            : { participants: userId, deletedBy: { $nin: [userId] } };

        const rooms = await Room.find(roomFilter)
            .sort({ lastMessageTime: -1, updatedAt: -1 })
            .lean();

        // Enriquece cada sala com os dados do OUTRO participante
        const enrichedRooms = await Promise.all(rooms.map(async (room) => {
            const otherParticipantId = room.participants.find(p => p !== userId);
            
            let otherUser = null;
            if (otherParticipantId) {
                const found = await User.findOne({ clerkId: otherParticipantId })
                    .select('clerkId name username photoUrl isProfessional identityStatus balance isHighSpender isOnline')
                    .lean() as any;
                if (found) {
                    otherUser = {
                        clerkId: found.clerkId,
                        name: found.name,
                        username: found.username,
                        photoUrl: found.photoUrl,
                        isProfessional: found.isProfessional,
                        identityStatus: found.identityStatus || null,
                        balance: found.balance,
                        isHighSpender: found.isHighSpender,
                        isOnline: found.isOnline,
                    };
                }
            }

            return {
                ...room,
                otherUser,
            };

        }));

        return NextResponse.json(enrichedRooms);

    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const { userId: authUserId } = await auth();

        if (!authUserId || authUserId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { roomId } = await request.json();
        if (!roomId) {
            return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });
        }

        await connectToDatabase();

        let query: any;
        if (mongoose.Types.ObjectId.isValid(roomId)) {
            query = { _id: roomId };
        } else {
            let sortedParticipants: string[];
            if (roomId.includes(userId)) {
                const otherUserId = roomId.replace(userId, '').replace(/^_+|_+$/g, '');
                sortedParticipants = [userId, otherUserId].sort();
            } else {
                const parts = roomId.split('_');
                sortedParticipants = parts.length >= 4 
                    ? [`${parts[0]}_${parts[1]}`, `${parts[2]}_${parts[3]}`].sort() 
                    : [roomId];
            }
            query = { participants: { $all: sortedParticipants } };
        }

        await Room.updateOne(
            query,
            { $addToSet: { deletedBy: userId } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
