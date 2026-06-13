import { NextRequest, NextResponse } from 'next/server';
import { getAdminAccess } from '@/lib/adminAuth';
import { User } from '@/models/User';
import { connectToDatabase } from '@/lib/db';

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

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status')?.trim() || '';
        const search = searchParams.get('q')?.trim() || '';

        const query: Record<string, any> = {
            isProfessional: true,
            professionalStatus: { $in: ['pending', 'approved', 'rejected'] }
        };

        if (status) {
            if (status === 'pending' || status === 'approved' || status === 'rejected') {
                query.professionalStatus = status;
            } else {
                query.professionalStatus = status;
            }
        }

        if (search) {
            const expression = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
            query.$or = [
                { name: expression },
                { username: expression },
                { email: expression },
            ];
        }

        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .lean();

        const applications = users.map((u: any) => ({
            _id: u._id.toString(),
            fullName: u.name || u.username,
            artisticName: u.username,
            instagram: u.username,
            whatsapp: u.phone || 'Não informado',
            email: u.email,
            age: 0,
            cityState: 'Não informado',
            status: u.professionalStatus || 'pending',
            createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: u.updatedAt ? u.updatedAt.toISOString() : new Date().toISOString(),
        }));

        return NextResponse.json({ success: true, applications });
    } catch (error) {
        console.error('Erro ao listar inscrições de criadoras:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
