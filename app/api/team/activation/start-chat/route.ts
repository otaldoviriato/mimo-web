import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { ProfessionalActivation } from '@/models/ProfessionalActivation';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const sender = await User.findOne({ clerkId: userId }) as any;
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;

        if (!sender || (!sender.isTeam && !isAdmin)) {
            return NextResponse.json({ error: 'Apenas membros da equipe podem iniciar chats de ativação.' }, { status: 403 });
        }

        const body = await request.json();
        const { professionalId, initialMessage } = body;

        if (!professionalId) {
            return NextResponse.json({ error: 'professionalId é obrigatório' }, { status: 400 });
        }

        const receiver = await User.findOne({ clerkId: professionalId }) as any;
        if (!receiver || !receiver.isProfessional) {
            return NextResponse.json({ error: 'Profissional não encontrada' }, { status: 404 });
        }

        // Ordenar IDs para formato padrão do Room ID
        const participantsSorted = [userId, professionalId].sort();
        const roomId = `${participantsSorted[0]}_${participantsSorted[1]}`;

        // Buscar ou criar a sala
        let room = await Room.findOne({ participants: participantsSorted });
        if (!room) {
            room = await Room.create({
                participants: participantsSorted,
                lastMessage: initialMessage ? initialMessage.substring(0, 100) : 'Conversa iniciada',
                lastMessageTime: new Date(),
            });
        }

        let createdMessageDoc: any = null;
        // Enviar mensagem se fornecida
        if (initialMessage && initialMessage.trim().length > 0) {
            const message = await Message.create({
                roomId,
                senderId: userId,
                receiverId: professionalId,
                content: initialMessage.trim(),
                charCount: initialMessage.trim().length,
                cost: 0, // Isento de cobrança
                platformFee: 0,
                receiverEarnings: 0,
                timestamp: new Date(),
            });

            createdMessageDoc = message;
            room.lastMessage = initialMessage.trim().substring(0, 100);
            room.lastMessageTime = message.timestamp || new Date();
            await room.save();
        }

        // Notificar servidor de chat em tempo real via socket / push notification
        const chatServerUrl = process.env.NEXT_PUBLIC_CHAT_SERVER_URL || 'http://localhost:3001';
        fetch(`${chatServerUrl}/api/internal/notify-activation-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId,
                senderId: userId,
                receiverId: professionalId,
                initialMessage: initialMessage?.trim(),
                message: createdMessageDoc ? createdMessageDoc.toObject() : undefined
            })
        }).catch((err) => console.error('[start-chat] Failed to notify chat server:', err));

        // Atualizar modelo de ativação
        let activation = await ProfessionalActivation.findOne({ professionalId });
        if (!activation) {
            activation = new ProfessionalActivation({
                professionalId,
                assignedTeamMemberId: userId,
                assignedTeamMemberName: sender.name || sender.username,
                status: 'contacted',
                stage: 'Em contato de onboarding',
                contactedAt: new Date(),
                history: []
            });
        } else {
            if (!activation.assignedTeamMemberId) {
                activation.assignedTeamMemberId = userId;
                activation.assignedTeamMemberName = sender.name || sender.username;
            }
            if (activation.status === 'pending') {
                activation.status = 'contacted';
                activation.stage = 'Em contato de onboarding';
            }
            if (!activation.contactedAt) {
                activation.contactedAt = new Date();
            }
        }

        activation.history.push({
            authorId: userId,
            authorName: sender.name || sender.username || 'Membro da Equipe',
            action: 'Iniciou conversa de ativação oficial',
            note: initialMessage ? `Mensagem: "${initialMessage.substring(0, 60)}..."` : undefined,
            timestamp: new Date(),
        });

        await activation.save();

        return NextResponse.json({
            success: true,
            roomId,
            message: 'Conversa iniciada com sucesso.',
        });

    } catch (error: any) {
        console.error('Erro ao iniciar chat de ativação:', error);
        return NextResponse.json({ error: error.message || 'Erro ao iniciar chat de ativação' }, { status: 500 });
    }
}
