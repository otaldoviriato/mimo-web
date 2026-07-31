import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { MicroTransaction } from '@/models/MicroTransaction';
import { AppSettings } from '@/models/AppSettings';
import { groupEventsIntoSessions, RawEventInput } from '@/lib/sessionGrouping';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId });
        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        // 1. Obter parâmetro de timeout global (default 30 min)
        const settings = await AppSettings.findOne({ key: 'global' }).lean();
        const timeoutMinutes = settings?.chatSessionTimeoutMinutes ?? 30;

        // 2. Buscar microtransações de crédito da profissional
        const microTxs = await MicroTransaction.find({
            userId: clerkId,
            type: 'credit',
            source: { $in: ['message', 'image_unlock', 'gift'] }
        })
        .sort({ timestamp: 1 })
        .lean();

        if (!microTxs || microTxs.length === 0) {
            return NextResponse.json({ sessions: [], timeoutMinutes });
        }

        // 3. Buscar informações dos clientes envolvidos
        const relatedUserIds = Array.from(new Set(microTxs.map(t => t.relatedUserId).filter(Boolean))) as string[];
        const clients = await User.find({ clerkId: { $in: relatedUserIds } })
            .select('clerkId name username photoUrl')
            .lean();

        const clientMap = new Map<string, { name: string; username: string; photoUrl: string | null }>();
        clients.forEach(c => {
            clientMap.set(c.clerkId, {
                name: c.name || c.username || 'Cliente',
                username: c.username || 'cliente',
                photoUrl: c.photoUrl || null
            });
        });

        // 4. Mapear para entrada de eventos brutos
        const events: RawEventInput[] = microTxs.map((tx: any) => ({
            id: tx._id.toString(),
            relatedUserId: tx.relatedUserId || 'desconhecido',
            type: (['message', 'image_unlock', 'gift'].includes(tx.source) ? tx.source : 'other') as any,
            amount: tx.amount || 0,
            timestamp: tx.timestamp || tx.createdAt,
            description: tx.source === 'message'
                ? 'Mensagem enviada'
                : tx.source === 'image_unlock'
                ? 'Mídia privada desbloqueada'
                : tx.source === 'gift'
                ? 'Presente recebido'
                : 'Crédito de conversa'
        }));

        // 5. Agrupar em sessões de conversa (intervalo <= timeoutMinutes)
        const sessions = groupEventsIntoSessions(events, timeoutMinutes);

        // 6. Enriquecer sessões com dados do cliente
        const enrichedSessions = sessions.map(session => {
            const clientInfo = clientMap.get(session.relatedUserId);
            return {
                ...session,
                clientName: clientInfo?.name || 'Cliente Mimo',
                clientUsername: clientInfo?.username || 'cliente',
                clientPhotoUrl: clientInfo?.photoUrl || null
            };
        });

        return NextResponse.json({
            sessions: enrichedSessions,
            timeoutMinutes
        });

    } catch (error: any) {
        console.error('Erro ao gerar extrato de sessões da carteira:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
