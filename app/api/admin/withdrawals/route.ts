import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        // 1. Validar se o usuário é administrador
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings 
            ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN 
            : userId === FALLBACK_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        // 2. Buscar todas as solicitações de saques
        const withdrawals = await WithdrawRequest.find().sort({ createdAt: -1 }).lean() as any[];

        // Coletar IDs de usuários para fazer fetch riche
        const userClerkIds = Array.from(new Set(withdrawals.map(w => w.userId).filter(Boolean))) as string[];
        const usersList = await User.find({ clerkId: { $in: userClerkIds } })
            .select('clerkId name username email photoUrl')
            .lean();

        // 3. Mapear cada solicitação com detalhes reais
        const mappedWithdrawals = withdrawals.map(w => {
            const relatedUser = usersList.find(u => u.clerkId === w.userId);
            
            return {
                id: w._id.toString(),
                userId: w.userId,
                userName: relatedUser ? (relatedUser.name || `@${relatedUser.username}`) : `Profissional (${w.userId.substring(0, 8)})`,
                userEmail: relatedUser?.email || 'N/A',
                userPhotoUrl: relatedUser?.photoUrl || null,
                amount: w.amount / 100, // Converte centavos para Reais
                pixKey: w.pixKey,
                status: w.status, // 'pendente' | 'concluido' | 'rejeitado'
                createdAt: w.createdAt ? new Date(w.createdAt).toLocaleString('pt-BR') : 'N/A',
                updatedAt: w.updatedAt ? new Date(w.updatedAt).toLocaleString('pt-BR') : 'N/A',
            };
        });

        return NextResponse.json({ withdrawals: mappedWithdrawals });

    } catch (error: any) {
        console.error('Erro na API de listagem de saques do admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
