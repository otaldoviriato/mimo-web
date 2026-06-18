import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Message } from '@/models/Message';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
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

        // 2. Buscar as mensagens da sala com paginação
        const { searchParams } = new URL(request.url);
        const before = searchParams.get('before');
        const limitStr = searchParams.get('limit');
        const limit = limitStr ? parseInt(limitStr, 10) : 50;

        let resolvedRoomIdStr = roomId;
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(roomId)) {
            const { Room } = await import('@/models/Room');
            const room = await Room.findById(roomId).lean() as any;
            if (room) {
                const sortedParticipants = [...room.participants].sort();
                resolvedRoomIdStr = sortedParticipants.join('_');
            }
        }

        const filter: any = { roomId: resolvedRoomIdStr };
        if (before) {
            filter.timestamp = { $lt: new Date(before) };
        }

        const messages = await Message.find(filter)
            .sort({ timestamp: -1 }) // Mais recente primeiro para buscar corretamente o final da conversa
            .limit(limit)
            .lean() as any[];

        // 3. Mapear para o formato do frontend
        const messagesMapped = messages.map(msg => {
            const date = msg.timestamp ? new Date(msg.timestamp) : new Date();
            
            // Formatar data de forma amigável
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('pt-BR');
            const formattedTime = `${dateStr} às ${timeStr}`;

            return {
                _id: msg._id.toString(),
                sender: msg.senderId,
                text: msg.content || '',
                time: formattedTime,
                cost: (msg.cost || 0) / 100, // converte centavos para reais
                timestamp: msg.timestamp,
            };
        });

        // Retorna em ordem cronológica (mais antiga primeiro)
        return NextResponse.json({ history: messagesMapped.reverse() });

    } catch (error: any) {
        console.error('Erro na API de mensagens de sala do admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
