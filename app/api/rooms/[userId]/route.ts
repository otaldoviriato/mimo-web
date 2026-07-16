import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
import { User } from '@/models/User';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';
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

        const settings = await AppSettings.findOne({ key: 'global' }).select('chatInactivityHours').lean();
        const inactivityHours = settings?.chatInactivityHours ?? 48;

        // Enriquece cada sala com os dados do OUTRO participante e a inatividade da conversa
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

            // Cálculo inteligente de inatividade de conversa
            const [p1, p2] = room.participants;
            const rId = room.roomId ?? room.participants.slice().sort().join('_');
            const [lastMsgP1, lastMsgP2] = await Promise.all([
                Message.findOne({ roomId: rId, senderId: p1 }).sort({ timestamp: -1 }).select('timestamp').lean(),
                Message.findOne({ roomId: rId, senderId: p2 }).sort({ timestamp: -1 }).select('timestamp').lean()
            ]);


            // Sem bidirecionalidade: apenas um lado enviou mensagens → inativa por definição
            if (!lastMsgP1 || !lastMsgP2) {
                return {
                    ...room,
                    otherUser,
                    isInactive: true,
                    lastExchangeTime: new Date().toISOString(),
                };
            }

            const lastExchangeTime = new Date(
                Math.min(
                    new Date(lastMsgP1.timestamp).getTime(),
                    new Date(lastMsgP2.timestamp).getTime()
                )
            );

            const diffMs = Date.now() - lastExchangeTime.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            const isInactive = diffHours > inactivityHours;

            return {
                ...room,
                otherUser,
                isInactive,
                lastExchangeTime: lastExchangeTime.toISOString(),
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
