import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { buildEarningsSessionBlocks } from '@/lib/earningsSessions';
import { AppSettings } from '@/models/AppSettings';
import { Message } from '@/models/Message';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';

export const dynamic = 'force-dynamic';

type StatementEntry = {
    id: string;
    kind: 'conversation' | 'other_earnings' | 'media_unlock' | 'gift' | 'subscription' | 'adjustment';
    title: string;
    description: string;
    amount: number;
    timestamp: Date;
    status: 'open' | 'closed';
    relatedUserId?: string;
    clientName?: string;
    clientUsername?: string;
    clientPhotoUrl?: string | null;
    details?: Record<string, number>;
};

const shortDate = (date: Date) => date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
});

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

        await connectToDatabase();

        const [user, settings, withdrawals] = await Promise.all([
            User.findOne({ clerkId: userId }).select('balance').lean(),
            AppSettings.findOne({ key: 'global' }).lean(),
            WithdrawRequest.find({ userId })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean(),
        ]);

        if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

        const timeoutMinutes = settings?.earningsSessionInactivityMinutes ?? 120;
        const minimumEarningsCents = settings?.earningsSessionMinimumCents ?? 1000;
        const [microTransactions, subscriptionTransactions, messages] = await Promise.all([
            MicroTransaction.find({
                userId,
                type: 'credit',
                source: { $in: ['message', 'image_unlock', 'gift'] },
            }).sort({ timestamp: 1 }).lean(),
            Transaction.find({
                userId,
                type: 'credit',
                source: 'subscription',
                status: 'COMPLETED',
            }).sort({ timestamp: 1 }).lean(),
            Message.find({
                isSystem: { $ne: true },
                $or: [{ senderId: userId }, { receiverId: userId }],
            })
                .select('_id roomId senderId receiverId isGift isLockedImage isVideo timestamp createdAt')
                .sort({ timestamp: 1 })
                .lean(),
        ]);

        const relatedUserIds = Array.from(new Set([
            ...microTransactions.map(transaction => transaction.relatedUserId).filter(Boolean),
            ...subscriptionTransactions.map(transaction => transaction.relatedUserId).filter(Boolean),
        ])) as string[];
        const clients = await User.find({ clerkId: { $in: relatedUserIds } })
            .select('clerkId name username photoUrl')
            .lean();
        const clientMap = new Map(clients.map(client => [client.clerkId, {
            name: client.name || client.username || 'Cliente Mimo',
            username: client.username || 'cliente',
            photoUrl: client.photoUrl || null,
        }]));

        const normalizedMicro = microTransactions.map(transaction => ({
            id: transaction._id.toString(),
            amount: Number(transaction.amount) || 0,
            source: transaction.source as 'message' | 'image_unlock' | 'gift',
            relatedUserId: transaction.relatedUserId,
            timestamp: transaction.timestamp || transaction.createdAt,
            messageId: transaction.messageId?.toString() || transaction.metadata?.messageId?.toString(),
        }));
        const microById = new Map(normalizedMicro.map(transaction => [transaction.id, transaction]));
        const blocks = buildEarningsSessionBlocks(
            userId,
            messages.map(message => ({
                id: message._id.toString(),
                roomId: message.roomId,
                senderId: message.senderId,
                receiverId: message.receiverId,
                timestamp: message.timestamp || (message as typeof message & { createdAt: Date }).createdAt,
                isGift: message.isGift,
                isLockedImage: message.isLockedImage,
                isVideo: message.isVideo,
            })),
            normalizedMicro,
            timeoutMinutes,
            false,
        );

        const now = new Date();
        const consumedTransactionIds = new Set<string>();
        const entries: StatementEntry[] = [];
        const smallEarnings: Array<{ id: string; amount: number; timestamp: Date }> = [];

        for (const block of blocks) {
            if (block.totalEarnings <= 0) continue;
            const closesAt = new Date(block.endTime.getTime() + timeoutMinutes * 60_000);
            const isOpen = now < closesAt;
            const qualifies = block.totalEarnings >= minimumEarningsCents;

            if (isOpen || qualifies) {
                block.transactionIds.forEach(id => consumedTransactionIds.add(id));
                const client = clientMap.get(block.relatedUserId);
                entries.push({
                    id: block.sessionId,
                    kind: 'conversation',
                    title: `Conversa com ${client?.name || 'Cliente Mimo'}`,
                    description: isOpen
                        ? 'O valor pode aumentar enquanto a conversa continuar.'
                        : `${block.messagesCount} mensagens nesta conversa.`,
                    amount: block.totalEarnings,
                    timestamp: block.endTime,
                    status: isOpen ? 'open' : 'closed',
                    relatedUserId: block.relatedUserId,
                    clientName: client?.name,
                    clientUsername: client?.username,
                    clientPhotoUrl: client?.photoUrl,
                    details: {
                        messages: block.messagesCount,
                        professionalMessages: block.professionalMessages,
                        clientMessages: block.clientMessages,
                        media: block.mediaCount,
                        gifts: block.giftCount,
                    },
                });
                continue;
            }

            for (const transactionId of block.transactionIds) {
                const transaction = microById.get(transactionId);
                if (!transaction) continue;
                consumedTransactionIds.add(transactionId);
                smallEarnings.push({ id: transactionId, amount: transaction.amount, timestamp: block.endTime });
            }
        }

        for (const transaction of normalizedMicro) {
            if (consumedTransactionIds.has(transaction.id)) continue;
            const timestamp = new Date(transaction.timestamp);
            const client = transaction.relatedUserId ? clientMap.get(transaction.relatedUserId) : undefined;

            if (transaction.source === 'image_unlock' || transaction.source === 'gift') {
                entries.push({
                    id: transaction.id,
                    kind: transaction.source === 'gift' ? 'gift' : 'media_unlock',
                    title: transaction.source === 'gift'
                        ? `${client?.name || 'Um cliente'} enviou um presente`
                        : `${client?.name || 'Um cliente'} desbloqueou um Mimo seu`,
                    description: transaction.source === 'gift' ? 'Presente recebido' : 'Desbloqueio realizado após a conversa.',
                    amount: transaction.amount,
                    timestamp,
                    status: 'closed',
                    relatedUserId: transaction.relatedUserId,
                    clientName: client?.name,
                    clientUsername: client?.username,
                    clientPhotoUrl: client?.photoUrl,
                });
            } else {
                smallEarnings.push({ id: transaction.id, amount: transaction.amount, timestamp });
            }
        }

        smallEarnings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const otherBatches: Array<{ amount: number; items: typeof smallEarnings; isOpen: boolean }> = [];
        let currentBatch: typeof smallEarnings = [];
        let currentAmount = 0;

        for (const earning of smallEarnings) {
            currentBatch.push(earning);
            currentAmount += earning.amount;
            if (currentAmount >= minimumEarningsCents) {
                otherBatches.push({ amount: currentAmount, items: currentBatch, isOpen: false });
                currentBatch = [];
                currentAmount = 0;
            }
        }
        if (currentBatch.length > 0) {
            otherBatches.push({ amount: currentAmount, items: currentBatch, isOpen: true });
        }

        for (const batch of otherBatches) {
            const first = batch.items[0];
            const last = batch.items[batch.items.length - 1];
            const startLabel = shortDate(first.timestamp);
            const endLabel = shortDate(last.timestamp);
            const rangeLabel = startLabel === endLabel ? startLabel : `${startLabel} a ${endLabel}`;
            entries.push({
                id: `other_${first.id}_${last.id}`,
                kind: 'other_earnings',
                title: `Outros ganhos de ${rangeLabel}`,
                description: batch.isOpen
                    ? `${batch.items.length} ${batch.items.length === 1 ? 'crédito acumulado' : 'créditos acumulados'} até atingir ${minimumEarningsCents / 100} reais.`
                    : `${batch.items.length} ${batch.items.length === 1 ? 'crédito de pequena conversa' : 'créditos de pequenas conversas'}`,
                amount: batch.amount,
                timestamp: last.timestamp,
                status: batch.isOpen ? 'open' : 'closed',
                details: { credits: batch.items.length },
            });
        }

        for (const transaction of subscriptionTransactions) {
            const client = transaction.relatedUserId ? clientMap.get(transaction.relatedUserId) : undefined;
            entries.push({
                id: transaction._id.toString(),
                kind: 'subscription',
                title: `${client?.name || 'Um cliente'} assinou seu perfil`,
                description: 'Crédito de assinatura',
                amount: Number(transaction.amount) || 0,
                timestamp: new Date(transaction.timestamp || transaction.createdAt),
                status: 'closed',
                relatedUserId: transaction.relatedUserId,
                clientName: client?.name,
                clientUsername: client?.username,
                clientPhotoUrl: client?.photoUrl,
            });
        }

        const explainedEarnings = entries.reduce((sum, entry) => sum + entry.amount, 0);
        const balance = Number(user.balance) || 0;
        const totalWithdrawn = withdrawals
            .filter(withdrawal => withdrawal.status === 'concluido')
            .reduce((sum, withdrawal) => sum + (Number(withdrawal.amount) || 0), 0);
        const reconciliationDifference = balance + totalWithdrawn - explainedEarnings;
        if (reconciliationDifference !== 0) {
            entries.push({
                id: 'historical_balance_adjustment',
                kind: 'adjustment',
                title: reconciliationDifference > 0 ? 'Outros créditos e ajustes' : 'Ajustes de saldo',
                description: 'Diferença conciliatória de operações que não possuem vínculo com uma conversa.',
                amount: reconciliationDifference,
                timestamp: now,
                status: 'closed',
            });
        }

        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const openEarnings = entries.filter(entry => entry.status === 'open').reduce((sum, entry) => sum + entry.amount, 0);
        const closedEarnings = entries.filter(entry => entry.status === 'closed').reduce((sum, entry) => sum + entry.amount, 0);
        const totalEarnings = openEarnings + closedEarnings;

        return NextResponse.json({
            balance,
            totalWithdrawn,
            entries,
            openEarnings,
            closedEarnings,
            totalEarnings,
            explainedBalance: totalEarnings - totalWithdrawn,
            reconciliationDifference: balance - (totalEarnings - totalWithdrawn),
            timeoutMinutes,
            minimumEarningsCents,
            withdrawals: withdrawals.map(withdrawal => ({
                id: withdrawal._id.toString(),
                amount: Number(withdrawal.amount) || 0,
                fee: Number(withdrawal.fee) || 0,
                netAmount: Number(withdrawal.netAmount ?? withdrawal.amount) || 0,
                status: withdrawal.status,
                timestamp: withdrawal.createdAt,
            })),
        });
    } catch (error) {
        console.error('Erro ao gerar extrato conciliável da carteira:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
