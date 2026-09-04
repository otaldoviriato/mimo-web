import { QualifiedConversation } from '@/models/QualifiedConversation';

/**
 * Conta as conversas qualificadas reais de cada criadora no marketplace para a ordenação do Explorar.
 */
export async function getQualifiedConversationCounts(
    professionalIds: string[],
    _inactivityMinutes?: number,
    _minimumEarningsCents?: number,
) {
    if (professionalIds.length === 0) return new Map<string, number>();

    const results = await QualifiedConversation.aggregate([
        {
            $match: {
                professionalId: { $in: professionalIds },
                status: { $in: ['open', 'settlement_pending', 'settled'] },
            },
        },
        {
            $group: {
                _id: '$professionalId',
                count: { $sum: 1 },
            },
        },
    ]);

    return new Map<string, number>(
        results.map((result) => [String(result._id), Number(result.count)]),
    );
}
