import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { rankExploreUsers, ExploreRankingMode } from '@/lib/exploreRanking';
import { AppSettings, GalleryItem, MicroTransaction, Transaction, User } from '@/models';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkAdminAuth() {
    const { userId } = await auth();
    if (!userId) return null;
    await connectToDatabase();
    const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
    const isAdmin = userId === FALLBACK_ADMIN || settings?.adminClerkIds?.includes(userId);
    return isAdmin ? userId : null;
}

export async function GET() {
    const adminId = await checkAdminAuth();
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await AppSettings.findOne({ key: 'global' }).lean();
    const currentMode: ExploreRankingMode = (settings?.exploreRankingMode as ExploreRankingMode) || 'algorithm';
    const currentManualOrder: string[] = settings?.exploreManualOrder || [];

    const professionals = await User.find({
        isProfessional: true,
        professionalStatus: 'approved',
        isSuspended: { $ne: true },
        hideFromExplore: { $ne: true },
    })
        .select('clerkId username name photoUrl coverUrl bio isOnline lastSeen lastAccessAt createdAt accessCount professionalAvailableCents professionalReservedForWithdrawalCents')
        .sort({ isOnline: -1, lastSeen: -1, lastAccessAt: -1, createdAt: -1, accessCount: -1 })
        .lean();

    const ids = professionals.map(user => user.clerkId);

    // Fotos públicas
    const photos = await GalleryItem.find({
        ownerId: { $in: ids },
        galleryType: 'public',
        visibility: 'public',
        mediaType: 'photo'
    }).lean();

    const photoMap = new Map<string, string[]>();
    for (const photo of photos) {
        photoMap.set(photo.ownerId, [...(photoMap.get(photo.ownerId) ?? []), photo.imageUrl]);
    }

    // Faturamento agregado de cada profissional
    const earningsMap = new Map<string, number>();
    try {
        const [microAgg, txAgg] = await Promise.all([
            MicroTransaction.aggregate([
                { $match: { userId: { $in: ids }, type: 'credit' } },
                { $group: { _id: '$userId', total: { $sum: '$amount' } } }
            ]),
            Transaction.aggregate([
                { $match: { userId: { $in: ids }, type: 'credit', status: { $in: ['PAID', 'COMPLETED'] } } },
                { $group: { _id: '$userId', total: { $sum: { $multiply: ['$amount', 100] } } } }
            ])
        ]);

        for (const item of microAgg) {
            earningsMap.set(item._id, (earningsMap.get(item._id) || 0) + Number(item.total || 0));
        }
        for (const item of txAgg) {
            earningsMap.set(item._id, (earningsMap.get(item._id) || 0) + Number(item.total || 0));
        }
    } catch (err) {
        console.warn('Erro ao agregar faturamento no explore-preview:', err);
    }

    const mappedUsers = professionals.map(user => {
        const lastActiveTime = Math.max(
            user.lastSeen ? new Date(user.lastSeen).getTime() : 0,
            user.lastAccessAt ? new Date(user.lastAccessAt).getTime() : 0,
        );

        // Faturamento total (soma transações registradas ou saldo da carteira)
        const recordedEarnings = earningsMap.get(user.clerkId) || 0;
        const walletEarnings = ((user as any).professionalAvailableCents || 0) + ((user as any).professionalReservedForWithdrawalCents || 0);
        const totalEarningsCents = Math.max(recordedEarnings, walletEarnings);

        return {
            id: user._id,
            clerkId: user.clerkId,
            username: user.username,
            name: user.name,
            photoUrl: user.photoUrl,
            coverUrl: user.coverUrl,
            bio: user.bio,
            isOnline: user.isOnline === true,
            lastSeen: user.lastSeen ?? null,
            lastAccessAt: user.lastAccessAt ?? null,
            lastActiveTime,
            accessCount: (user as any).accessCount ?? 0,
            totalEarningsCents,
            publicPhotos: (photoMap.get(user.clerkId) ?? []).slice(0, 4),
        };
    });

    const rankedUsers = rankExploreUsers(mappedUsers, {
        mode: currentMode,
        manualOrder: currentManualOrder,
        limit: 150, // No backoffice mostra todas para drag and drop
    });

    return NextResponse.json({
        users: rankedUsers,
        rankingMode: currentMode,
        manualOrder: currentManualOrder,
        totalProfessionals: professionals.length,
    });
}

export async function POST(request: NextRequest) {
    const adminId = await checkAdminAuth();
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { rankingMode, manualOrder } = body;

    const allowedModes: ExploreRankingMode[] = ['algorithm', 'revenue', 'recent_visits', 'last_seen', 'manual'];

    const updateSet: Record<string, any> = {};

    if (rankingMode) {
        if (!allowedModes.includes(rankingMode)) {
            return NextResponse.json({ error: 'Modo de ordenação inválido' }, { status: 400 });
        }
        updateSet.exploreRankingMode = rankingMode;
    }

    if (Array.isArray(manualOrder)) {
        updateSet.exploreManualOrder = manualOrder.map(String);
    }

    if (Object.keys(updateSet).length === 0) {
        return NextResponse.json({ error: 'Nenhum parâmetro para atualizar' }, { status: 400 });
    }

    // Update pontual no MongoDB com $set (sem salvar documento inteiro novamente)
    await AppSettings.updateOne(
        { key: 'global' },
        { $set: updateSet },
        { upsert: true }
    );

    return NextResponse.json({
        success: true,
        rankingMode: updateSet.exploreRankingMode ?? rankingMode,
        manualOrder: updateSet.exploreManualOrder ?? manualOrder,
    });
}
