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

        // 2. Extrair participantes a partir do roomId
        const participants = roomId.match(/user_[a-zA-Z0-9]+/g);
        if (!participants || participants.length !== 2) {
            return NextResponse.json({ error: 'Formato de RoomId inválido' }, { status: 400 });
        }

        // 3. Excluir a sala
        const deleteRoomResult = await Room.deleteOne({ 
            participants: { $all: participants } 
        });

        // 4. Excluir todas as mensagens associadas a essa sala
        const deleteMessagesResult = await Message.deleteMany({ roomId });

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
