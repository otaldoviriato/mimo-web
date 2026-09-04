import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { Message } from '@/models/Message';
import { ModerationReview } from '@/models/ModerationReview';
import { User } from '@/models/User';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
        if (userId !== FALLBACK_ADMIN && !settings?.adminClerkIds?.includes(userId)) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const [conversationRows, totals, pendingReviews, campaignRows] = await Promise.all([
            Message.aggregate([
                { $match: { isSystem: { $ne: true } } },
                { $sort: { timestamp: 1 } },
                {
                    $group: {
                        _id: '$roomId',
                        messageCount: { $sum: 1 },
                        paidMessages: { $sum: { $cond: [{ $gt: ['$cost', 0] }, 1, 0] } },
                        equivalentChars: { $sum: { $ifNull: ['$equivalentCharCount', '$charCount'] } },
                        grossChargedCents: { $sum: { $ifNull: ['$cost', 0] } },
                        payoutCents: { $sum: { $ifNull: ['$receiverEarnings', 0] } },
                        marginCents: { $sum: { $ifNull: ['$platformFee', 0] } },
                        participantIds: { $addToSet: '$senderId' },
                        receiverIds: { $addToSet: '$receiverId' },
                        lastActivityAt: { $max: '$timestamp' },
                        lastMessage: { $last: '$content' },
                    },
                },
                { $match: { grossChargedCents: { $gt: 0 } } },
                { $sort: { lastActivityAt: -1 } },
                { $limit: 100 },
            ]),
            Message.aggregate([
                { $match: { cost: { $gt: 0 }, isSystem: { $ne: true } } },
                {
                    $group: {
                        _id: null,
                        paidMessages: { $sum: 1 },
                        paidRooms: { $addToSet: '$roomId' },
                        grossChargedCents: { $sum: '$cost' },
                        payoutCents: { $sum: { $ifNull: ['$receiverEarnings', 0] } },
                        marginCents: { $sum: { $ifNull: ['$platformFee', 0] } },
                    },
                },
            ]),
            ModerationReview.find({ status: 'pending_review' }).select('roomId priority matchedRules').lean(),
            CampaignVisit.aggregate([
                {
                    $group: {
                        _id: '$campaignId',
                        visits: { $sum: 1 },
                        ctaClicks: { $sum: { $cond: [{ $ne: ['$ctaClickedAt', null] }, 1, 0] } },
                        signups: { $sum: { $cond: [{ $ne: ['$signupCompletedAt', null] }, 1, 0] } },
                        recharges: { $sum: { $cond: [{ $ne: ['$firstRechargeAt', null] }, 1, 0] } },
                        paidChatStarts: { $sum: { $cond: [{ $ne: ['$firstPaidMessageAt', null] }, 1, 0] } },
                        rechargeRevenueCents: { $sum: { $ifNull: ['$firstRechargeAmountCents', 0] } },
                    },
                },
                { $sort: { visits: -1 } },
                { $limit: 10 },
            ]),
        ]);

        const participantIds = Array.from(new Set(conversationRows.flatMap(row => [
            ...row.participantIds,
            ...row.receiverIds,
        ])));
        const users = await User.find({ clerkId: { $in: participantIds } })
            .select('clerkId name username photoUrl isProfessional')
            .lean();
        const usersById = new Map(users.map(user => [user.clerkId, user]));
        const moderationByRoom = new Map(pendingReviews.filter(review => review.roomId).map(review => [review.roomId, review]));
        const activeCutoff = Date.now() - ACTIVE_WINDOW_MS;

        const recentPaidConversations = conversationRows.map(row => {
            const ids = Array.from(new Set([...row.participantIds, ...row.receiverIds])) as string[];
            const participants = ids.map(id => usersById.get(id)).filter(Boolean);
            return {
                id: row._id,
                roomId: row._id,
                professional: participants.find(user => user?.isProfessional) ?? null,
                client: participants.find(user => !user?.isProfessional) ?? null,
                messageCount: row.messageCount,
                paidMessages: row.paidMessages,
                equivalentChars: row.equivalentChars,
                grossChargedCents: row.grossChargedCents,
                payoutCents: row.payoutCents,
                marginCents: row.marginCents,
                lastActivityAt: row.lastActivityAt,
                lastMessage: row.lastMessage,
                isActiveNow: new Date(row.lastActivityAt).getTime() >= activeCutoff,
                moderation: moderationByRoom.get(row._id) ?? null,
            };
        });

        const campaignIds = campaignRows.map(row => row._id);
        const campaigns = await Campaign.find({ _id: { $in: campaignIds } }).select('name slug status network').lean();
        const campaignsById = new Map(campaigns.map(campaign => [campaign._id.toString(), campaign]));
        const summary = totals[0] ?? {};

        return NextResponse.json({
            marketplaceMetrics: {
                paidConversations: summary.paidRooms?.length ?? 0,
                paidMessages: summary.paidMessages ?? 0,
                activeNow: recentPaidConversations.filter(item => item.isActiveNow).length,
                grossRevenueCents: summary.grossChargedCents ?? 0,
                professionalPayoutCents: summary.payoutCents ?? 0,
                platformMarginCents: summary.marginCents ?? 0,
                pendingModerationCount: pendingReviews.length,
            },
            recentPaidConversations,
            campaignPerformance: campaignRows.map(row => ({
                campaign: campaignsById.get(row._id.toString()) ?? null,
                visits: row.visits,
                ctaClicks: row.ctaClicks,
                signups: row.signups,
                recharges: row.recharges,
                paidChatStarts: row.paidChatStarts,
                rechargeRevenueCents: row.rechargeRevenueCents,
            })),
        });
    } catch (error) {
        console.error('[GET /api/admin/dashboard] Erro:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
