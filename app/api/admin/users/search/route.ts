import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/users/search?q=query
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        // 1. Verifica se o usuário atual é realmente administrador
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || '';

        if (!query || query.trim().length < 2) {
            return NextResponse.json({ users: [] });
        }

        const cleanQuery = query.trim().replace('@', '');

        // 2. Busca qualquer usuário por nome, username ou email
        const foundUsers = await User.find({
            $or: [
                { username: { $regex: new RegExp(cleanQuery, 'i') } },
                { name: { $regex: new RegExp(cleanQuery, 'i') } },
                { email: { $regex: new RegExp(cleanQuery, 'i') } }
            ]
        })
        .select('clerkId username name email photoUrl')
        .limit(10)
        .lean() as any[];

        return NextResponse.json({
            users: foundUsers.map(u => ({
                clerkId: u.clerkId,
                username: u.username,
                name: u.name || u.username,
                email: u.email,
                photoUrl: u.photoUrl || null
            }))
        });

    } catch (error: any) {
        console.error('Erro na busca de usuários para admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
