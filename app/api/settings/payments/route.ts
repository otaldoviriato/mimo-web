import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectToDatabase();
        const settings = await AppSettings.findOne({ key: 'global' })
            .select('pixEnabled creditCardEnabled couponsEnabled')
            .lean();

        return NextResponse.json({
            pixEnabled: settings?.pixEnabled ?? true,
            creditCardEnabled: settings?.creditCardEnabled ?? true,
            couponsEnabled: settings?.couponsEnabled ?? true,
        });
    } catch {
        return NextResponse.json(
            { pixEnabled: true, creditCardEnabled: true, couponsEnabled: true },
        );
    }
}
