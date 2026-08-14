import { MicroTransaction } from '@/models/MicroTransaction';

/**
 * Conta as sessões financeiras que atingiram o mínimo configurado no Mimo.
 * Uma nova sessão começa após o intervalo de inatividade configurado.
 */
export async function getQualifiedConversationCounts(
    professionalIds: string[],
    inactivityMinutes: number,
    minimumEarningsCents: number,
) {
    if (professionalIds.length === 0) return new Map<string, number>();

    const inactivityMs = inactivityMinutes * 60_000;
    const results = await MicroTransaction.aggregate([
        {
            $match: {
                userId: { $in: professionalIds },
                type: 'credit',
                source: { $in: ['message', 'image_unlock', 'gift'] },
                relatedUserId: { $type: 'string', $ne: '' },
            },
        },
        {
            $setWindowFields: {
                partitionBy: { userId: '$userId', relatedUserId: '$relatedUserId' },
                sortBy: { timestamp: 1 },
                output: {
                    previousTimestamp: { $shift: { output: '$timestamp', by: -1 } },
                },
            },
        },
        {
            $set: {
                startsNewSession: {
                    $cond: [
                        {
                            $or: [
                                { $eq: ['$previousTimestamp', null] },
                                { $gt: [{ $subtract: ['$timestamp', '$previousTimestamp'] }, inactivityMs] },
                            ],
                        },
                        1,
                        0,
                    ],
                },
            },
        },
        {
            $setWindowFields: {
                partitionBy: { userId: '$userId', relatedUserId: '$relatedUserId' },
                sortBy: { timestamp: 1 },
                output: {
                    sessionNumber: {
                        $sum: '$startsNewSession',
                        window: { documents: ['unbounded', 'current'] },
                    },
                },
            },
        },
        {
            $group: {
                _id: {
                    professionalId: '$userId',
                    relatedUserId: '$relatedUserId',
                    sessionNumber: '$sessionNumber',
                },
                totalEarnings: { $sum: '$amount' },
            },
        },
        { $match: { totalEarnings: { $gte: minimumEarningsCents } } },
        { $group: { _id: '$_id.professionalId', count: { $sum: 1 } } },
    ]).allowDiskUse(true);

    return new Map<string, number>(
        results.map((result) => [String(result._id), Number(result.count)]),
    );
}
