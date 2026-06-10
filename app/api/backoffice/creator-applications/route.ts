import { NextRequest, NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/adminAuth';
import { CreatorApplication, CreatorApplicationStatus } from '@/models/CreatorApplication';

const STATUSES: CreatorApplicationStatus[] = ['pending', 'contacted', 'approved', 'rejected'];

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
    try {
        const { userId, isAdmin } = await getAdminAccess();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso permitido apenas para administradores.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as CreatorApplicationStatus | null;
        const search = searchParams.get('q')?.trim() || '';
        const query: Record<string, unknown> = {};

        if (status && STATUSES.includes(status)) {
            query.status = status;
        }

        if (search) {
            const expression = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
            query.$or = [
                { fullName: expression },
                { artisticName: expression },
                { instagram: expression },
                { whatsapp: expression },
            ];
        }

        const applications = await CreatorApplication.find(query)
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, applications });
    } catch (error) {
        console.error('Erro ao listar inscrições de criadoras:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
