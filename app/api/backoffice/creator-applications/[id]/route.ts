import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/adminAuth';
import { CreatorApplication, CreatorApplicationStatus } from '@/models/CreatorApplication';

const STATUSES: CreatorApplicationStatus[] = ['pending', 'contacted', 'approved', 'rejected'];

async function authorize() {
    const access = await getAdminAccess();
    if (!access.userId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (!access.isAdmin) {
        return NextResponse.json({ error: 'Acesso permitido apenas para administradores.' }, { status: 403 });
    }
    return null;
}

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authorizationError = await authorize();
        if (authorizationError) return authorizationError;

        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Inscrição inválida.' }, { status: 400 });
        }

        const application = await CreatorApplication.findById(id).lean();
        if (!application) {
            return NextResponse.json({ error: 'Inscrição não encontrada.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, application });
    } catch (error) {
        console.error('Erro ao buscar inscrição de criadora:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const authorizationError = await authorize();
        if (authorizationError) return authorizationError;

        const { id } = await context.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Inscrição inválida.' }, { status: 400 });
        }

        const body = await request.json();
        const update: { status?: CreatorApplicationStatus; notes?: string } = {};

        if (body.status !== undefined) {
            if (!STATUSES.includes(body.status)) {
                return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
            }
            update.status = body.status;
        }

        if (body.notes !== undefined) {
            if (typeof body.notes !== 'string') {
                return NextResponse.json({ error: 'As notas devem ser um texto.' }, { status: 400 });
            }
            update.notes = body.notes.trim().slice(0, 5000);
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ error: 'Nenhuma alteração válida foi enviada.' }, { status: 400 });
        }

        const application = await CreatorApplication.findByIdAndUpdate(
            id,
            { $set: update },
            { new: true, runValidators: true }
        ).lean();

        if (!application) {
            return NextResponse.json({ error: 'Inscrição não encontrada.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, application });
    } catch (error) {
        console.error('Erro ao atualizar inscrição de criadora:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
