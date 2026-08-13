import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getAdminAccess } from '@/lib/adminAuth';
import { AcquisitionEvent } from '@/models/AcquisitionEvent';
import { CustomerRelationship } from '@/models/CustomerRelationship';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DAY_MS = 24 * 60 * 60 * 1000;

function parseRange(request: NextRequest) {
    const daysParam = Number(request.nextUrl.searchParams.get('days') || 30);
    const days = [30, 90, 180].includes(daysParam) ? daysParam : 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * DAY_MS);
    return { days, startDate, endDate };
}

export async function GET(request: NextRequest) {
    try {
        const { isAdmin } = await getAdminAccess();
        if (!isAdmin) return NextResponse.json({ error: 'Acesso proibido.' }, { status: 403 });

        await connectToDatabase();
        const { days, startDate, endDate } = parseRange(request);
        const now = new Date();
        const d7Cutoff = new Date(now.getTime() - 7 * DAY_MS);
        const d30Cutoff = new Date(now.getTime() - 30 * DAY_MS);
        const eventMatch = { occurredAt: { $gte: startDate, $lte: endDate } };
        const relationshipMatch = { firstPaidAt: { $gte: startDate, $lte: endDate } };

        const [eventCounts, relationshipStats, gmvByOrigin, retentionStats, positions, relationships, coverage] = await Promise.all([
            AcquisitionEvent.aggregate([
                { $match: eventMatch },
                { $group: { _id: '$eventType', count: { $sum: 1 }, uniqueClients: { $addToSet: '$clientId' } } },
                { $project: { _id: 0, eventType: '$_id', count: 1, uniqueClients: { $size: { $filter: { input: '$uniqueClients', as: 'id', cond: { $ne: ['$$id', null] } } } } } },
            ]),
            CustomerRelationship.aggregate([
                { $match: relationshipMatch },
                { $group: { _id: '$origin', relationships: { $sum: 1 }, clients: { $addToSet: '$clientId' }, professionals: { $addToSet: '$professionalId' } } },
                { $project: { _id: 0, origin: '$_id', relationships: 1, uniqueClients: { $size: '$clients' }, uniqueProfessionals: { $size: '$professionals' } } },
            ]),
            AcquisitionEvent.aggregate([
                { $match: { ...eventMatch, eventType: 'gmv_recorded' } },
                { $group: { _id: { $ifNull: ['$origin', 'unknown'] }, gmvCents: { $sum: '$amountCents' }, paidEvents: { $sum: 1 } } },
                { $project: { _id: 0, origin: '$_id', gmvCents: 1, paidEvents: 1 } },
            ]),
            CustomerRelationship.aggregate([
                { $match: relationshipMatch },
                { $group: {
                    _id: '$origin',
                    d7Eligible: { $sum: { $cond: [{ $lte: ['$firstPaidAt', d7Cutoff] }, 1, 0] } },
                    d7Retained: { $sum: { $cond: [{ $and: [{ $lte: ['$firstPaidAt', d7Cutoff] }, { $ne: [{ $type: '$d7RetainedAt' }, 'missing'] }] }, 1, 0] } },
                    d30Eligible: { $sum: { $cond: [{ $lte: ['$firstPaidAt', d30Cutoff] }, 1, 0] } },
                    d30Retained: { $sum: { $cond: [{ $and: [{ $lte: ['$firstPaidAt', d30Cutoff] }, { $ne: [{ $type: '$d30RetainedAt' }, 'missing'] }] }, 1, 0] } },
                } },
                { $project: { _id: 0, origin: '$_id', d7Eligible: 1, d7Retained: 1, d30Eligible: 1, d30Retained: 1 } },
            ]),
            CustomerRelationship.aggregate([
                { $match: { ...relationshipMatch, professionalPosition: { $in: [1, 2] } } },
                { $group: { _id: '$professionalPosition', clients: { $addToSet: '$clientId' }, gmvCents: { $sum: '$gmvCents' } } },
                { $project: { _id: 0, position: '$_id', clients: { $size: '$clients' }, gmvCents: 1 } },
                { $sort: { position: 1 } },
            ]),
            CustomerRelationship.aggregate([
                { $match: relationshipMatch },
                { $sort: { firstPaidAt: -1 } },
                { $limit: 100 },
                { $lookup: { from: 'users', localField: 'clientId', foreignField: 'clerkId', as: 'client' } },
                { $lookup: { from: 'users', localField: 'professionalId', foreignField: 'clerkId', as: 'professional' } },
                { $set: { client: { $arrayElemAt: ['$client', 0] }, professional: { $arrayElemAt: ['$professional', 0] } } },
                { $project: { _id: 0, relationshipKey: 1, origin: 1, firstPaidAt: 1, lastPaidAt: 1, firstPaidSource: 1, professionalPosition: 1, gmvCents: 1, paidEventsCount: 1, d7RetainedAt: 1, d30RetainedAt: 1, clientId: 1, clientName: '$client.name', clientUsername: '$client.username', professionalId: 1, professionalName: '$professional.name', professionalUsername: '$professional.username' } },
            ]),
            Promise.all([
                AcquisitionEvent.findOne().sort({ occurredAt: 1 }).select('occurredAt').lean(),
                CustomerRelationship.findOne().sort({ firstPaidAt: 1 }).select('firstPaidAt').lean(),
            ]),
        ]);

        const counts = Object.fromEntries(eventCounts.map((item) => [item.eventType, item.count]));
        const allOrigins = new Set([
            ...relationshipStats.map((item) => item.origin),
            ...gmvByOrigin.map((item) => item.origin),
        ]);
        const originStats = Array.from(allOrigins).map((origin) => {
            const relationship = relationshipStats.find((item) => item.origin === origin);
            const gmv = gmvByOrigin.find((item) => item.origin === origin);
            return {
                origin,
                relationships: relationship?.relationships || 0,
                uniqueClients: relationship?.uniqueClients || 0,
                uniqueProfessionals: relationship?.uniqueProfessionals || 0,
                gmvCents: gmv?.gmvCents || 0,
                paidEvents: gmv?.paidEvents || 0,
            };
        }).sort((a, b) => b.gmvCents - a.gmvCents);
        const totals = originStats.reduce((acc, item) => ({
            relationships: acc.relationships + item.relationships,
            gmvCents: acc.gmvCents + item.gmvCents,
            paidEvents: acc.paidEvents + item.paidEvents,
        }), { relationships: 0, gmvCents: 0, paidEvents: 0 });
        const coverageDates = [coverage[0]?.occurredAt, coverage[1]?.firstPaidAt]
            .filter((value): value is Date => value instanceof Date);
        const coverageStartsAt = coverageDates.length
            ? new Date(Math.min(...coverageDates.map((value) => value.getTime())))
            : null;

        return NextResponse.json({
            generatedAt: now.toISOString(),
            range: { days, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
            coverageStartsAt,
            funnel: {
                linkViewed: counts.link_viewed || 0,
                linkShared: counts.link_shared || 0,
                signupAttributed: counts.signup_attributed || 0,
                firstRecharge: counts.first_recharge || 0,
                firstPaidRelationship: counts.first_paid_message || 0,
                exploreProfileViewed: counts.explore_profile_viewed || 0,
                firstProfessional: positions.find((item) => item.position === 1)?.clients || 0,
                secondProfessional: positions.find((item) => item.position === 2)?.clients || 0,
            },
            totals,
            originStats,
            retentionStats,
            positions,
            relationships,
            definitions: {
                origin: 'A origem e congelada na primeira transacao paga da relacao.',
                gmv: 'Soma, em centavos, dos debitos pagos por mensagem, audio, midia e presente.',
                d7: 'Relacao com nova transacao paga pelo menos 7 dias apos a primeira. O denominador inclui apenas relacoes maduras.',
                d30: 'Relacao com nova transacao paga pelo menos 30 dias apos a primeira. O denominador inclui apenas relacoes maduras.',
            },
        });
    } catch (error) {
        console.error('Erro ao carregar metricas de aquisicao:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
