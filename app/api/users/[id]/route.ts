import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { Subscription } from '@/models/Subscription';
import { ProfilePromotion } from '@/models/ProfilePromotion';
import { checkAndExpirePromotions } from '@/lib/profilePromotion';

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

        const cleanedId = id.trim();
        const isClerk = cleanedId.startsWith('user_');
        let user = await User.findOne(
            isClerk
                ? { clerkId: cleanedId }
                : {
                    $or: [
                        { clerkId: cleanedId },
                        { username: cleanedId.toLowerCase().replace(/^@/, '') }
                    ]
                }
        ).select(
            'clerkId username name email photoUrl coverUrl isProfessional professionalStatus identityStatus subscriptionPrice chargePerCharSubscribers chargePerCharNonSubscribers subscribers balance bio conversationBadges isOnline lastSeen avgResponseTimeMinutes birthDate city state isTeam teamTitle isSuspended'
        );

        const { userId: viewerId } = await auth();
        if (user?.isProfessional && user.professionalStatus !== 'approved' && viewerId !== user.clerkId) {
            const viewer = viewerId ? await User.findOne({ clerkId: viewerId }).select('isTeam').lean() : null;
            if (!viewer?.isTeam) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 });
        }

        if (!user || user.isSuspended) {
            return NextResponse.json({
                user: {
                    id: user?._id?.toString() || id,
                    clerkId: id,
                    username: user?.username || 'deleted',
                    name: 'Conta encerrada',
                    email: '',
                    photoUrl: '',
                    coverUrl: '',
                    isProfessional: false,
                    identityStatus: null,
                    balance: 0,
                    subscriptionPrice: 0,
                    chargePerCharSubscribers: 0,
                    chargePerCharNonSubscribers: 0,
                    audioPriceMultiplier: 5,
                    subscribers: [],
                    bio: '',
                    isOnline: false,
                    lastSeen: null,
                }
            });
        }


        const settings = await AppSettings.findOne({ key: 'global' }).select('conversationPricePerEquivalentCharCents subscriberDiscountPercentage audioEquivalentCharsPerSecond').lean();
        const defaultNonSub = (settings?.conversationPricePerEquivalentCharCents ?? 5) / 100;
        const defaultSub = defaultNonSub * (1 - (settings?.subscriberDiscountPercentage ?? 20) / 100);
        const audioPriceMultiplier = settings?.audioEquivalentCharsPerSecond ?? 5;
        let effectiveSubscribers = user.subscribers || [];

        let isAvailable = false;
        if (user.isProfessional) {
            await checkAndExpirePromotions(user.clerkId);
            const [activeSubscriptions, activePromo] = await Promise.all([
                Subscription.find({
                    professionalId: user.clerkId,
                    status: { $in: ['ACTIVE', 'CANCELED'] },
                    expiresAt: { $gt: new Date() },
                }).select('subscriberId').lean(),
                ProfilePromotion.findOne({
                    professionalId: user.clerkId,
                    status: 'active',
                    expiresAt: { $gt: new Date() },
                }).select('_id').lean(),
            ]);

            effectiveSubscribers = activeSubscriptions.map((sub) => sub.subscriberId);
            isAvailable = Boolean(activePromo);
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
                conversationBadges: user.conversationBadges || [],
                isOnline: user.isOnline ?? false,
                lastSeen: user.lastSeen ?? null,
                freeIntroEnabled: user.freeIntroEnabled === true,
                isAvailable,
            },
        });
    } catch (error: any) {
        console.error('Error getting user by ID:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
