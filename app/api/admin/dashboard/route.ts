import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Message } from '@/models/Message';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { AppSettings } from '@/models/AppSettings';
import { QualifiedConversation } from '@/models/QualifiedConversation';
import { QualificationAttempt } from '@/models/QualificationAttempt';
import { ModerationReview } from '@/models/ModerationReview';

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

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // --- CÁLCULO DE ATRIBUIÇÃO DE CLIENTES (AQUISITION / PRIMEIRA CONVERSA) ---
        // 2. Buscar todos os clientes masculinos (não profissionais)
        const maleClients = await User.find({
            isProfessional: { $ne: true }
        }).select('clerkId name username photoUrl createdAt').lean();

        const maleClientIds = maleClients.map(c => c.clerkId);
        const maleClientsMap = new Map(maleClients.map(c => [c.clerkId, c]));

        // Buscar a 1ª mensagem enviada por cada cliente masculino (min timestamp por senderId)
        let firstMessages: any[] = [];
        if (maleClientIds.length > 0) {
            firstMessages = await Message.aggregate([
                {
                    $match: {
                        senderId: { $in: maleClientIds },
                        isSystem: { $ne: true }
                    }
                },
                { $sort: { timestamp: 1 } },
                {
                    $group: {
                        _id: '$senderId',
                        receiverId: { $first: '$receiverId' },
                        firstMsgTime: { $first: '$timestamp' }
                    }
                }
            ]);
        }

        // Mapa de atribuição por profissional (clerkId -> { count, lastAttributedAt, broughtClients })
        const attributionMap = new Map<string, {
            count: number;
            lastAttributedAt: Date | null;
            broughtClients: Array<{ clerkId: string; name: string; username: string; photoUrl: string | null; date: Date }>;
        }>();

        for (const item of firstMessages) {
            const profId = item.receiverId;
            const clientObj = maleClientsMap.get(item._id);
            if (!clientObj || !profId) continue;

            if (!attributionMap.has(profId)) {
                attributionMap.set(profId, {
                    count: 0,
                    lastAttributedAt: null,
                    broughtClients: []
                });
            }

            const attr = attributionMap.get(profId)!;
            attr.count += 1;

            const msgDate = item.firstMsgTime ? new Date(item.firstMsgTime) : new Date();
            if (!attr.lastAttributedAt || msgDate > attr.lastAttributedAt) {
                attr.lastAttributedAt = msgDate;
            }

            attr.broughtClients.push({
                clerkId: clientObj.clerkId,
                name: clientObj.name || `@${clientObj.username}`,
                username: clientObj.username,
                photoUrl: clientObj.photoUrl || null,
                date: msgDate
            });
        }

        const totalBroughtClientsCount = firstMessages.length;

        // --- BUSCA E CLASSIFICAÇÃO DAS PROFISSIONAIS ---
        const onboardingCompletedFilter = {
            $or: [
                { onboardingStep: 'completed' },
                { name: { $exists: true, $ne: '' }, onboardingStep: { $exists: false } }
            ]
        };

        const allProfessionals = await User.find({
            ...onboardingCompletedFilter,
            isProfessional: true
        }).select('clerkId username name photoUrl lastAccessAt lastSeen updatedAt createdAt phone email balance accessCount').lean() as any[];

        const profClerkIds = allProfessionals.map(p => p.clerkId);

        // Faturamento por profissional
        const earningsAgg = await MicroTransaction.aggregate([
            { $match: { userId: { $in: profClerkIds }, type: 'credit' } },
            { $group: { _id: '$userId', total: { $sum: '$amount' } } }
        ]);
        const earningsMap = new Map<string, number>(earningsAgg.map(e => [e._id, e.total / 100]));

        const subscriptionEarningsAgg = await Transaction.aggregate([
            { $match: { userId: { $in: profClerkIds }, type: 'credit', source: 'subscription', status: 'COMPLETED' } },
            { $group: { _id: '$userId', total: { $sum: '$amount' } } }
        ]);
        const subscriptionEarningsMap = new Map<string, number>(subscriptionEarningsAgg.map(s => [s._id, s.total / 100]));

        let active24hCount = 0;
        let absentCount = 0;
        let inactiveCount = 0;

        const activeAndAbsentProfessionals: any[] = [];
        const inactiveProfessionals: any[] = [];

        for (const prof of allProfessionals) {
            const lastAccessDate = prof.lastAccessAt || prof.lastSeen || prof.updatedAt || prof.createdAt;
            const lastAccess = lastAccessDate ? new Date(lastAccessDate) : new Date(0);
            const diffMs = now.getTime() - lastAccess.getTime();

            let status: 'active' | 'absent' | 'inactive' = 'inactive';
            if (lastAccess >= twentyFourHoursAgo) {
                status = 'active';
                active24hCount += 1;
            } else if (lastAccess >= sevenDaysAgo) {
                status = 'absent';
                absentCount += 1;
            } else {
                status = 'inactive';
                inactiveCount += 1;
            }

            const attrInfo = attributionMap.get(prof.clerkId) || {
                count: 0,
                lastAttributedAt: null,
                broughtClients: []
            };

            // Ordenar clientes trazidos mais recentes primeiro
            attrInfo.broughtClients.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const totalEarned = (earningsMap.get(prof.clerkId) || 0) + (subscriptionEarningsMap.get(prof.clerkId) || 0);

            // Cálculo da frequência média de acessos
            const accessCount = prof.accessCount || 0;
            const createdAtDate = prof.createdAt ? new Date(prof.createdAt) : now;
            const daysDiff = Math.max(1, (now.getTime() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24));

            let avgFrequencyLabel = 'Nenhum acesso';
            if (accessCount > 0) {
                const accessesPerDay = accessCount / daysDiff;
                if (accessesPerDay >= 1) {
                    avgFrequencyLabel = `${accessesPerDay.toFixed(1)}x / dia`;
                } else {
                    const accessesPerWeek = accessesPerDay * 7;
                    if (accessesPerWeek >= 1) {
                        avgFrequencyLabel = `${accessesPerWeek.toFixed(1)}x / semana`;
                    } else {
                        const daysPerAccess = Math.round(1 / accessesPerDay);
                        avgFrequencyLabel = `1x a cada ${daysPerAccess} dias`;
                    }
                }
            }

            const accessesPerDay = accessCount > 0 ? (accessCount / daysDiff) : 0;

            const profData = {
                clerkId: prof.clerkId,
                username: prof.username,
                name: prof.name || prof.username,
                photoUrl: prof.photoUrl || null,
                email: prof.email,
                phone: prof.phone || null,
                status,
                lastAccessAt: lastAccess,
                accessCount,
                avgFrequencyLabel,
                avgFrequencyValue: accessesPerDay,
                broughtClientsCount: attrInfo.count,
                lastClientBroughtAt: attrInfo.lastAttributedAt,
                broughtClients: attrInfo.broughtClients.slice(0, 5),
                totalEarned
            };

            if (status === 'active' || status === 'absent') {
                activeAndAbsentProfessionals.push(profData);
            } else {
                inactiveProfessionals.push(profData);
            }
        }

        // Ordenação das listas:
        // Profissionais Ativas/Ausentes: Ordenadas primariamente por Clientes Trazidos (desc), depois por último acesso (desc)
        activeAndAbsentProfessionals.sort((a, b) => {
            if (b.broughtClientsCount !== a.broughtClientsCount) {
                return b.broughtClientsCount - a.broughtClientsCount;
            }
            return new Date(b.lastAccessAt).getTime() - new Date(a.lastAccessAt).getTime();
        });

        // Profissionais Inativas: Ordenadas por último acesso (desc)
        inactiveProfessionals.sort((a, b) => new Date(b.lastAccessAt).getTime() - new Date(a.lastAccessAt).getTime());

        // --- ÚLTIMOS DEPÓSITOS (Apenas recharge PAID) ---
        const rawTransactions = await Transaction.find({
            source: 'recharge',
            status: 'PAID'
        })
            .sort({ timestamp: -1 })
            .limit(5)
            .lean() as any[];

        const txClerkIds = rawTransactions.map(tx => tx.userId).filter(Boolean) as string[];

        const txUsersList = await User.find({ clerkId: { $in: txClerkIds } })
            .select('clerkId name username')
            .lean();

        const mappedTransactions = rawTransactions.map(tx => {
            const relatedUser = txUsersList.find(u => u.clerkId === tx.userId);
            const userName = relatedUser 
                ? (relatedUser.name || `@${relatedUser.username}`) 
                : `Usuário (${tx.userId.substring(0, 8)}...)`;

            const valInReais = tx.amount || 0;
            const typeLabel = tx.type === 'PIX' ? 'Recarga Pix' : 'Recarga Cartão';

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
                status: 'Aprovado',
                timestamp: txDate,
                fee: 0,
                net: valInReais
            };
        });

        // --- CONVERSAS QUALIFICADAS RECENTES (FEED DO MARKETPLACE) ---
        const [
            recentQualifiedConversationsDocs,
            totalQualifiedCount,
            openConversationsCount,
            totalAttemptsCount,
            qualifiedAttemptsCount,
            financialAgg,
            pendingModerationCount,
        ] = await Promise.all([
            QualifiedConversation.find()
                .sort({ updatedAt: -1 })
                .limit(50)
                .lean() as any,
            QualifiedConversation.countDocuments(),
            QualifiedConversation.countDocuments({ status: 'open' }),
            QualificationAttempt.countDocuments(),
            QualificationAttempt.countDocuments({ status: 'qualified' }),
            QualifiedConversation.aggregate([
                {
                    $group: {
                        _id: null,
                        totalGross: { $sum: '$grossChargedCents' },
                        totalPayout: { $sum: '$professionalPayoutCents' },
                        totalMargin: { $sum: '$platformMarginCents' },
                    }
                }
            ]),
            ModerationReview.countDocuments({ status: 'pending' }),
        ]);

        const financialTotals = financialAgg[0] || { totalGross: 0, totalPayout: 0, totalMargin: 0 };
        const qualificationRateVal = totalAttemptsCount > 0
            ? Math.round((qualifiedAttemptsCount / totalAttemptsCount) * 100)
            : 0;

        const marketplaceMetrics = {
            totalQualified: totalQualifiedCount,
            openConversations: openConversationsCount,
            qualificationRate: `${qualificationRateVal}%`,
            grossRevenueCents: financialTotals.totalGross || 0,
            professionalPayoutCents: financialTotals.totalPayout || 0,
            platformMarginCents: financialTotals.totalMargin || 0,
            pendingModerationCount,
        };

        const participantIds = new Set<string>();
        recentQualifiedConversationsDocs.forEach((c: any) => {
            if (c.clientId) participantIds.add(c.clientId);
            if (c.professionalId) participantIds.add(c.professionalId);
        });

        const participantsMap = new Map(
            (await User.find({ clerkId: { $in: Array.from(participantIds) } }).select('clerkId name username photoUrl').lean())
                .map((u: any) => [u.clerkId, u])
        );

        const recentQualifiedConversations = recentQualifiedConversationsDocs.map((c: any) => {
            const clientUser = participantsMap.get(c.clientId);
            const profUser = participantsMap.get(c.professionalId);

            // Anonimização do cliente na listagem do feed
            let anonymizedClientName = 'Cliente';
            if (clientUser) {
                if (clientUser.name) {
                    const parts = clientUser.name.trim().split(' ');
                    anonymizedClientName = parts.length > 1
                        ? `${parts[0]} ${parts[1][0]}.`
                        : parts[0];
                } else if (clientUser.username) {
                    anonymizedClientName = `@${clientUser.username.substring(0, 3)}***`;
                }
            }

            return {
                id: c._id.toString(),
                roomId: c.roomId,
                client: {
                    clerkId: c.clientId,
                    name: anonymizedClientName,
                    username: clientUser?.username || 'cliente',
                    photoUrl: clientUser?.photoUrl || null,
                },
                professional: {
                    clerkId: c.professionalId,
                    name: profUser?.name || `@${profUser?.username || 'profissional'}`,
                    username: profUser?.username || '',
                    photoUrl: profUser?.photoUrl || null,
                },
                status: c.status,
                equivalentChars: c.clientEquivalentChars,
                grossChargedCents: c.grossChargedCents,
                payoutCents: c.professionalPayoutCents || 0,
                marginCents: c.platformMarginCents || 0,
                unlockedBonuses: c.unlockedBonuses || [],
                moderationStatus: c.moderationStatus,
                startedAt: c.startedAt,
                qualifiedAt: c.qualifiedAt,
                lastParticipantActivityAt: c.lastParticipantActivityAt,
                closesAt: c.closesAt,
                settledAt: c.settledAt,
                updatedAt: c.updatedAt,
            };
        });

        // 3. Responder
        return NextResponse.json({
            marketplaceMetrics,
            metrics: {
                active24h: { value: active24hCount.toLocaleString('pt-BR') },
                absent: { value: absentCount.toLocaleString('pt-BR') },
                inactive: { value: inactiveCount.toLocaleString('pt-BR') },
                totalBroughtClients: { value: totalBroughtClientsCount.toLocaleString('pt-BR') }
            },
            activeAndAbsentProfessionals,
            inactiveProfessionals,
            recentTransactions: mappedTransactions,
            recentQualifiedConversations,
        });

    } catch (error: any) {
        console.error('Erro na API de estatísticas da Dashboard:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

