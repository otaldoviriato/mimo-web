import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { Subscription } from '@/models/Subscription';
import { User } from '@/models/User';

export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { userId } = await auth();
        const professionalId = request.nextUrl.searchParams.get('professionalId');
        const settings = await AppSettings.findOne({ key: 'global' })
            .select('defaultPricePerCharSubscribers defaultPricePerCharNonSubscribers audioPriceMultiplier')
            .lean();

        let isSubscriber = false;
        if (userId && professionalId) {
            const [professional, activeSubscription] = await Promise.all([
                User.findOne({ clerkId: professionalId }).select('subscribers').lean(),
                Subscription.findOne({
                    subscriberId: userId,
                    professionalId,
                    status: { $in: ['ACTIVE', 'CANCELED'] },
                    expiresAt: { $gt: new Date() },
                }).select('_id').lean(),
            ]);

            isSubscriber = Boolean(
                activeSubscription ||
                professional?.subscribers?.includes(userId)
            );
        }

        return NextResponse.json({
            defaultPricePerCharSubscribers: settings?.defaultPricePerCharSubscribers ?? 0.002,
            defaultPricePerCharNonSubscribers: settings?.defaultPricePerCharNonSubscribers ?? 0.005,
            audioPriceMultiplier: settings?.audioPriceMultiplier ?? 5,
            isSubscriber,
        });
    } catch (error) {
        console.error('[GET /api/settings/chat-pricing] Error fetching chat pricing:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
