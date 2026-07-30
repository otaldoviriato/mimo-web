import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDatabase();
        const settings = await AppSettings.findOne({ key: 'global' })
            .select('pixEnabled creditCardEnabled couponsEnabled lowBalanceThresholdInCents')
            .lean();

        return NextResponse.json({
            pixEnabled: settings?.pixEnabled ?? true,
            creditCardEnabled: settings?.creditCardEnabled ?? true,
            couponsEnabled: settings?.couponsEnabled ?? true,
            lowBalanceThresholdInCents: settings?.lowBalanceThresholdInCents ?? 1000,
        });
    } catch {
        return NextResponse.json(
            { pixEnabled: true, creditCardEnabled: true, couponsEnabled: true, lowBalanceThresholdInCents: 1000 },
        );
    }
}
