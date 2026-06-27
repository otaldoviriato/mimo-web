import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/users - List all users with search
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        // Verifica se o usuário atual é realmente administrador
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN : userId === FALLBACK_ADMIN;
        
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q') || '';
        
        let filter: any = {};
        if (query.trim().length > 0) {
            const cleanQuery = query.trim().replace('@', '');
            filter = {
                $or: [
                    { username: { $regex: new RegExp(cleanQuery, 'i') } },
                    { name: { $regex: new RegExp(cleanQuery, 'i') } },
                    { email: { $regex: new RegExp(cleanQuery, 'i') } }
                ]
            };
        }

        const usersList = await User.find(filter)
            .select('clerkId username name email photoUrl balance isProfessional createdAt taxId phone pixKey subscriptionPrice lastSeen isOnline')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean() as any[];

        return NextResponse.json({
            users: usersList.map(u => ({
                id: u.clerkId,
                clerkId: u.clerkId,
                username: u.username,
                name: u.name || u.username,
                email: u.email,
                photoUrl: u.photoUrl || null,
                balance: u.balance || 0,
                isProfessional: u.isProfessional || false,
                createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'N/A',
                taxId: u.taxId || '',
                phone: u.phone || '',
                pixKey: u.taxId || u.pixKey || '',
                subscriptionPrice: u.subscriptionPrice || 0,
                lastSeen: u.lastSeen ? new Date(u.lastSeen).toISOString() : null,
                isOnline: u.isOnline || false,
            }))
        });

    } catch (error: any) {
        console.error('Erro ao listar usuários para admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
