import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { Subscription } from '@/models/Subscription';

// GET /api/users/[id] - Get user by Clerk ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        await connectToDatabase();

        let user = await User.findOne({ clerkId: id }).select(
            'clerkId username name email photoUrl coverUrl isProfessional identityStatus subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers subscribers balance bio isOnline lastSeen avgResponseTimeMinutes birthDate city state isTeam teamTitle isSuspended'
        );

        if (!user || user.isSuspended) {
            return NextResponse.json({
                user: {
                    id: user?._id?.toString() || id,
                    clerkId: id,
                    username: 'usuario_excluido',
                    name: 'Usuário Excluído',
                    email: '',
                    photoUrl: '',
                    coverUrl: '',
                    isProfessional: false,
                    isTeam: false,
                    teamTitle: '',
                    identityStatus: null,
                    balance: 0,
                    subscriptionPrice: 0,
                    chargePerCharSubscribers: 0,
                    chargePerCharNonSubscribers: 0,
                    audioPriceMultiplier: 0,
                    subscribersCount: 0,
                    isSubscribed: false,
                    bio: '',
                    isOnline: false,
                    isDeleted: true,
                }
            });
        }


        const settings = await AppSettings.findOne({ key: 'global' }).select('conversationPricePerEquivalentCharCents subscriberDiscountPercentage audioEquivalentCharsPerSecond').lean();
        const defaultNonSub = (settings?.conversationPricePerEquivalentCharCents ?? 5) / 100;
        const defaultSub = defaultNonSub * (1 - (settings?.subscriberDiscountPercentage ?? 20) / 100);
        const audioPriceMultiplier = settings?.audioEquivalentCharsPerSecond ?? 5;
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
                isTeam: Boolean(user.isTeam),
                teamTitle: user.teamTitle || 'Equipe Mimo',
                identityStatus: user.identityStatus || null,
                balance: user.balance || 0,
                subscriptionPrice: user.subscriptionPrice || 0,
                chargePerCharSubscribers: defaultSub,
                chargePerCharNonSubscribers: defaultNonSub,
                audioPriceMultiplier,
                subscribers: effectiveSubscribers,
                bio: user.bio || '',
                isOnline: user.isOnline ?? false,
                lastSeen: user.lastSeen ?? null,
            },
        });
    } catch (error: any) {
        console.error('Error getting user by ID:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
