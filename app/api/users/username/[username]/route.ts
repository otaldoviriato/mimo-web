import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { Subscription } from '@/models/Subscription';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/users/username/[username] - Get user by exact username
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;

        if (!username) {
            return NextResponse.json({ error: 'Username required' }, { status: 400 });
        }

        // Decodifica e limpa o @ se presente na URL
        const cleanUsername = decodeURIComponent(username).replace('@', '');

        await connectToDatabase();

        let user = await User.findOne({ username: cleanUsername }).select(
            'clerkId username name email photoUrl coverUrl isProfessional professionalStatus identityStatus subscriptionPrice isSubscriptionEnabled chargePerCharSubscribers chargePerCharNonSubscribers subscribers balance bio avgResponseTimeMinutes'
        );

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Auto-popular name do Clerk se estiver vazio no banco
        if (!user.name) {
            try {
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(user.clerkId);
                const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ');
                
                if (clerkName) {
                    const updatedUser = await User.findOneAndUpdate(
                        { clerkId: user.clerkId },
                        { $set: { name: clerkName } },
                        { new: true }
                    );
                    if (updatedUser) user = updatedUser;
                }
            } catch (clerkErr) {
                console.warn('Could not fetch name from Clerk for user:', user.clerkId, clerkErr);
            }
        }

        // Verificar quem está visualizando
        const { userId: viewerClerkId } = await auth();

        // Se o perfil for de uma profissional e não estiver aprovado, apenas o próprio dono pode visualizá-lo
        if (user.isProfessional && user.professionalStatus !== 'approved' && viewerClerkId !== user.clerkId) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        let relationshipStats = null;
        let shouldShowBalance = false;

        if (viewerClerkId) {
            // Se o visualizador for o próprio usuário, ele pode ver seu próprio saldo
            if (viewerClerkId === user.clerkId) {
                shouldShowBalance = true;
            } else {
                // Buscar dados do visualizador no banco
                const viewer = await User.findOne({ clerkId: viewerClerkId }).select('isProfessional');
                if (viewer?.isProfessional && !user.isProfessional) {
                    shouldShowBalance = true;

                    // 1. Calcular total gasto (débitos do cliente com este profissional)
                    const totalSpentAgg = await MicroTransaction.aggregate([
                        {
                            $match: {
                                userId: user.clerkId,
                                relatedUserId: viewerClerkId,
                                type: 'debit'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$amount' }
                            }
                        }
                    ]);
                    const totalSpent = totalSpentAgg[0]?.total ?? 0;

                    // 2. Detalhar gastos por source (message, image_unlock, gift, subscription)
                    const statsAgg = await MicroTransaction.aggregate([
                        {
                            $match: {
                                userId: user.clerkId,
                                relatedUserId: viewerClerkId,
                                type: 'debit'
                            }
                        },
                        {
                            $group: {
                                _id: '$source',
                                totalAmount: { $sum: '$amount' },
                                count: { $sum: 1 }
                            }
                        }
                    ]);

                    const detailStats = {
                        message: { amount: 0, count: 0 },
                        image_unlock: { amount: 0, count: 0 },
                        gift: { amount: 0, count: 0 },
                        subscription: { amount: 0, count: 0 },
                    };

                    statsAgg.forEach((item: any) => {
                        if (item._id in detailStats) {
                            detailStats[item._id as keyof typeof detailStats] = {
                                amount: item.totalAmount,
                                count: item.count
                            };
                        }
                    });

                    // 3. Sala de chat e caracteres de texto enviados pelo cliente
                    const room = await Room.findOne({
                        participants: { $all: [user.clerkId, viewerClerkId] }
                    });

                    let totalMessages = 0;
                    let conversationStart = null;
                    const freeCharsLimit = 0;
                    let totalClientTextChars = 0;
                    let freeCharsUsed = 0;
                    let chargedChars = 0;
                    let remainingFreeChars = 0;

                    if (room) {
                        const virtualRoomId = [user.clerkId, viewerClerkId].sort().join('_');
                        const roomIds = [room._id.toString(), virtualRoomId];
                        const messageRoomFilter = { roomId: { $in: roomIds } };

                        totalMessages = await Message.countDocuments(messageRoomFilter);
                        conversationStart = room.createdAt;

                        const [clientCharsAgg] = await Message.aggregate([
                            {
                                $match: {
                                    ...messageRoomFilter,
                                    senderId: user.clerkId,
                                    receiverId: viewerClerkId,
                                    isSystem: { $ne: true },
                                    isGift: { $ne: true },
                                    isLockedImage: { $ne: true },
                                    isVideo: { $ne: true },
                                    originalImageUrl: { $in: [null, ''] },
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: {
                                        $sum: {
                                            $ifNull: [
                                                '$charCount',
                                                { $strLenCP: { $ifNull: ['$content', ''] } },
                                            ],
                                        },
                                    },
                                },
                            },
                        ]);

                        totalClientTextChars = clientCharsAgg?.total ?? 0;
                        freeCharsUsed = Math.min(totalClientTextChars, freeCharsLimit);
                        chargedChars = Math.max(0, totalClientTextChars - freeCharsLimit);
                        remainingFreeChars = Math.max(0, freeCharsLimit - totalClientTextChars);
                    }

                    relationshipStats = {
                        totalSpent,
                        detailStats,
                        totalMessages,
                        characterStats: {
                            totalClientTextChars,
                            freeCharsLimit,
                            freeCharsUsed,
                            chargedChars,
                            remainingFreeChars,
                            isBeyondFreeAllowance: freeCharsLimit <= 0 || totalClientTextChars >= freeCharsLimit
                        },
                        conversationStart
                    };
                }
            }
        }

        const settings = await AppSettings.findOne({ key: 'global' }).select('defaultPricePerCharSubscribers defaultPricePerCharNonSubscribers').lean();
        const defaultSub = settings?.defaultPricePerCharSubscribers ?? 0.002;
        const defaultNonSub = settings?.defaultPricePerCharNonSubscribers ?? 0.005;
        let effectiveSubscribers = user.subscribers || [];

        if (user.isProfessional) {
            const activeSubscriptions = await Subscription.find({
                professionalId: user.clerkId,
                status: { $in: ['ACTIVE', 'CANCELED'] },
                expiresAt: { $gt: new Date() },
            }).select('subscriberId').lean();

            effectiveSubscribers = activeSubscriptions.map((sub) => sub.subscriberId);
        }

        return NextResponse.json({
            user: {
                id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                coverUrl: user.coverUrl,
                isProfessional: user.isProfessional,
                identityStatus: user.identityStatus || null,
                subscriptionPrice: user.subscriptionPrice || 0,
                isSubscriptionEnabled: user.isSubscriptionEnabled ?? false,
                chargePerCharSubscribers: user.chargePerCharSubscribers ?? defaultSub,
                chargePerCharNonSubscribers: user.chargePerCharNonSubscribers ?? defaultNonSub,
                subscribers: effectiveSubscribers,
                bio: user.bio || '',
                balance: shouldShowBalance ? (user.balance || 0) : undefined,
                relationshipStats: relationshipStats || undefined,
                avgResponseTimeMinutes: user.avgResponseTimeMinutes ?? null,
            },
        });
    } catch (error: any) {
        console.error('Error getting user by username:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
