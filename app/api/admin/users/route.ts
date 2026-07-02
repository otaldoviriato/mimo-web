import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';

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
            .select('clerkId username name email photoUrl balance isProfessional createdAt taxId phone pixKey subscriptionPrice lastSeen isOnline accessCount lastAccessAt')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean() as any[];

        const clerkIds = usersList.map(u => u.clerkId);

        // Total já depositado (recargas pagas) por usuário
        // Transactions com source 'recharge' guardam o valor em REAIS (diferente de balance, que é em centavos) — convertemos aqui para manter o padrão de centavos da API
        const depositsAgg = await Transaction.aggregate([
            { $match: { userId: { $in: clerkIds }, source: 'recharge', status: { $in: ['PAID', 'COMPLETED'] } } },
            { $group: { _id: '$userId', total: { $sum: { $multiply: ['$amount', 100] } } } },
        ]);
        const depositsByUser = new Map(depositsAgg.map(d => [d._id, Math.round(d.total)]));

        // Total arrecadado (créditos recebidos) por usuário - relevante para perfis monetizados
        const earningsAgg = await MicroTransaction.aggregate([
            { $match: { userId: { $in: clerkIds }, type: 'credit' } },
            { $group: { _id: '$userId', total: { $sum: '$amount' } } },
        ]);
        const earningsByUser = new Map(earningsAgg.map(e => [e._id, e.total]));

        // Quantidade de conversas (salas) por usuário
        // $setUnion remove duplicatas dentro do array de participantes antes do $unwind,
        // evitando contar a mesma sala 2x em conversas antigas onde os 2 participantes são o mesmo usuário
        const roomsAgg = await Room.aggregate([
            { $match: { participants: { $in: clerkIds } } },
            { $project: { participants: { $setUnion: ['$participants', []] } } },
            { $unwind: '$participants' },
            { $match: { participants: { $in: clerkIds } } },
            { $group: { _id: '$participants', total: { $sum: 1 } } },
        ]);
        const roomsByUser = new Map(roomsAgg.map(r => [r._id, r.total]));

        // Quantidade de mensagens trocadas (enviadas ou recebidas) por usuário
        const messagesAgg = await Message.aggregate([
            { $match: { isSystem: { $ne: true }, $or: [{ senderId: { $in: clerkIds } }, { receiverId: { $in: clerkIds } }] } },
            { $project: { parties: { $setUnion: [['$senderId'], ['$receiverId']] } } },
            { $unwind: '$parties' },
            { $match: { parties: { $in: clerkIds } } },
            { $group: { _id: '$parties', total: { $sum: 1 } } },
        ]);
        const messagesByUser = new Map(messagesAgg.map(m => [m._id, m.total]));

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
                totalDeposited: depositsByUser.get(u.clerkId) || 0,
                totalEarned: earningsByUser.get(u.clerkId) || 0,
                accessCount: u.accessCount || 0,
                lastAccessAt: u.lastAccessAt ? new Date(u.lastAccessAt).toISOString() : null,
                roomsCount: roomsByUser.get(u.clerkId) || 0,
                messagesCount: messagesByUser.get(u.clerkId) || 0,
            }))
        });

    } catch (error: any) {
        console.error('Erro ao listar usuários para admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
