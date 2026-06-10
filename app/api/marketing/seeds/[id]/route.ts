import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import { normalizeUsername } from '@/lib/marketing/validation';
import { MarketingEntityStatus, MarketingSeedProfile } from '@/models/Marketing';

const STATUSES: MarketingEntityStatus[] = ['active', 'paused', 'archived'];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const access = await requireMarketingAdmin(request, { limit: 60 });
        if (access.error) return access.error;
        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Perfil-semente inválido.' }, { status: 400 });
        }
        const body = await request.json();
        const update: Record<string, unknown> = {};
        if (body.username !== undefined) update.username = normalizeUsername(body.username);
        if (body.profileUrl !== undefined) update.profileUrl = cleanString(body.profileUrl, 500);
        if (body.notes !== undefined) update.notes = cleanString(body.notes, 5000);
        if (body.status !== undefined) {
            if (!STATUSES.includes(body.status)) {
                return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
            }
            update.status = body.status;
        }
        const seed = await MarketingSeedProfile.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).lean();
        if (!seed) return NextResponse.json({ error: 'Perfil-semente não encontrado.' }, { status: 404 });
        return NextResponse.json({ success: true, seed });
    } catch (error) {
        console.error('Erro ao atualizar perfil-semente:', error);
        return NextResponse.json({ error: 'Erro ao atualizar perfil-semente.' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const access = await requireMarketingAdmin(request, { limit: 30 });
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Perfil-semente inválido.' }, { status: 400 });
    }
    const seed = await MarketingSeedProfile.findByIdAndDelete(id);
    if (!seed) return NextResponse.json({ error: 'Perfil-semente não encontrado.' }, { status: 404 });
    return NextResponse.json({ success: true });
}
