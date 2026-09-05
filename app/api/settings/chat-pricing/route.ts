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
            .select('conversationPricePerEquivalentCharCents subscriberDiscountPercentage audioEquivalentCharsPerSecond maxBillableMessageChars')
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

        const regularPrice = (settings?.conversationPricePerEquivalentCharCents ?? 5) / 100;
        const subscriberDiscount = settings?.subscriberDiscountPercentage ?? 20;

        return NextResponse.json({
            defaultPricePerCharSubscribers: regularPrice * (1 - subscriberDiscount / 100),
            defaultPricePerCharNonSubscribers: regularPrice,
            maxBillableMessageChars: settings?.maxBillableMessageChars ?? 50,
            audioPriceMultiplier: settings?.audioEquivalentCharsPerSecond ?? 5,
            isSubscriber,
        });
    } catch (error) {
        console.error('[GET /api/settings/chat-pricing] Error fetching chat pricing:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
