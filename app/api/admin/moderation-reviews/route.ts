import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { ModerationReview } from '@/models/ModerationReview';
import { Message } from '@/models/Message';
import { User } from '@/models/User';
import { detectViolations } from '@/lib/moderationRules';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkIsAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    return userId === FALLBACK_ADMIN || (settings?.adminClerkIds && settings.adminClerkIds.includes(userId));
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        await connectToDatabase();
        if (!(await checkIsAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const q = searchParams.get('q')?.trim().toLowerCase();

        // Se a coleção estiver vazia, roda auto-scan para encontrar violações já existentes
        const totalReviewsCount = await ModerationReview.countDocuments();
        if (totalReviewsCount === 0) {
            await runModerationScan();
        }

        const query: any = {};
        if (status && ['pending_review', 'confirmed_violation', 'dismissed'].includes(status)) {
            query.status = status;
        }

        const reviews = await ModerationReview.find(query)
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean() as any[];

        // Coleta todos os messageIds e roomIds
        const messageIdsToFetch = reviews.flatMap(r => r.messageIds || []).filter(Boolean);
        const messages = messageIdsToFetch.length > 0
            ? await Message.find({ _id: { $in: messageIdsToFetch } }).select('_id content senderId receiverId timestamp roomId').lean()
            : [];
        const messagesById = new Map(messages.map(m => [m._id.toString(), m]));

        // Coletar IDs de participantes das salas e mensagens
        const clerkIdsSet = new Set<string>();
        reviews.forEach(r => {
            if (r.roomId) {
                r.roomId.split('_').forEach((id: string) => clerkIdsSet.add(id));
            }
            (r.messageIds || []).forEach((mId: string) => {
                const msg = messagesById.get(mId);
                if (msg) {
                    clerkIdsSet.add(msg.senderId);
                    clerkIdsSet.add(msg.receiverId);
                }
            });
        });

        const users = clerkIdsSet.size > 0
            ? await User.find({ clerkId: { $in: Array.from(clerkIdsSet) } }).select('clerkId name username photoUrl isProfessional').lean()
            : [];
        const usersById = new Map(users.map(u => [u.clerkId, u]));

        const enriched = reviews.map(review => {
            const rawMsgId = review.messageIds?.[review.messageIds.length - 1];
            const targetMessage = rawMsgId ? messagesById.get(rawMsgId) : null;
            const senderUser = targetMessage ? usersById.get(targetMessage.senderId) : null;
            const receiverUser = targetMessage ? usersById.get(targetMessage.receiverId) : null;
            
            const roomUserIds = (review.roomId || '').split('_');
            const userA = usersById.get(roomUserIds[0]);
            const userB = usersById.get(roomUserIds[1]);

            return {
                id: review._id.toString(),
                roomId: review.roomId,
                status: review.status,
                matchedRules: review.matchedRules || [],
                excerpts: review.excerpts || [],
                priority: review.priority || 'normal',
                reviewedAt: review.reviewedAt,
                reviewerId: review.reviewerId,
                decisionReason: review.decisionReason,
                createdAt: review.createdAt,
                updatedAt: review.updatedAt,
                targetMessage: targetMessage ? {
                    id: targetMessage._id.toString(),
                    content: targetMessage.content,
                    timestamp: targetMessage.timestamp,
                    senderId: targetMessage.senderId,
                } : null,
                sender: senderUser || null,
                receiver: receiverUser || null,
                userA: userA || null,
                userB: userB || null,
            };
        });

        const filtered = q
            ? enriched.filter(item => {
                const searchStr = `${item.excerpts.join(' ')} ${item.sender?.name} ${item.sender?.username} ${item.receiver?.name} ${item.receiver?.username} ${item.targetMessage?.content || ''}`.toLowerCase();
                return searchStr.includes(q);
            })
            : enriched;

        // Contagens gerais para tabs
        const [pendingCount, violationCount, dismissedCount] = await Promise.all([
            ModerationReview.countDocuments({ status: 'pending_review' }),
            ModerationReview.countDocuments({ status: 'confirmed_violation' }),
            ModerationReview.countDocuments({ status: 'dismissed' }),
        ]);

        return NextResponse.json({
            reviews: filtered,
            counts: {
                pending: pendingCount,
                violation: violationCount,
                dismissed: dismissedCount,
                total: pendingCount + violationCount + dismissedCount,
            }
        });

    } catch (error: any) {
        console.error('[API/admin/moderation-reviews] Erro:', error);
        return NextResponse.json({ error: 'Erro interno ao carregar revisões' }, { status: 500 });
    }
}

// POST - Executa varredura de moderação nas mensagens
export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        await connectToDatabase();
        if (!(await checkIsAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido.' }, { status: 403 });
        }

        const result = await runModerationScan();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API/admin/moderation-reviews POST] Erro:', error);
        return NextResponse.json({ error: 'Erro ao executar varredura' }, { status: 500 });
    }
}

async function runModerationScan() {
    const messages = await Message.find({
        isSystem: { $ne: true },
        isAudio: { $ne: true },
        content: { $exists: true, $ne: '' }
    })
    .sort({ timestamp: -1 })
    .limit(1000)
    .lean() as any[];

    let flaggedCount = 0;
    for (const msg of messages) {
        const violations = detectViolations(msg.content);
        if (violations.length > 0) {
            const matchedRules = violations.map(v => v.rule);
            const excerpts = violations.map(v => v.excerpt);
            const priority = matchedRules.some(r => r === 'phone_sequence' || r === 'email' || r === 'pix_contact')
                ? 'high'
                : 'normal';

            await ModerationReview.updateOne(
                { roomId: msg.roomId, messageIds: msg._id.toString() },
                {
                    $setOnInsert: {
                        roomId: msg.roomId,
                        status: 'pending_review',
                        createdAt: msg.timestamp || new Date(),
                    },
                    $addToSet: {
                        messageIds: msg._id.toString(),
                        matchedRules: { $each: matchedRules },
                        excerpts: { $each: excerpts },
                    },
                    $set: { priority, updatedAt: new Date() },
                },
                { upsert: true }
            );
            flaggedCount++;
        }
    }
    return { scanned: messages.length, flagged: flaggedCount };
}
