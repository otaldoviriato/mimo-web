import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Room } from '@/models/Room';
import { User } from '@/models/User';
import { Message } from '@/models/Message';
import { PENDING_MESSAGE_LABEL } from '@/lib/receiptBilling';
import mongoose from 'mongoose';
import { requireCompletedOnboarding } from '@/lib/apiOnboardingGuard';

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

        const onboardingGuard = await requireCompletedOnboarding(userId);
        if (onboardingGuard) return onboardingGuard;

        const currentUser = await User.findOne({ clerkId: userId })
            .select('isProfessional')
            .lean();

        // Professionals only see a conversation after its first message.
        // This also hides empty rooms left behind by the previous join flow.
        const roomFilter = currentUser?.isProfessional
            ? {
                participants: userId,
                $or: [
                    { lastMessageTime: { $exists: true, $ne: null } },
                    { lastMessage: { $exists: true, $ne: '' } }
                ],
                deletedBy: { $nin: [userId] }
            }
            : { participants: userId, deletedBy: { $nin: [userId] } };

        const rooms = await Room.find(roomFilter)
            .sort({ lastMessageTime: -1, updatedAt: -1 })
            .lean();

        // Identifica mensagens pendentes de saldo para blindar o conteúdo e nunca vazar para o cliente
        const pendingForMe = await Message.find({
            receiverId: userId,
            billingStatus: 'pending',
        }).select('roomId senderId timestamp').lean();

        const pendingRoomsMap = new Map<string, Date>();
        for (const p of pendingForMe) {
            const rId = p.roomId;
            const pTime = new Date(p.timestamp);
            if (!pendingRoomsMap.has(rId) || pTime > pendingRoomsMap.get(rId)!) {
                pendingRoomsMap.set(rId, pTime);
            }
            if (p.senderId) {
                const altKey = [p.senderId, userId].sort().join('_');
                if (!pendingRoomsMap.has(altKey) || pTime > pendingRoomsMap.get(altKey)!) {
                    pendingRoomsMap.set(altKey, pTime);
                }
            }
        }

        // Se o usuário for profissional, identifica conversas onde ele enviou mensagem aguardando saldo
        const pendingSentByMe = currentUser?.isProfessional
            ? await Message.find({
                senderId: userId,
                billingStatus: 'pending',
            }).select('roomId receiverId timestamp').lean()
            : [];

        const pendingSentRoomsMap = new Map<string, Date>();
        for (const p of pendingSentByMe) {
            const rId = p.roomId;
            const pTime = new Date(p.timestamp);
            if (!pendingSentRoomsMap.has(rId) || pTime > pendingSentRoomsMap.get(rId)!) {
                pendingSentRoomsMap.set(rId, pTime);
            }
            if (p.receiverId) {
                const altKey = [p.receiverId, userId].sort().join('_');
                if (!pendingSentRoomsMap.has(altKey) || pTime > pendingSentRoomsMap.get(altKey)!) {
                    pendingSentRoomsMap.set(altKey, pTime);
                }
            }
        }

        // Enriquece cada sala com os dados do OUTRO participante
        const enrichedRooms = await Promise.all(rooms.map(async (room) => {
            const otherParticipantId = room.participants.find(p => p !== userId);
            
            let otherUser = null;
            if (otherParticipantId) {
                const found = await User.findOne({ clerkId: otherParticipantId })
                    .select('clerkId name username photoUrl isProfessional identityStatus balance isHighSpender isOnline isTeam teamTitle isSuspended')
                    .lean() as any;
                if (found) {
                    const isDeleted = Boolean(found.isSuspended);
                    otherUser = {
                        clerkId: found.clerkId,
                        name: isDeleted ? 'Usuário Excluído' : found.name,
                        username: isDeleted ? 'usuario_excluido' : found.username,
                        photoUrl: isDeleted ? '' : found.photoUrl,
                        isProfessional: isDeleted ? false : found.isProfessional,
                        isTeam: isDeleted ? false : Boolean(found.isTeam),
                        teamTitle: found.teamTitle || 'Equipe Mimo',
                        identityStatus: isDeleted ? null : (found.identityStatus || null),
                        balance: found.balance,
                        isHighSpender: found.isHighSpender,
                        isOnline: isDeleted ? false : found.isOnline,
                        isDeleted,
                    };
                } else {
                    otherUser = {
                        clerkId: otherParticipantId,
                        name: 'Usuário Excluído',
                        username: 'usuario_excluido',
                        photoUrl: '',
                        isProfessional: false,
                        isTeam: false,
                        teamTitle: '',
                        identityStatus: null,
                        balance: 0,
                        isHighSpender: false,
                        isOnline: false,
                        isDeleted: true,
                    };
                }
            }

            const derivedRoomId = room.roomId ?? [...room.participants].sort().join('_');
            const roomObjId = room._id?.toString();
            const pendingForClientTime = (roomObjId && pendingRoomsMap.get(roomObjId)) || pendingRoomsMap.get(derivedRoomId);
            const pendingForProTime = (roomObjId && pendingSentRoomsMap.get(roomObjId)) || pendingSentRoomsMap.get(derivedRoomId);

            let sanitizedLastMessage = room.lastMessage;

            // Se o usuário logado é o cliente e a última mensagem recebida está pendente de saldo:
            const isClientLatestPending = Boolean(
                (pendingForClientTime && (!room.lastMessageTime || new Date(room.lastMessageTime).getTime() <= pendingForClientTime.getTime() + 10000)) ||
                (room.lastMessageBillingStatus === 'pending' && room.lastMessageSenderId !== userId)
            );

            // Se o usuário logado é o profissional e a última mensagem enviada está aguardando saldo do cliente:
            const isProLatestPending = Boolean(
                (pendingForProTime && (!room.lastMessageTime || new Date(room.lastMessageTime).getTime() <= pendingForProTime.getTime() + 10000)) ||
                (room.lastMessageBillingStatus === 'pending' && room.lastMessageSenderId === userId)
            );

            if (isClientLatestPending) {
                sanitizedLastMessage = PENDING_MESSAGE_LABEL;
            } else if (
                isProLatestPending ||
                (currentUser?.isProfessional && (
                    room.lastMessage === PENDING_MESSAGE_LABEL ||
                    room.lastMessage?.includes('Recarregue para visualizar') ||
                    room.lastMessage?.includes('Recarregue')
                ))
            ) {
                sanitizedLastMessage = 'Aguardando saldo do cliente';
            }

            return {
                ...room,
                lastMessage: sanitizedLastMessage,
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

        const onboardingGuard = await requireCompletedOnboarding(userId);
        if (onboardingGuard) return onboardingGuard;

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
