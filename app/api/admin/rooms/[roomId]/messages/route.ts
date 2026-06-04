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

        // 2. Buscar as mensagens da sala
        const messages = await Message.find({ roomId })
            .sort({ timestamp: 1 }) // Ordem cronológica para exibição no chat
            .limit(100) // Limite de segurança de 100 mensagens
            .lean() as any[];

        // 3. Mapear para o formato do frontend
        const messagesMapped = messages.map(msg => {
            const date = msg.timestamp ? new Date(msg.timestamp) : new Date();
            
            // Formatar data de forma amigável
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('pt-BR');
            const formattedTime = `${dateStr} às ${timeStr}`;

            return {
                sender: msg.senderId,
                text: msg.content || '',
                time: formattedTime,
                cost: (msg.cost || 0) / 100, // converte centavos para reais
            };
        });

        return NextResponse.json({ history: messagesMapped });

    } catch (error: any) {
        console.error('Erro na API de mensagens de sala do admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
