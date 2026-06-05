import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { GiftCode } from '@/models/GiftCode';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function isUserAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' });
    return settings?.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
}

// GET /api/admin/coupons/[id]/users - Listar usuários que resgataram o cupom
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        if (!(await isUserAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { id: couponId } = await params;
        const giftCode = await GiftCode.findById(couponId);
        if (!giftCode) {
            return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
        }

        // Busca todas as transações bem-sucedidas desse cupom
        const transactions = await Transaction.find({
            source: 'gift',
            status: 'PAID',
            'metadata.giftCode': giftCode.code
        }).sort({ createdAt: -1 }).lean();

        const clerkIds = transactions.map(tx => tx.userId);

        // Busca detalhes de todos os usuários que usaram
        const users = await User.find({ clerkId: { $in: clerkIds } })
            .select('clerkId name username email photoUrl')
            .lean();

        // Mapeia os dados das transações e usuários juntos
        const claimedUsers = transactions.map(tx => {
            const user = users.find(u => u.clerkId === tx.userId);
            return {
                clerkId: tx.userId,
                name: user?.name || user?.username || 'Usuário Desconhecido',
                username: user?.username || '',
                email: user?.email || '',
                photoUrl: user?.photoUrl || null,
                claimedAt: tx.createdAt
            };
        });

        return NextResponse.json({ users: claimedUsers });
    } catch (error) {
        console.error('Erro ao buscar usuários do cupom no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
