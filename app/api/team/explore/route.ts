import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Transaction } from '@/models/Transaction';
import { AppSettings } from '@/models/AppSettings';
import { getProfessionalsEarningsMap } from '@/lib/professionalEarnings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const currentUser = await User.findOne({ clerkId: userId })
            .select('clerkId isTeam')
            .lean() as { clerkId: string; isTeam?: boolean } | null;
        const settings = await AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean();
        const isAdmin = settings ? settings.adminClerkIds?.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;

        if (!currentUser || (!currentUser.isTeam && !isAdmin)) {
            return NextResponse.json({ error: 'Acesso restrito a membros da equipe' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = (searchParams.get('q') || '').trim();

        const filter: Record<string, unknown> = {
            isSuspended: { $ne: true },
        };

        if (query) {
            const cleanQuery = query.replace(/^@/, '');
            const regex = new RegExp(cleanQuery, 'i');
            filter.$or = [
                { username: regex },
                { name: regex },
                { email: regex },
            ];
        } else {
            filter.isProfessional = true;
            filter.professionalStatus = 'approved';
        }

        const usersList = await User.find(filter)
            .select('clerkId username name email photoUrl coverUrl birthDate city state isProfessional isOnline lastSeen lastAccessAt accessCount createdAt')
            .sort({ isOnline: -1, lastSeen: -1, lastAccessAt: -1, createdAt: -1, accessCount: -1 })
            .limit(100)
            .lean() as any[];

        const clerkIds = usersList.map(u => u.clerkId);

        if (clerkIds.length === 0) {
            return NextResponse.json({ users: [] });
        }

        const [earningsByUser, depositsAgg, roomsAgg] = await Promise.all([
            getProfessionalsEarningsMap(clerkIds),
            Transaction.aggregate([
                { $match: { userId: { $in: clerkIds }, source: 'recharge', status: { $in: ['PAID', 'COMPLETED'] } } },
                { $group: { _id: '$userId', total: { $sum: { $multiply: ['$amount', 100] } } } },
            ]),
            Room.aggregate([
                { $match: { participants: { $in: clerkIds } } },
                { $project: { participants: { $setUnion: ['$participants', []] } } },
                { $unwind: '$participants' },
                { $match: { participants: { $in: clerkIds } } },
                { $group: { _id: '$participants', total: { $sum: 1 } } },
            ]),
        ]);

        const depositsByUser = new Map(depositsAgg.map(d => [d._id, Math.round(d.total)]));
        const roomsByUser = new Map(roomsAgg.map(r => [r._id, r.total]));

        const enriched = usersList.map(u => {
            const earned = earningsByUser.get(u.clerkId) || 0;
            const deposited = depositsByUser.get(u.clerkId) || 0;
            const totalBilledCents = earned > 0 ? earned : deposited;
            const totalRooms = roomsByUser.get(u.clerkId) || 0;

            return {
                id: u.clerkId,
                clerkId: u.clerkId,
                username: u.username,
                name: u.name || u.username,
                email: u.email,
                photoUrl: u.photoUrl || null,
                coverUrl: u.coverUrl || null,
                birthDate: u.birthDate || null,
                city: u.city || '',
                state: u.state || '',
                isProfessional: !!u.isProfessional,
                isOnline: !!u.isOnline,
                lastSeen: u.lastSeen || u.lastAccessAt || null,
                accessCount: u.accessCount || 0,
                totalBilledCents,
                totalRooms,
            };
        });

        return NextResponse.json({ users: enriched });
    } catch (error) {
        console.error('Erro em /api/team/explore:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar explorador para equipe' }, { status: 500 });
    }
}
