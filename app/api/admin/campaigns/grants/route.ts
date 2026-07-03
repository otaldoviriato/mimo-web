import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { CreditGrant } from '@/models/CreditGrant';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function isUserAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' });
    return settings?.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
}

// GET /api/admin/campaigns/grants - Listar concessões de crédito com filtros
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        if (!(await isUserAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const campaignId = searchParams.get('campaignId');
        const status = searchParams.get('status');
        const search = searchParams.get('search'); // Filtro por nome, username ou email do usuário

        const query: any = {};
        if (campaignId) {
            query.campaignId = campaignId;
        }
        if (status) {
            query.status = status;
        }

        // Se houver busca por texto, filtramos os usuários correspondentes primeiro
        if (search) {
            const users = await User.find({
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            });
            const clerkIds = users.map(u => u.clerkId);
            query.userId = { $in: clerkIds };
        }

        // Busca concessões
        const grants = await CreditGrant.find(query)
            .sort({ createdAt: -1 })
            .limit(200);

        // Busca dados de usuários associados
        const clerkIds = grants.map(g => g.userId);
        const users = await User.find({ clerkId: { $in: clerkIds } });
        const userMap = new Map();
        for (const u of users) {
            userMap.set(u.clerkId, {
                id: u._id,
                clerkId: u.clerkId,
                name: u.name,
                username: u.username,
                email: u.email,
                phone: u.phone,
                taxId: u.taxId,
                photoUrl: u.photoUrl,
            });
        }

        const enrichedGrants = grants.map(grant => {
            const grantObj = grant.toObject() as any;
            grantObj.user = userMap.get(grant.userId) || {
                clerkId: grant.userId,
                name: 'Usuário Inativo',
                username: 'inativo',
                email: '-'
            };
            return grantObj;
        });

        return NextResponse.json({ grants: enrichedGrants });
    } catch (error) {
        console.error('Erro ao listar concessões de crédito no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
