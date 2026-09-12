import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { rankExploreUsers } from '@/lib/exploreRanking';
import { AppSettings, GalleryItem, MicroTransaction, Room, Transaction, User } from '@/models';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();
        const currentUser = await User.findOne({ clerkId: userId }).select('isProfessional').lean();
        if (currentUser?.isProfessional) return NextResponse.json({ users: [], hasMore: false });

        const excludedIds = request.nextUrl.searchParams.get('exclude')
            ?.split(',')
            .filter(value => /^user_[A-Za-z0-9]+$/.test(value))
            .slice(0, 500) ?? [];

        const [professionals, rooms, settings] = await Promise.all([
            User.find({
                clerkId: { $ne: userId, $nin: excludedIds },
                isProfessional: true,
                professionalStatus: 'approved',
                isSuspended: { $ne: true },
                hideFromExplore: { $ne: true },
            })
                .select('clerkId username name email photoUrl coverUrl identityStatus subscriptionPrice bio createdAt avgResponseTimeMinutes freeIntroEnabled isOnline lastSeen lastAccessAt birthDate city state accessCount professionalAvailableCents professionalReservedForWithdrawalCents')
                .sort({ isOnline: -1, lastSeen: -1, lastAccessAt: -1, createdAt: -1, accessCount: -1 })
                .limit(100)
                .lean(),
            Room.find({ participants: userId }).select('participants').lean(),
            AppSettings.findOne({ key: 'global' })
                .select('conversationPricePerEquivalentCharCents subscriberDiscountPercentage exploreRankingMode exploreManualOrder')
                .lean(),
        ]);

        const professionalIds = professionals.map(user => user.clerkId);
        const galleryItems = await GalleryItem.find({
            ownerId: { $in: professionalIds },
            galleryType: 'public',
            visibility: 'public',
            mediaType: 'photo',
        }).sort({ createdAt: -1 }).lean();

        const photosByOwner = new Map<string, string[]>();
        for (const item of galleryItems) {
            const current = photosByOwner.get(item.ownerId) ?? [];
            current.push(item.imageUrl);
            photosByOwner.set(item.ownerId, current);
        }

        const talkedUserIds = new Set(
            rooms.flatMap(room => room.participants.filter(participant => participant !== userId)),
        );
        const regularPrice = (settings?.conversationPricePerEquivalentCharCents ?? 5) / 100;
        const subscriberPrice = regularPrice * (1 - (settings?.subscriberDiscountPercentage ?? 20) / 100);

        const rankingMode = (settings?.exploreRankingMode as any) || 'algorithm';
        const manualOrder = settings?.exploreManualOrder || [];

        let earningsMap = new Map<string, number>();
        if (rankingMode === 'revenue') {
            try {
                const [microAgg, txAgg] = await Promise.all([
                    MicroTransaction.aggregate([
                        { $match: { userId: { $in: professionalIds }, type: 'credit' } },
                        { $group: { _id: '$userId', total: { $sum: '$amount' } } }
                    ]),
                    Transaction.aggregate([
                        { $match: { userId: { $in: professionalIds }, type: 'credit', status: { $in: ['PAID', 'COMPLETED'] } } },
                        { $group: { _id: '$userId', total: { $sum: { $multiply: ['$amount', 100] } } } }
                    ])
                ]);
                for (const item of microAgg) earningsMap.set(item._id, (earningsMap.get(item._id) || 0) + Number(item.total || 0));
                for (const item of txAgg) earningsMap.set(item._id, (earningsMap.get(item._id) || 0) + Number(item.total || 0));
            } catch (err) {
                console.warn('Erro ao obter faturamento em featured:', err);
            }
        }

        const ranked = rankExploreUsers(professionals.map(user => {
            const lastActiveTime = Math.max(
                user.lastSeen ? new Date(user.lastSeen).getTime() : 0,
                user.lastAccessAt ? new Date(user.lastAccessAt).getTime() : 0,
            );
            const publicPhotos = photosByOwner.get(user.clerkId) ?? [];
            const recordedEarnings = earningsMap.get(user.clerkId) || 0;
            const walletEarnings = ((user as any).professionalAvailableCents || 0) + ((user as any).professionalReservedForWithdrawalCents || 0);
            const totalEarningsCents = Math.max(recordedEarnings, walletEarnings);

            return {
                id: user._id,
                clerkId: user.clerkId,
                username: user.username,
                name: user.name,
                email: user.email,
                photoUrl: user.photoUrl,
                coverUrl: user.coverUrl,
                isProfessional: true,
                identityStatus: user.identityStatus ?? null,
                subscriptionPrice: user.subscriptionPrice ?? 0,
                chargePerCharSubscribers: subscriberPrice,
                chargePerCharNonSubscribers: regularPrice,
                bio: user.bio ?? '',
                publicPhotos: publicPhotos.slice(0, 4),
                publicPhotosCount: publicPhotos.length,
                avgResponseTimeMinutes: user.avgResponseTimeMinutes ?? null,
                freeIntroEnabled: user.freeIntroEnabled === true,
                isOnline: user.isOnline === true,
                lastSeen: user.lastSeen ?? user.lastAccessAt ?? null,
                lastAccessAt: user.lastAccessAt ?? null,
                lastActiveTime,
                accessCount: user.accessCount ?? 0,
                totalEarningsCents,
                birthDate: user.birthDate ?? null,
                city: user.city ?? '',
                state: user.state ?? '',
                hasChat: talkedUserIds.has(user.clerkId),
            };
        }), {
            mode: rankingMode,
            manualOrder,
            limit: 30,
        });

        return NextResponse.json({ users: ranked, hasMore: professionals.length > ranked.length });
    } catch (error) {
        console.error('Error fetching featured users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
