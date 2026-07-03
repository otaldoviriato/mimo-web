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

        // 2. Obter parâmetros de paginação e filtragem
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const typeFilter = searchParams.get('type') || 'all';

        const offset = (page - 1) * limit;
        const maxFetch = page * limit;
        
        let allTransactions: any[] = [];
        let totalItems = 0;

        // Definição dos tipos e buscas
        if (typeFilter === 'recharge') {
            // Depósitos
            const query = { source: 'recharge' };
            totalItems = await Transaction.countDocuments(query);
            const raw = await Transaction.find(query)
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit)
                .lean();
            allTransactions = raw.map(tx => mapTransaction(tx));

        } else if (typeFilter === 'withdrawal') {
            // Saques (WithdrawRequest + Transactions de saque não associadas)
            const withdrawalsRaw = await WithdrawRequest.find().sort({ createdAt: -1 }).lean();
            const transactionsRaw = await Transaction.find({ 
                source: 'withdrawal', 
                'metadata.withdrawRequestId': { $exists: false } 
            }).sort({ timestamp: -1 }).lean();

            const mappedWithdrawals = withdrawalsRaw.map(w => mapWithdrawRequest(w));
            const mappedTransactions = transactionsRaw.map(tx => mapTransaction(tx));

            const combined = [...mappedWithdrawals, ...mappedTransactions]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            totalItems = combined.length;
            allTransactions = combined.slice(offset, offset + limit);

        } else if (typeFilter === 'subscription') {
            // Assinaturas
            const query = { source: 'subscription', type: 'debit' };
            totalItems = await Transaction.countDocuments(query);
            const raw = await Transaction.find(query)
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit)
                .lean();
            allTransactions = raw.map(tx => mapTransaction(tx));

        } else if (typeFilter === 'image_unlock') {
            // Desbloqueios de mídia
            const query = { source: 'image_unlock', type: 'debit' };
            totalItems = await MicroTransaction.countDocuments(query);
            const raw = await MicroTransaction.find(query)
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit)
                .lean();
            allTransactions = raw.map(tx => mapMicroTransaction(tx));

        } else if (typeFilter === 'gift') {
            // Mimos / Cupons
            const queryMicro = { source: 'gift', type: 'debit' };
            const queryTx = { source: 'gift' };

            const microRaw = await MicroTransaction.find(queryMicro).sort({ timestamp: -1 }).lean();
            const txRaw = await Transaction.find(queryTx).sort({ timestamp: -1 }).lean();

            const combined = [...microRaw.map(tx => mapMicroTransaction(tx)), ...txRaw.map(tx => mapTransaction(tx))]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            totalItems = combined.length;
            allTransactions = combined.slice(offset, offset + limit);

        } else if (typeFilter === 'message') {
            // Mensagens
            const query = { source: 'message', type: 'debit' };
            totalItems = await MicroTransaction.countDocuments(query);
            const raw = await MicroTransaction.find(query)
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(limit)
                .lean();
            allTransactions = raw.map(tx => mapMicroTransaction(tx));

        } else {
            // 'all' - Combinado
            const txQuery = { 
                type: { $ne: 'promotional_credit_usage' },
                $or: [
                    { source: { $ne: 'withdrawal' } },
                    { 'metadata.withdrawRequestId': { $exists: false } }
                ],
                $and: [
                    { $or: [
                        { source: { $ne: 'subscription' } },
                        { type: 'debit' }
                    ]}
                ]
            };
            const mtxQuery = { 
                source: { $in: ['image_unlock', 'gift', 'message'] },
                type: 'debit' 
            };

            const countTx = await Transaction.countDocuments(txQuery);
            const countMtx = await MicroTransaction.countDocuments(mtxQuery);
            const countWr = await WithdrawRequest.countDocuments();
            totalItems = countTx + countMtx + countWr;

            const txs = await Transaction.find(txQuery).sort({ timestamp: -1 }).limit(maxFetch).lean();
            const mtxs = await MicroTransaction.find(mtxQuery).sort({ timestamp: -1 }).limit(maxFetch).lean();
            const wrs = await WithdrawRequest.find().sort({ createdAt: -1 }).limit(maxFetch).lean();

            const combined = [
                ...txs.map(t => mapTransaction(t)),
                ...mtxs.map(m => mapMicroTransaction(m)),
                ...wrs.map(w => mapWithdrawRequest(w))
            ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            allTransactions = combined.slice(offset, offset + limit);
        }

        // 3. Buscar taxas de plataforma para microtransações selecionadas nesta página
        const messageIds = allTransactions
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

        // 4. Fazer enrich de nomes de usuários baseados nos Clerk IDs (remetente e destinatário)
        const clerkIds = Array.from(new Set([
            ...allTransactions.map(tx => tx.senderId),
            ...allTransactions.map(tx => tx.receiverId)
        ])).filter(id => id && id !== 'platform') as string[];

        const usersList = await User.find({ clerkId: { $in: clerkIds } })
            .select('clerkId name username')
            .lean();

        // Mapear os nomes corretos para remetente (sender) e destinatário (receiver)
        const enrichedTransactions = allTransactions.map(tx => {
            let senderName = 'MimoChat';
            let receiverName = 'MimoChat';

            if (tx.senderId === 'platform') {
                senderName = 'MimoChat';
            } else if (tx.senderId) {
                const u = usersList.find(usr => usr.clerkId === tx.senderId);
                senderName = u ? (u.name || `@${u.username}`) : `Usuário (${tx.senderId.substring(0, 8)})`;
            }

            if (tx.receiverId === 'platform') {
                receiverName = 'MimoChat';
            } else if (tx.receiverId) {
                const u = usersList.find(usr => usr.clerkId === tx.receiverId);
                receiverName = u ? (u.name || `@${u.username}`) : `Usuário (${tx.receiverId.substring(0, 8)})`;
            }

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

            // Remove metadata
            const { metadata, ...rest } = tx;

            return {
                ...rest,
                senderName,
                receiverName,
                fee,
                net
            };
        });

        const totalPages = Math.ceil(totalItems / limit);

        return NextResponse.json({
            transactions: enrichedTransactions,
            pagination: {
                page,
                limit,
                totalPages,
                totalItems
            }
        });

    } catch (error: any) {
        console.error('Erro na API de transações financeiras paginadas:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// Funções Auxiliares de Mapeamento

function mapTransaction(tx: any) {
    const valInReais = (tx.source === 'gift' || tx.source === 'subscription' || tx.source === 'campaign')
        ? ((tx.amount || 0) / 100)
        : (tx.amount || 0);

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

    let statusLabel = 'Pendente';
    if (tx.status === 'PAID' || tx.status === 'COMPLETED' || tx.status === 'debit') {
        statusLabel = 'Aprovado';
    } else if (tx.status === 'CANCELLED') {
        statusLabel = 'Cancelado';
    }

    const txDate = tx.timestamp ? new Date(tx.timestamp) : new Date();

    // Determinar remetente (senderId) e destinatário (receiverId)
    let senderId = null;
    let receiverId = null;

    if (tx.source === 'recharge') {
        senderId = tx.userId;
        receiverId = 'platform';
    } else if (tx.source === 'withdrawal') {
        senderId = 'platform';
        receiverId = tx.userId;
    } else {
        if (tx.type === 'debit' || tx.status === 'debit') {
            senderId = tx.userId;
            receiverId = tx.relatedUserId || null;
        } else {
            senderId = tx.relatedUserId || null;
            receiverId = tx.userId;
        }
    }

    return {
        id: tx._id?.toString(),
        displayId: tx.abacatePayId || tx._id?.toString() || `TX-${Math.floor(Math.random() * 100000)}`,
        userId: tx.userId,
        senderId,
        receiverId,
        val: valInReais,
        type: typeLabel,
        source: tx.source,
        time: formatTimeAgo(txDate),
        status: statusLabel,
        timestamp: txDate,
        isWithdrawRequest: false,
        metadata: tx.metadata
    };
}

function mapMicroTransaction(tx: any) {
    const valInReais = (tx.amount || 0) / 100;

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

    const statusLabel = tx.type === 'debit' ? 'Débito' : 'Crédito';
    const txDate = tx.timestamp ? new Date(tx.timestamp) : new Date();

    // Determinar remetente (senderId) e destinatário (receiverId)
    let senderId = null;
    let receiverId = null;

    if (tx.type === 'debit') {
        senderId = tx.userId;
        receiverId = tx.relatedUserId || null;
    } else {
        senderId = tx.relatedUserId || null;
        receiverId = tx.userId;
    }

    return {
        id: tx._id?.toString(),
        displayId: tx._id?.toString() || `MTX-${Math.floor(Math.random() * 100000)}`,
        userId: tx.userId,
        senderId,
        receiverId,
        val: valInReais,
        type: typeLabel,
        source: tx.source,
        time: formatTimeAgo(txDate),
        status: statusLabel,
        timestamp: txDate,
        isWithdrawRequest: false,
        metadata: tx.metadata
    };
}

function mapWithdrawRequest(w: any) {
    const valInReais = w.amount / 100;
    const txDate = w.createdAt ? new Date(w.createdAt) : new Date();

    let statusLabel = 'Pendente';
    if (w.status === 'concluido') {
        statusLabel = 'Pago';
    } else if (w.status === 'processando') {
        statusLabel = 'Processando (Asaas)';
    } else if (w.status === 'rejeitado') {
        statusLabel = 'Rejeitado';
    }

    return {
        id: w._id.toString(),
        displayId: `SAQUE-${w._id.toString().substring(18).toUpperCase()}`,
        userId: w.userId,
        senderId: 'platform',
        receiverId: w.userId,
        val: valInReais,
        type: 'Saque',
        source: 'withdrawal',
        time: formatTimeAgo(txDate),
        status: statusLabel,
        timestamp: txDate,
        isWithdrawRequest: true,
        pixKey: w.pixKey,
        hiddenFromUser: w.hiddenFromUser === true
    };
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);

    if (diffMin < 60) {
        return diffMin <= 1 ? 'Agora mesmo' : `Há ${diffMin} min`;
    } else if (diffHrs < 24) {
        return `Há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
    } else if (diffHrs < 48) {
        return 'Ontem';
    } else {
        return date.toLocaleDateString('pt-BR');
    }
}
