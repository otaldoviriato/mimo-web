import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingRun } from '@/models/Marketing';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Rodada inválida.' }, { status: 400 });
    }
    const run = await MarketingRun.findById(id).populate('campaignId', 'name').lean();
    if (!run) return NextResponse.json({ error: 'Rodada não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: true, run });
}
