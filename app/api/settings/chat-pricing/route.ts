import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';

export async function GET() {
    try {
        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' })
            .select('defaultPricePerCharSubscribers defaultPricePerCharNonSubscribers audioPriceMultiplier')
            .lean();

        return NextResponse.json({
            defaultPricePerCharSubscribers: settings?.defaultPricePerCharSubscribers ?? 0.002,
            defaultPricePerCharNonSubscribers: settings?.defaultPricePerCharNonSubscribers ?? 0.005,
            audioPriceMultiplier: settings?.audioPriceMultiplier ?? 5,
        });
    } catch (error) {
        console.error('[GET /api/settings/chat-pricing] Error fetching chat pricing:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
