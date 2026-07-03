import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import { Message } from '@/models/Message';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Auxiliar para calcular variação percentual
function calculateChange(current: number, previous: number): { change: string; isPositive: boolean } {
    if (previous === 0) {
        return {
            change: current > 0 ? '+100%' : '0%',
            isPositive: current >= 0,
        };
    }
    const diff = ((current - previous) / previous) * 100;
    const sign = diff >= 0 ? '+' : '';
    return {
        change: `${sign}${diff.toFixed(1)}%`,
        isPositive: diff >= 0,
    };
}

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

        // 2. Determinar o período comparativo
        const searchParams = request.nextUrl.searchParams;
        let period = searchParams.get('period') || '';
        
        const validPeriods = ['none', 'week', 'month'];
        if (!validPeriods.includes(period)) {
            period = settings?.comparisonPeriod || 'none';
        }

        const now = new Date();
        let startDate: Date | null = null;
        let prevStartDate: Date | null = null;

        if (period === 'week') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        }

        // --- CÁLCULO DE MÉTRICAS ---

        const onboardingCompletedFilter = {
            $or: [
                { onboardingStep: 'completed' },
                { name: { $exists: true, $ne: '' }, onboardingStep: { $exists: false } }
            ]
        };

        // A. Total de Usuários
        const totalUsers = await User.countDocuments(onboardingCompletedFilter);
        let usersChange = '';
        let isUsersPositive = true;

        if (startDate && prevStartDate) {
            const currUsers = await User.countDocuments({ ...onboardingCompletedFilter, createdAt: { $gte: startDate } });
            const prevUsers = await User.countDocuments({ ...onboardingCompletedFilter, createdAt: { $gte: prevStartDate, $lt: startDate } });
            const res = calculateChange(currUsers, prevUsers);
            usersChange = res.change;
            isUsersPositive = res.isPositive;
        }

        // B. Conversas Ativas
        let activeChats = 0;
        let chatsChange = '';
        let isChatsPositive = true;

        if (startDate && prevStartDate) {
            // Conversas ativas no período atual (salas com pelo menos uma mensagem no intervalo)
            const currActiveRooms = await Message.distinct('roomId', { timestamp: { $gte: startDate } });
            activeChats = currActiveRooms.length;

            const prevActiveRooms = await Message.distinct('roomId', { timestamp: { $gte: prevStartDate, $lt: startDate } });
            const res = calculateChange(currActiveRooms.length, prevActiveRooms.length);
            chatsChange = res.change;
            isChatsPositive = res.isPositive;
        } else {
            // Sem relação: total geral de salas no sistema que possuem alguma mensagem
            const allActiveRooms = await Message.distinct('roomId');
            activeChats = allActiveRooms.length;
        }

        // C. Mensagens Enviadas
        let totalMessages = 0;
        let messagesChange = '';
        let isMessagesPositive = true;

        if (startDate && prevStartDate) {
            const currMessages = await Message.countDocuments({ timestamp: { $gte: startDate } });
            totalMessages = currMessages;

            const prevMessages = await Message.countDocuments({ timestamp: { $gte: prevStartDate, $lt: startDate } });
            const res = calculateChange(currMessages, prevMessages);
            messagesChange = res.change;
            isMessagesPositive = res.isPositive;
        } else {
            totalMessages = await Message.countDocuments();
        }

        // D. Total Recarregado (Faturamento via AbacatePay)
        // Lembrar que transações com source 'recharge' guardam valor em REAIS no banco de dados.
        let totalRevenue = 0;
        let revenueChange = '';
        let isRevenuePositive = true;

        const getRevenueSum = async (start: Date | null, end: Date | null) => {
            const query: any = {
                source: 'recharge',
                status: 'PAID',
            };
            if (start || end) {
                query.timestamp = {};
                if (start) query.timestamp.$gte = start;
                if (end) query.timestamp.$lt = end;
            }

            const result = await Transaction.aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            return result.length > 0 ? result[0].total : 0;
        };

        if (startDate && prevStartDate) {
            const currRevenue = await getRevenueSum(startDate, null);
            totalRevenue = currRevenue;

            const prevRevenue = await getRevenueSum(prevStartDate, startDate);
            const res = calculateChange(currRevenue, prevRevenue);
            revenueChange = res.change;
            isRevenuePositive = res.isPositive;
        } else {
            totalRevenue = await getRevenueSum(null, null);
        }

        // --- GRÁFICO DE DESEMPENHO (Últimos 7 dias) ---
        const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const activityData = [];

        for (let i = 6; i >= 0; i--) {
            const dStart = new Date();
            dStart.setHours(0, 0, 0, 0);
            dStart.setDate(dStart.getDate() - i);

            const dEnd = new Date(dStart);
            dEnd.setDate(dEnd.getDate() + 1);

            const dayLabel = weekdayNames[dStart.getDay()];

            const msgsCount = await Message.countDocuments({ timestamp: { $gte: dStart, $lt: dEnd } });
            const usrsCount = await User.countDocuments({ ...onboardingCompletedFilter, createdAt: { $gte: dStart, $lt: dEnd } });

            activityData.push({
                label: dayLabel,
                messages: msgsCount,
                users: usrsCount,
            });
        }

        // --- TRANSAÇÕES DA TABELA TRANSACTION ---
        const rawTransactions = await Transaction.find({
            type: { $ne: 'promotional_credit_usage' },
            $or: [
                { source: { $ne: 'subscription' } },
                { type: 'debit' }
            ]
        })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean() as any[];

        // --- TRANSAÇÕES DA TABELA MICROTRANSACTION ---
        const rawMicroTransactions = await MicroTransaction.find({
            source: { $in: ['image_unlock', 'gift', 'message'] },
            type: 'debit'
        })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean() as any[];

        // Obter os Clerk IDs dos envolvidos de ambas as fontes
        const clerkIds = Array.from(new Set([
            ...rawTransactions.map(tx => tx.userId),
            ...rawMicroTransactions.map(tx => tx.userId)
        ])).filter(Boolean) as string[];

        const usersList = await User.find({ clerkId: { $in: clerkIds } })
            .select('clerkId name username')
            .lean();

        const mappedTransactions = rawTransactions.map(tx => {
            const relatedUser = usersList.find(u => u.clerkId === tx.userId);
            const userName = relatedUser 
                ? (relatedUser.name || `@${relatedUser.username}`) 
                : `Usuário (${tx.userId.substring(0, 8)}...)`;

            // Transações com source 'gift', 'subscription' ou 'campaign' salvam amount em centavos
            const valInReais = (tx.source === 'gift' || tx.source === 'subscription' || tx.source === 'campaign')
                ? ((tx.amount || 0) / 100)
                : (tx.amount || 0);

            // Mapeia o tipo amigável
            let typeLabel = 'Movimentação';
            if (tx.source === 'recharge') {
                typeLabel = tx.type === 'PIX' ? 'Recarga Pix' : 'Recarga Cartão';
            } else if (tx.source === 'withdrawal') {
                typeLabel = 'Saque';
            } else if (tx.source === 'gift') {
                typeLabel = 'Resgate de Cupom';
            } else if (tx.source === 'subscription') {
                typeLabel = 'Assinatura';
            } else if (tx.source === 'campaign') {
                typeLabel = 'Crédito Promocional';
            }

            // Mapeia o status amigável
            let statusLabel = 'Pendente';
            if (tx.status === 'PAID' || tx.status === 'COMPLETED' || tx.status === 'debit') {
                statusLabel = 'Aprovado';
            } else if (tx.status === 'CANCELLED') {
                statusLabel = 'Cancelado';
            }

            // Formatação do tempo
            const txDate = tx.timestamp ? new Date(tx.timestamp) : new Date();
            const diffMs = now.getTime() - txDate.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMin / 60);

            let timeAgo = txDate.toLocaleDateString('pt-BR');
            if (diffMin < 60) {
                timeAgo = diffMin <= 1 ? 'Agora mesmo' : `Há ${diffMin} min`;
            } else if (diffHrs < 24) {
                timeAgo = `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
            } else if (diffHrs < 48) {
                timeAgo = 'Ontem';
            }

            return {
                id: tx._id?.toString(),
                displayId: tx.abacatePayId || tx._id?.toString() || `TX-${Math.floor(Math.random() * 100000)}`,
                user: userName,
                userId: tx.userId,
                val: valInReais,
                type: typeLabel,
                source: tx.source,
                time: timeAgo,
                status: statusLabel,
                timestamp: txDate,
                metadata: tx.metadata
            };
        });

        const mappedMicroTransactions = rawMicroTransactions.map(tx => {
            const relatedUser = usersList.find(u => u.clerkId === tx.userId);
            const userName = relatedUser 
                ? (relatedUser.name || `@${relatedUser.username}`) 
                : `Usuário (${tx.userId.substring(0, 8)}...)`;

            // MicroTransaction sempre salva em centavos
            const valInReais = (tx.amount || 0) / 100;

            // Mapeia o tipo amigável
            let typeLabel = 'Movimentação';
            if (tx.source === 'image_unlock') {
                typeLabel = 'Desbloqueio de Mídia';
            } else if (tx.source === 'gift') {
                typeLabel = 'Mimo enviado';
            } else if (tx.source === 'message') {
                typeLabel = 'Mensagem Chat';
            } else if (tx.source === 'campaign') {
                typeLabel = 'Crédito Promocional';
            }

            // MicroTransactions na base já são consideradas de status efetivado
            const statusLabel = tx.type === 'debit' ? 'Débito' : 'Crédito';

            // Formatação do tempo
            const txDate = tx.timestamp ? new Date(tx.timestamp) : new Date();
            const diffMs = now.getTime() - txDate.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMin / 60);

            let timeAgo = txDate.toLocaleDateString('pt-BR');
            if (diffMin < 60) {
                timeAgo = diffMin <= 1 ? 'Agora mesmo' : `Há ${diffMin} min`;
            } else if (diffHrs < 24) {
                timeAgo = `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
            } else if (diffHrs < 48) {
                timeAgo = 'Ontem';
            }

            return {
                id: tx._id?.toString(),
                displayId: tx._id?.toString() || `MTX-${Math.floor(Math.random() * 100000)}`,
                user: userName,
                userId: tx.userId,
                val: valInReais,
                type: typeLabel,
                source: tx.source,
                time: timeAgo,
                status: statusLabel,
                timestamp: txDate,
                metadata: tx.metadata
            };
        });

        // Combinar ambas as coleções e ordernar por data decrescente
        const combinedTransactions = [...mappedTransactions, ...mappedMicroTransactions]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Buscar taxas de plataforma para microtransações no dashboard
        const messageIds = combinedTransactions
            .filter(tx => ['image_unlock', 'gift', 'message'].includes(tx.source))
            .map(tx => tx.metadata?.messageId)
            .filter(Boolean);

        const platformFees = messageIds.length > 0
            ? await MicroTransaction.find({
                'metadata.messageId': { $in: messageIds },
                type: 'platform_fee'
              }).lean()
            : [];

        const feeMap = new Map<string, number>();
        for (const feeTx of platformFees) {
            if (feeTx.metadata?.messageId) {
                feeMap.set(feeTx.metadata.messageId, feeTx.amount || 0);
            }
        }

        const enrichedCombinedTransactions = combinedTransactions.map(tx => {
            let fee = 0;
            let net = tx.val;

            if (['image_unlock', 'gift', 'message'].includes(tx.source)) {
                const messageId = tx.metadata?.messageId;
                const feeCents = messageId ? (feeMap.get(messageId) || 0) : 0;
                fee = feeCents / 100;
                net = tx.val - fee;
            } else if (tx.source === 'subscription') {
                const feeCents = tx.metadata?.platformFee || 0;
                fee = feeCents / 100;
                net = tx.val - fee;
            }

            const { metadata, ...rest } = tx;
            return {
                ...rest,
                fee,
                net
            };
        });

        // 3. Responder
        return NextResponse.json({
            period,
            metrics: {
                users: {
                    value: totalUsers.toLocaleString('pt-BR'),
                    change: period !== 'none' ? usersChange : null,
                    isPositive: isUsersPositive
                },
                activeChats: {
                    value: activeChats.toString(),
                    change: period !== 'none' ? chatsChange : null,
                    isPositive: isChatsPositive
                },
                messages: {
                    value: totalMessages.toLocaleString('pt-BR'),
                    change: period !== 'none' ? messagesChange : null,
                    isPositive: isMessagesPositive
                },
                revenue: {
                    value: totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    change: period !== 'none' ? revenueChange : null,
                    isPositive: isRevenuePositive
                }
            },
            activityData,
            recentTransactions: enrichedCombinedTransactions,
        });

    } catch (error: any) {
        console.error('Erro na API de estatísticas da Dashboard:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
