import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingLead, MarketingLeadStatus } from '@/models/Marketing';

const STATUSES: MarketingLeadStatus[] = [
    'new', 'reviewed', 'approved', 'contacted', 'interested', 'onboarded', 'rejected', 'ignored',
];

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Lead inválida.' }, { status: 400 });
    const lead = await MarketingLead.findById(id).lean();
    if (!lead) return NextResponse.json({ error: 'Lead não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: true, lead });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const access = await requireMarketingAdmin(request, { limit: 60 });
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Lead inválida.' }, { status: 400 });
    const body = await request.json();
    const update: { status?: MarketingLeadStatus; notes?: string } = {};
    if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
        update.status = body.status;
    }
    if (body.notes !== undefined) update.notes = cleanString(body.notes, 10000);
    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'Nenhuma alteração válida.' }, { status: 400 });
    }
    const lead = await MarketingLead.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
    if (!lead) return NextResponse.json({ error: 'Lead não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: true, lead });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const access = await requireMarketingAdmin(request, { limit: 30 });
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Lead inválida.' }, { status: 400 });
    }
    const lead = await MarketingLead.findByIdAndDelete(id).lean();
    if (!lead) return NextResponse.json({ error: 'Lead não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: true });
}
