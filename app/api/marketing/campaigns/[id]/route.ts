import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { boundedNumber, cleanString, cleanStringArray, requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingCampaign, MarketingEntityStatus } from '@/models/Marketing';

const STATUSES: MarketingEntityStatus[] = ['active', 'paused', 'archived'];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const access = await requireMarketingAdmin(request, { limit: 60 });
        if (access.error) return access.error;
        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Campanha inválida.' }, { status: 400 });
        }
        const body = await request.json();
        const existing = await MarketingCampaign.findById(id).lean();
        if (!existing) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
        const update: Record<string, unknown> = {};
        if (body.name !== undefined) update.name = cleanString(body.name, 120);
        if (body.description !== undefined) update.description = cleanString(body.description, 2000);
        if (body.targetDescription !== undefined) update.targetDescription = cleanString(body.targetDescription, 4000);
        if (body.minFollowers !== undefined) update.minFollowers = boundedNumber(body.minFollowers, 0, 0, 1_000_000_000);
        if (body.maxFollowers !== undefined) update.maxFollowers = boundedNumber(body.maxFollowers, 1_000_000, 0, 1_000_000_000);
        if (body.positiveSignals !== undefined) update.positiveSignals = cleanStringArray(body.positiveSignals);
        if (body.negativeSignals !== undefined) update.negativeSignals = cleanStringArray(body.negativeSignals);
        if (body.status !== undefined) {
            if (!STATUSES.includes(body.status)) {
                return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
            }
            update.status = body.status;
        }
        const minFollowers = Number(update.minFollowers ?? existing.minFollowers);
        const maxFollowers = Number(update.maxFollowers ?? existing.maxFollowers);
        if (maxFollowers < minFollowers) {
            return NextResponse.json(
                { error: 'O máximo de seguidores deve ser maior que o mínimo.' },
                { status: 400 }
            );
        }

        const campaign = await MarketingCampaign.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).lean();
        return NextResponse.json({ success: true, campaign });
    } catch (error) {
        console.error('Erro ao atualizar campanha:', error);
        return NextResponse.json({ error: 'Erro ao atualizar campanha.' }, { status: 500 });
    }
}
