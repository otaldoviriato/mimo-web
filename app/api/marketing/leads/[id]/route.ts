import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import {
    MarketingCompatibilityLevel,
    MarketingContactStatus,
    MarketingLead,
    MarketingLeadStatus,
} from '@/models/Marketing';
import { MARKETING_COMPATIBILITY_LEVELS } from '@/lib/marketing/compatibility';

const STATUSES: MarketingLeadStatus[] = [
    'new', 'reviewed', 'approved', 'contacted', 'interested', 'onboarded', 'rejected', 'ignored',
];
const CONTACT_STATUSES: MarketingContactStatus[] = [
    'not_contacted', 'contacted_no_reply', 'replied_interested', 'replied_not_interested', 'became_user',
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
    const update: {
        status?: MarketingLeadStatus;
        notes?: string;
        contactStatus?: MarketingContactStatus;
        contactResponse?: string;
        aiCompatibility?: MarketingCompatibilityLevel;
    } = {};
    if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
        update.status = body.status;
    }
    if (body.notes !== undefined) update.notes = cleanString(body.notes, 10000);
    if (body.contactStatus !== undefined) {
        if (!CONTACT_STATUSES.includes(body.contactStatus)) {
            return NextResponse.json({ error: 'Situação de contato inválida.' }, { status: 400 });
        }
        update.contactStatus = body.contactStatus;
        update.status = {
            not_contacted: 'new',
            contacted_no_reply: 'contacted',
            replied_interested: 'interested',
            replied_not_interested: 'rejected',
            became_user: 'onboarded',
        }[body.contactStatus as MarketingContactStatus] as MarketingLeadStatus;
    }
    if (body.contactResponse !== undefined) update.contactResponse = cleanString(body.contactResponse, 5000);
    if (body.aiCompatibility !== undefined) {
        if (!MARKETING_COMPATIBILITY_LEVELS.includes(body.aiCompatibility)) {
            return NextResponse.json({ error: 'Compatibilidade inválida.' }, { status: 400 });
        }
        update.aiCompatibility = body.aiCompatibility;
    }
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
