import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Message } from '@/models/Message';
import { MicroTransaction } from '@/models/MicroTransaction';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';

export const dynamic = 'force-dynamic';

type StatementEntry = {
    id: string;
    kind: 'message' | 'media_unlock' | 'gift' | 'subscription' | 'adjustment';
    title: string;
    description: string;
    amount: number;
    timestamp: Date;
    relatedUserId?: string;
    clientPhotoUrl?: string | null;
};

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        await connectToDatabase();

        const [user, withdrawals, paidMessages, microCredits, subscriptions] = await Promise.all([
            User.findOne({ clerkId: userId }).select('balance professionalAvailableCents isProfessional').lean(),
            WithdrawRequest.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
            Message.find({
                $or: [
                    { receiverId: userId, billingEngineVersion: 'marketplace_v3' },
                    { senderId: userId, billingEngineVersion: 'marketplace_v4', billingStatus: 'paid' },
                ],
                receiverEarnings: { $gt: 0 },
                isSystem: { $ne: true },
            }).select('_id senderId receiverId receiverEarnings timestamp settledAt createdAt isAudio billingEngineVersion').sort({ timestamp: -1 }).limit(500).lean(),
            MicroTransaction.find({
                userId,
                type: 'credit',
                source: { $in: ['message', 'image_unlock', 'gift'] },
            }).sort({ timestamp: -1 }).limit(500).lean(),
            Transaction.find({ userId, type: 'credit', source: 'subscription', status: 'COMPLETED' })
                .sort({ timestamp: -1 }).limit(200).lean(),
        ]);

        if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

        const relatedIds = Array.from(new Set([
            ...paidMessages.map(message => message.senderId === userId ? message.receiverId : message.senderId),
            ...microCredits.map(transaction => transaction.relatedUserId).filter(Boolean),
            ...subscriptions.map(transaction => transaction.relatedUserId).filter(Boolean),
        ])) as string[];
        const clients = await User.find({ clerkId: { $in: relatedIds } }).select('clerkId name username photoUrl').lean();
        const clientMap = new Map(clients.map(client => [client.clerkId, client]));
        const entries: StatementEntry[] = [];

        for (const message of paidMessages) {
            const clientId = message.senderId === userId ? message.receiverId : message.senderId;
            const client = clientMap.get(clientId);
            entries.push({
                id: `message_${message._id}`,
                kind: 'message',
                title: `Mensagem de ${client?.name || client?.username || 'Cliente Mimo'}`,
                description: message.billingEngineVersion === 'marketplace_v4' ? 'Mensagem enviada e paga pelo cliente' : 'Mensagem recebida e creditada imediatamente',
                amount: Number(message.receiverEarnings) || 0,
                timestamp: new Date(message.settledAt || message.timestamp || (message as typeof message & { createdAt: Date }).createdAt),
                relatedUserId: clientId,
                clientPhotoUrl: client?.photoUrl || null,
            });
        }

        for (const transaction of microCredits) {
            const client = transaction.relatedUserId ? clientMap.get(transaction.relatedUserId) : undefined;
            const source = transaction.source as 'message' | 'image_unlock' | 'gift';
            entries.push({
                id: `legacy_${transaction._id}`,
                kind: source === 'image_unlock' ? 'media_unlock' : source,
                title: source === 'gift'
                    ? `${client?.name || 'Um cliente'} enviou um presente`
                    : source === 'image_unlock'
                        ? `${client?.name || 'Um cliente'} desbloqueou um Mimo seu`
                        : `Mensagem de ${client?.name || client?.username || 'Cliente Mimo'}`,
                description: source === 'message' ? 'Crédito de mensagem anterior à migração' : 'Valor creditado no saldo',
                amount: Number(transaction.amount) || 0,
                timestamp: new Date(transaction.timestamp || transaction.createdAt),
                relatedUserId: transaction.relatedUserId,
                clientPhotoUrl: client?.photoUrl || null,
            });
        }

        for (const transaction of subscriptions) {
            const client = transaction.relatedUserId ? clientMap.get(transaction.relatedUserId) : undefined;
            entries.push({
                id: `subscription_${transaction._id}`,
                kind: 'subscription',
                title: `${client?.name || 'Um cliente'} assinou seu perfil`,
                description: 'Crédito de assinatura',
                amount: Number(transaction.amount) || 0,
                timestamp: new Date(transaction.timestamp || transaction.createdAt),
                relatedUserId: transaction.relatedUserId,
                clientPhotoUrl: client?.photoUrl || null,
            });
        }

        const balance = Number(user.isProfessional ? (user.professionalAvailableCents ?? user.balance) : user.balance) || 0;
        const totalWithdrawn = withdrawals.filter(item => item.status === 'concluido').reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const listedEarnings = entries.reduce((sum, entry) => sum + entry.amount, 0);
        const adjustment = balance + totalWithdrawn - listedEarnings;
        if (adjustment !== 0) entries.push({ id: 'historical_adjustment', kind: 'adjustment', title: 'Saldo anterior e outros ajustes', description: 'Conciliação de operações históricas sem vínculo individual disponível', amount: adjustment, timestamp: new Date(0) });
        entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return NextResponse.json({
            balance,
            totalWithdrawn,
            totalEarnings: entries.reduce((sum, entry) => sum + entry.amount, 0),
            entries,
            withdrawals: withdrawals.map(item => ({ id: item._id.toString(), amount: Number(item.amount) || 0, fee: Number(item.fee) || 0, netAmount: Number(item.netAmount ?? item.amount) || 0, status: item.status, timestamp: item.createdAt })),
        });
    } catch (error) {
        console.error('Erro ao gerar extrato da carteira:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
