import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import { CreatorApplication, CreatorApplicationStatus } from '@/models/CreatorApplication';

const STATUSES: CreatorApplicationStatus[] = ['pending', 'contacted', 'approved', 'rejected'];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const access = await requireMarketingAdmin(request, { limit: 60 });
    if (access.error) return access.error;
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: 'Inscrição inválida.' }, { status: 400 });
    }
    const body = await request.json();
    const update: { status?: CreatorApplicationStatus; notes?: string } = {};
    if (body.status !== undefined) {
        if (!STATUSES.includes(body.status)) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
        update.status = body.status;
    }
    if (body.notes !== undefined) update.notes = cleanString(body.notes, 5000);
    const application = await CreatorApplication.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true, runValidators: true }
    ).lean();
    if (!application) return NextResponse.json({ error: 'Inscrição não encontrada.' }, { status: 404 });
    return NextResponse.json({ success: true, application });
}
