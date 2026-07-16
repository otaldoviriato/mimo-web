import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { WithdrawRequest } from '@/models/WithdrawRequest';
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

        // 2. Obter parâmetros de filtragem de data (Mês e Ano)
        const searchParams = request.nextUrl.searchParams;
        const monthParam = parseInt(searchParams.get('month') || '', 10);
        const yearParam = parseInt(searchParams.get('year') || '', 10);

        const now = new Date();
        const targetMonth = !isNaN(monthParam) ? monthParam - 1 : now.getMonth(); // 0-indexed no JS Date
        const targetYear = !isNaN(yearParam) ? yearParam : now.getFullYear();

        // Calcular intervalos do mês selecionado
        const startDate = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
        const endDate = new Date(targetYear, targetMonth + 1, 1, 0, 0, 0, 0);

        // 3. Buscar e atualizar o último acesso financeiro do administrador
        let prevViewedAt: Date | null = null;
        const adminUser = await User.findOne({ clerkId: userId });
        if (adminUser) {
            prevViewedAt = adminUser.financialLastViewedAt || null;
            adminUser.financialLastViewedAt = new Date();
            await adminUser.save();
        }

        // 4. Totais Consolidados do Mês Selecionado

        // Faturamento total do mês (soma de todas as recargas pagas, salvas em reais)
        const totalRevenueResult = await Transaction.aggregate([
            { $match: { source: 'recharge', status: 'PAID', timestamp: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

        // Total Taxas de Microtransações do mês (platform_fee, salvas em centavos)
        const totalMicroFeeResult = await MicroTransaction.aggregate([
            { $match: { type: 'platform_fee', timestamp: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalMicroFee = totalMicroFeeResult.length > 0 ? (totalMicroFeeResult[0].total / 100) : 0;

        // Total Taxas de Assinaturas do mês (metadata.platformFee, salvas em centavos)
        const totalSubFeeResult = await Transaction.aggregate([
            { 
                $match: { 
                    source: 'subscription', 
                    type: 'debit', 
                    timestamp: { $gte: startDate, $lt: endDate } 
                } 
            },
            { $group: { _id: null, total: { $sum: '$metadata.platformFee' } } }
        ]);
        const totalSubFee = totalSubFeeResult.length > 0 ? (totalSubFeeResult[0].total / 100) : 0;

        const totalPlatformFee = totalMicroFee + totalSubFee;

        // Total Saques Concluídos no mês (status: 'concluido', salvos em centavos)
        const totalWithdrawPaidResult = await WithdrawRequest.aggregate([
            { $match: { status: 'concluido', createdAt: { $gte: startDate, $lt: endDate } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawPaid = totalWithdrawPaidResult.length > 0 ? (totalWithdrawPaidResult[0].total / 100) : 0;

        // Total Saques Pendentes no mês (status: 'pendente' ou 'processando', salvos em centavos)
        const totalWithdrawPendingResult = await WithdrawRequest.aggregate([
            { 
                $match: { 
                    status: { $in: ['pendente', 'processando'] }, 
                    createdAt: { $gte: startDate, $lt: endDate } 
                } 
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawPending = totalWithdrawPendingResult.length > 0 ? (totalWithdrawPendingResult[0].total / 100) : 0;

        // 5. Série Histórica Diária do Mês Inteiro (Agrupado por Dia do Mês)
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

        // Agregação de faturamento bruto diário
        const rechargeAgg = await Transaction.aggregate([
            { 
                $match: { 
                    source: 'recharge', 
                    status: 'PAID', 
                    timestamp: { $gte: startDate, $lt: endDate } 
                } 
            },
            {
                $group: {
                    _id: { $dayOfMonth: '$timestamp' },
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const rechargeMap = new Map(rechargeAgg.map(item => [item._id, item.total]));

        // Agregação de taxas de microtransações diárias
        const microFeeAgg = await MicroTransaction.aggregate([
            { 
                $match: { 
                    type: 'platform_fee', 
                    timestamp: { $gte: startDate, $lt: endDate } 
                } 
            },
            {
                $group: {
                    _id: { $dayOfMonth: '$timestamp' },
                    total: { $sum: '$amount' }
                }
            }
        ]);
        const microFeeMap = new Map(microFeeAgg.map(item => [item._id, item.total / 100]));

        // Agregação de taxas de assinaturas diárias
        const subFeeAgg = await Transaction.aggregate([
            { 
                $match: { 
                    source: 'subscription', 
                    type: 'debit', 
                    timestamp: { $gte: startDate, $lt: endDate } 
                } 
            },
            {
                $group: {
                    _id: { $dayOfMonth: '$timestamp' },
                    total: { $sum: '$metadata.platformFee' }
                }
            }
        ]);
        const subFeeMap = new Map(subFeeAgg.map(item => [item._id, item.total / 100]));

        // Montar a série temporal completa para o mês
        const chartData = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const revenue = rechargeMap.get(day) || 0;
            const mFee = microFeeMap.get(day) || 0;
            const sFee = subFeeMap.get(day) || 0;
            const fee = mFee + sFee;

            chartData.push({
                label: String(day).padStart(2, '0'),
                revenue,
                fee,
            });
        }

        return NextResponse.json({
            lastViewedAt: prevViewedAt,
            stats: {
                totalRevenue,
                totalPlatformFee,
                totalWithdrawPaid,
                totalWithdrawPending,
            },
            chartData,
        });

    } catch (error: any) {
        console.error('Erro na API de estatísticas financeiras:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
