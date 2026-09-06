import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { ModerationReview } from '@/models/ModerationReview';
import { Message } from '@/models/Message';
import { User } from '@/models/User';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkIsAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    return userId === FALLBACK_ADMIN || (settings?.adminClerkIds && settings.adminClerkIds.includes(userId));
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        await connectToDatabase();
        if (!(await checkIsAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido.' }, { status: 403 });
        }

        const { id } = await params;
        const review = await ModerationReview.findById(id).lean() as any;
        if (!review) {
            return NextResponse.json({ error: 'Registro de moderação não encontrado' }, { status: 404 });
        }

        // Determina a mensagem suspeita principal
        const targetMessageId = review.messageIds?.[review.messageIds.length - 1];
        let targetMsg = targetMessageId ? await Message.findById(targetMessageId).lean() as any : null;

        if (!targetMsg && review.roomId) {
            targetMsg = await Message.findOne({ roomId: review.roomId }).sort({ timestamp: -1 }).lean() as any;
        }

        if (!targetMsg) {
            return NextResponse.json({
                review,
                messages: [],
                targetMessageId: null,
            });
        }

        const targetTimestamp = targetMsg.timestamp || targetMsg.createdAt;

        // Busca exatamente 5 mensagens antes e 5 mensagens depois
        const [beforeMsgs, afterMsgs] = await Promise.all([
            Message.find({
                roomId: review.roomId,
                timestamp: { $lt: targetTimestamp },
            })
            .sort({ timestamp: -1 })
            .limit(5)
            .lean() as Promise<any[]>,

            Message.find({
                roomId: review.roomId,
                timestamp: { $gt: targetTimestamp },
            })
            .sort({ timestamp: 1 })
            .limit(5)
            .lean() as Promise<any[]>,
        ]);

        const chronologicalMsgs = [
            ...beforeMsgs.reverse(),
            targetMsg,
            ...afterMsgs,
        ];

        // Coletar usuários envolvidos
        const userIds = Array.from(new Set(chronologicalMsgs.map(m => m.senderId)));
        const users = await User.find({ clerkId: { $in: userIds } })
            .select('clerkId name username photoUrl isProfessional')
            .lean();
        const usersById = new Map(users.map(u => [u.clerkId, u]));

        const mappedMessages = chronologicalMsgs.map(msg => {
            const sender = usersById.get(msg.senderId);
            const isSuspect = msg._id.toString() === targetMsg._id.toString();
            return {
                id: msg._id.toString(),
                content: msg.content,
                timestamp: msg.timestamp,
                cost: msg.cost || 0,
                isSuspect,
                sender: sender ? {
                    name: sender.name,
                    username: sender.username,
                    photoUrl: sender.photoUrl,
                    isProfessional: sender.isProfessional,
                    clerkId: sender.clerkId,
                } : {
                    name: 'Usuário',
                    username: msg.senderId.slice(0, 8),
                    photoUrl: '',
                    isProfessional: false,
                    clerkId: msg.senderId,
                },
            };
        });

        return NextResponse.json({
            review,
            targetMessageId: targetMsg._id.toString(),
            messages: mappedMessages,
        });

    } catch (error: any) {
        console.error('[API/admin/moderation-reviews/[id] GET] Erro:', error);
        return NextResponse.json({ error: 'Erro ao buscar contexto da mensagem' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        await connectToDatabase();
        if (!(await checkIsAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido.' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, decisionReason } = body;

        if (!['confirmed_violation', 'dismissed', 'pending_review'].includes(status)) {
            return NextResponse.json({ error: 'Status de decisão inválido' }, { status: 400 });
        }

        const updated = await ModerationReview.findByIdAndUpdate(
            id,
            {
                $set: {
                    status,
                    decisionReason: decisionReason?.trim() || null,
                    reviewerId: userId,
                    reviewedAt: new Date(),
                }
            },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            status: updated.status,
            reviewedAt: updated.reviewedAt,
        });

    } catch (error: any) {
        console.error('[API/admin/moderation-reviews/[id] PATCH] Erro:', error);
        return NextResponse.json({ error: 'Erro ao registrar decisão' }, { status: 500 });
    }
}
