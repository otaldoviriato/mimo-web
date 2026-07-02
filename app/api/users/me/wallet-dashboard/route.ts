import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Transaction } from '@/models/Transaction';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.isProfessional) {
            // Retorna dados simplificados ou zerados se não for criadora profissional
            return NextResponse.json({
                balance: user.balance,
                totalWithdrawn: 0,
                pendingWithdrawal: null,
                projectedMonthlyRecurring: 0,
                earningsByCategory: {
                    subscription: 0,
                    message: 0,
                    image_unlock: 0,
                    gift: 0
                },
                earningsEvolution: [],
                topCustomers: [],
                totalMessageEarnings: 0,
                totalMessagesCount: 0,
                averageEarningPerMessage: 0,
                totalImageUnlocksCount: 0,
                totalImageUnlockEarnings: 0,
                monthlyMessageEarnings: 0,
                monthlyMessagesCount: 0,
                monthlyAverageEarningPerMessage: 0,
                monthlyImageUnlockEarnings: 0,
                monthlyImageUnlocksCount: 0,
                monthlyWithdrawalsCount: 0
            });
        }

        // 1. Saldo disponível
        const balance = user.balance; // em centavos

        // 2. Saque pendente
        const pendingWithdrawal = await WithdrawRequest.findOne({
            userId: user.clerkId,
            status: { $in: ['pendente', 'processando'] },
        }).sort({ createdAt: -1 }).lean();

        // 3. Total sacado (concluído)
        const completedWithdrawals = await WithdrawRequest.find({
            userId: user.clerkId,
            status: 'concluido',
        });
        const totalWithdrawn = completedWithdrawals.reduce((sum, req: any) => sum + (req.netAmount !== undefined ? req.netAmount : req.amount), 0);

        // 3.5 Contagem de saques realizados no mês atual (para verificação de limite gratuito)
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyWithdrawalsCount = await WithdrawRequest.countDocuments({
            userId: user.clerkId,
            status: { $ne: 'rejeitado' },
            createdAt: { $gte: startOfCurrentMonth }
        });

        // 4. Ganhos recorrentes mensais previstos (em centavos)
        // quantidade de assinantes * valor da assinatura (que está em reais) * 100
        const subscribersCount = user.subscribers?.length ?? 0;
        const subscriptionPriceReais = user.subscriptionPrice ?? 0;
        const projectedMonthlyRecurring = subscribersCount * subscriptionPriceReais * 100;

        // 5. Ganhos por categoria (aggregation no MicroTransaction)
        const categoryEarningsResult = await MicroTransaction.aggregate([
            { $match: { userId: user.clerkId, type: 'credit' } },
            { $group: { _id: '$source', total: { $sum: '$amount' } } }
        ]);

        // Assinaturas são registradas na coleção Transaction (em reais). Somamos os créditos e multiplicamos por 100 para ter em centavos.
        const subscriptionEarningsResult = await Transaction.aggregate([
            { $match: { userId: user.clerkId, type: 'credit', source: 'subscription', status: 'COMPLETED' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const subscriptionEarnings = Math.round((subscriptionEarningsResult[0]?.total || 0) * 100);

        const earningsByCategory = {
            subscription: subscriptionEarnings,
            message: 0,
            image_unlock: 0,
            gift: 0
        };

        categoryEarningsResult.forEach((item) => {
            if (item._id in earningsByCategory) {
                earningsByCategory[item._id as keyof typeof earningsByCategory] = item.total;
            }
        });

        // Cálculo de estatísticas de mensagens pagas (Prioridade do aplicativo)
        const messageStatsResult = await MicroTransaction.aggregate([
            { $match: { userId: user.clerkId, type: 'credit', source: 'message' } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalMessageEarnings = messageStatsResult[0]?.totalAmount ?? 0;
        const totalMessagesCount = messageStatsResult[0]?.count ?? 0;
        const averageEarningPerMessage = totalMessagesCount > 0 ? Math.round(totalMessageEarnings / totalMessagesCount) : 0;

        // Cálculo de estatísticas de mídias privadas desbloqueadas (Foco de monetização)
        const mediaStatsResult = await MicroTransaction.aggregate([
            { $match: { userId: user.clerkId, type: 'credit', source: 'image_unlock' } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalImageUnlockEarnings = mediaStatsResult[0]?.totalAmount ?? 0;
        const totalImageUnlocksCount = mediaStatsResult[0]?.count ?? 0;

        // Configuração do início do mês corrente para filtros mensais
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Estatísticas mensais de mensagens
        const monthlyMessageStatsResult = await MicroTransaction.aggregate([
            { $match: { userId: user.clerkId, type: 'credit', source: 'message', timestamp: { $gte: startOfMonth } } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const monthlyMessageEarnings = monthlyMessageStatsResult[0]?.totalAmount ?? 0;
        const monthlyMessagesCount = monthlyMessageStatsResult[0]?.count ?? 0;
        const monthlyAverageEarningPerMessage = monthlyMessagesCount > 0 ? Math.round(monthlyMessageEarnings / monthlyMessagesCount) : 0;

        // Estatísticas mensais de mídias
        const monthlyMediaStatsResult = await MicroTransaction.aggregate([
            { $match: { userId: user.clerkId, type: 'credit', source: 'image_unlock', timestamp: { $gte: startOfMonth } } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const monthlyImageUnlockEarnings = monthlyMediaStatsResult[0]?.totalAmount ?? 0;
        const monthlyImageUnlocksCount = monthlyMediaStatsResult[0]?.count ?? 0;

        // 6. Evolução diária dos ganhos nos últimos 15 dias
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        fifteenDaysAgo.setHours(0, 0, 0, 0);

        const dailyEarningsResult = await MicroTransaction.aggregate([
            {
                $match: {
                    userId: user.clerkId,
                    type: 'credit',
                    timestamp: { $gte: fifteenDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: '$timestamp' },
                        month: { $month: '$timestamp' },
                        year: { $year: '$timestamp' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        // Formata para o gráfico no frontend: [{ date: 'DD/MM', amount: 100 }]
        const dailyHistory: Array<{ date: string; amount: number }> = [];
        
        // Vamos preencher todos os 15 dias, inclusive com R$ 0 se não houver ganho, para o gráfico ficar bonito
        for (let i = 14; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayStr = String(d.getDate()).padStart(2, '0');
            const monthStr = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${dayStr}/${monthStr}`;
            
            // Procura nos resultados do mongo
            const match = dailyEarningsResult.find(
                (item) => item._id.day === d.getDate() && item._id.month === (d.getMonth() + 1)
            );
            
            dailyHistory.push({
                date: key,
                amount: match ? match.total : 0
            });
        }

        // 7. Ranking dos 5 melhores clientes (fãs)
        const topCustomersResult = await MicroTransaction.aggregate([
            {
                $match: {
                    userId: user.clerkId,
                    type: 'credit',
                    relatedUserId: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$relatedUserId',
                    totalSpent: { $sum: '$amount' }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'clerkId',
                    as: 'customerDetails'
                }
            },
            { $unwind: { path: '$customerDetails', preserveNullAndEmptyArrays: true } }
        ]);

        const topCustomers = topCustomersResult.map((item) => ({
            clerkId: item._id,
            totalSpent: item.totalSpent, // em centavos
            name: item.customerDetails?.name || 'Cliente Mimo',
            username: item.customerDetails?.username || 'cliente',
            photoUrl: item.customerDetails?.photoUrl || null
        }));

        return NextResponse.json({
            balance,
            totalWithdrawn,
            pendingWithdrawal,
            projectedMonthlyRecurring,
            earningsByCategory,
            earningsEvolution: dailyHistory,
            topCustomers,
            totalMessageEarnings,
            totalMessagesCount,
            averageEarningPerMessage,
            totalImageUnlocksCount,
            totalImageUnlockEarnings,
            monthlyMessageEarnings,
            monthlyMessagesCount,
            monthlyAverageEarningPerMessage,
            monthlyImageUnlockEarnings,
            monthlyImageUnlocksCount,
            monthlyWithdrawalsCount
        });

    } catch (error: any) {
        console.error('Error generating wallet dashboard data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
