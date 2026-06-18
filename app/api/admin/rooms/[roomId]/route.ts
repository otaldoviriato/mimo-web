import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { roomId } = await params;
        if (!roomId) {
            return NextResponse.json({ error: 'RoomId é obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Validar se o usuário é administrador
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings 
            ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN 
            : userId === FALLBACK_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const mongoose = require('mongoose');
        let roomIdStr = roomId;
        let participants: string[] = [];

        if (mongoose.Types.ObjectId.isValid(roomId)) {
            // 2. Buscar a sala pelo ObjectId
            const room = await Room.findById(roomId);
            if (!room) {
                return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 });
            }
            participants = room.participants;
            const sortedParticipants = [...participants].sort();
            roomIdStr = sortedParticipants.join('_');

            // 3. Excluir a sala pelo ID
            await Room.findByIdAndDelete(roomId);
        } else {
            // Fallback para string com underlines
            const matched = roomId.match(/user_[a-zA-Z0-9]+/g);
            if (matched && matched.length === 2) {
                participants = matched;
            } else {
                participants = roomId.split('_');
                if (participants.length < 2) {
                    return NextResponse.json({ error: 'Formato de RoomId inválido' }, { status: 400 });
                }
            }
            
            // 3. Excluir a sala pelos participantes
            await Room.deleteOne({ 
                participants: { $all: participants } 
            });
        }

        // 4. Excluir todas as mensagens associadas a essa sala
        const deleteMessagesResult = await Message.deleteMany({ roomId: roomIdStr });

        console.log(`[MODERATION] Room deleted by admin ${userId}. Participants: ${participants.join(', ')}. Messages deleted: ${deleteMessagesResult.deletedCount}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Sala de chat e mensagens excluídas com sucesso de forma definitiva.',
            deletedMessagesCount: deleteMessagesResult.deletedCount
        });

    } catch (error: any) {
        console.error('Erro na API de exclusão de sala do admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
