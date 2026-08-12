export interface EarningsSessionMessage {
    id: string;
    roomId: string;
    senderId: string;
    receiverId: string;
    timestamp: Date | string;
    isLockedImage?: boolean;
    isVideo?: boolean;
    isGift?: boolean;
}

export interface EarningsSessionTransaction {
    id: string;
    amount: number;
    source: 'message' | 'image_unlock' | 'gift';
    relatedUserId?: string;
    timestamp: Date | string;
    messageId?: string;
}

export interface EarningsSessionBlock {
    sessionId: string;
    roomId: string;
    relatedUserId: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    messagesCount: number;
    professionalMessages: number;
    clientMessages: number;
    mediaCount: number;
    giftCount: number;
    totalEarnings: number;
    messageEarnings: number;
    mediaEarnings: number;
    giftEarnings: number;
    transactionIds: string[];
}

interface MutableBlock extends EarningsSessionBlock {
    messageIds: Set<string>;
}

const toValidDate = (value: Date | string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Builds motivational earnings sessions. Messages define the time window;
 * financial credits are attributed afterwards and never change its dates.
 */
export function buildEarningsSessions(
    professionalId: string,
    messages: EarningsSessionMessage[],
    transactions: EarningsSessionTransaction[],
    inactivityMinutes: number,
    minimumEarningsCents: number,
): EarningsSessionBlock[] {
    return buildEarningsSessionBlocks(
        professionalId,
        messages,
        transactions,
        inactivityMinutes,
    ).filter(block => block.totalEarnings >= minimumEarningsCents);
}

export function buildEarningsSessionBlocks(
    professionalId: string,
    messages: EarningsSessionMessage[],
    transactions: EarningsSessionTransaction[],
    inactivityMinutes: number,
    attributeUnlocksAfterClose = true,
): EarningsSessionBlock[] {
    const byClient = new Map<string, Array<EarningsSessionMessage & { parsedDate: Date }>>();

    for (const message of messages) {
        const parsedDate = toValidDate(message.timestamp);
        if (!parsedDate) continue;
        const relatedUserId = message.senderId === professionalId ? message.receiverId : message.senderId;
        if (!relatedUserId || relatedUserId === professionalId) continue;
        const list = byClient.get(relatedUserId) ?? [];
        list.push({ ...message, parsedDate });
        byClient.set(relatedUserId, list);
    }

    const blocks: MutableBlock[] = [];
    const blockByMessageId = new Map<string, MutableBlock>();

    for (const [relatedUserId, clientMessages] of byClient) {
        clientMessages.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
        let current: MutableBlock | null = null;

        for (const message of clientMessages) {
            const gapMinutes = current
                ? (message.parsedDate.getTime() - current.endTime.getTime()) / 60_000
                : Number.POSITIVE_INFINITY;

            if (!current || gapMinutes > inactivityMinutes) {
                current = {
                    sessionId: `${message.roomId}_${message.parsedDate.getTime()}`,
                    roomId: message.roomId,
                    relatedUserId,
                    startTime: message.parsedDate,
                    endTime: message.parsedDate,
                    durationMinutes: 0,
                    messagesCount: 0,
                    professionalMessages: 0,
                    clientMessages: 0,
                    mediaCount: 0,
                    giftCount: 0,
                    totalEarnings: 0,
                    messageEarnings: 0,
                    mediaEarnings: 0,
                    giftEarnings: 0,
                    transactionIds: [],
                    messageIds: new Set<string>(),
                };
                blocks.push(current);
            }

            current.endTime = message.parsedDate;
            current.durationMinutes = Math.max(0, Math.round((current.endTime.getTime() - current.startTime.getTime()) / 60_000));
            current.messagesCount += 1;
            current.professionalMessages += message.senderId === professionalId ? 1 : 0;
            current.clientMessages += message.senderId === professionalId ? 0 : 1;
            current.mediaCount += message.isLockedImage || message.isVideo ? 1 : 0;
            current.giftCount += message.isGift ? 1 : 0;
            current.messageIds.add(message.id);
            blockByMessageId.set(message.id, current);
        }
    }

    const blocksByClient = new Map<string, MutableBlock[]>();
    for (const block of blocks) {
        const list = blocksByClient.get(block.relatedUserId) ?? [];
        list.push(block);
        blocksByClient.set(block.relatedUserId, list);
    }

    for (const transaction of transactions) {
        const txDate = toValidDate(transaction.timestamp);
        if (!txDate) continue;

        let block = transaction.messageId ? blockByMessageId.get(transaction.messageId) : undefined;
        if (
            block
            && transaction.source !== 'message'
            && !attributeUnlocksAfterClose
            && txDate.getTime() > block.endTime.getTime() + inactivityMinutes * 60_000
        ) {
            block = undefined;
        }

        // Legacy message credits do not always have messageId. Their timestamp is
        // practically identical to the paid message, so attribute them only when
        // they fall inside the original message window for the same client.
        if (!block && transaction.source === 'message' && transaction.relatedUserId) {
            block = (blocksByClient.get(transaction.relatedUserId) ?? []).find(candidate => (
                txDate.getTime() >= candidate.startTime.getTime() - 2_000
                && txDate.getTime() <= candidate.endTime.getTime() + 2_000
            ));
        }

        if (!block) continue;
        const amount = Number(transaction.amount) || 0;
        block.totalEarnings += amount;
        block.transactionIds.push(transaction.id);
        if (transaction.source === 'message') block.messageEarnings += amount;
        if (transaction.source === 'image_unlock') block.mediaEarnings += amount;
        if (transaction.source === 'gift') block.giftEarnings += amount;
    }

    return blocks
        .map(({ messageIds, ...block }) => {
            void messageIds;
            return block;
        })
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}
