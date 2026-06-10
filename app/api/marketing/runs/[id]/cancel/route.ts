import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingRun } from '@/models/Marketing';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const access = await requireMarketingAdmin(request, { limit: 30 });
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Rodada inválida.' }, { status: 400 });
    }
    const run = await MarketingRun.findOneAndUpdate(
        { _id: id, status: { $in: ['queued', 'running'] } },
        {
            $set: { status: 'cancelled', finishedAt: new Date() },
            $push: { logs: 'Cancelamento solicitado pelo administrador.' },
            $unset: { inputCandidates: 1 },
        },
        { new: true }
    ).lean();
    if (!run) {
        return NextResponse.json({ error: 'A rodada não pode mais ser cancelada.' }, { status: 409 });
    }
    return NextResponse.json({ success: true, run });
}
