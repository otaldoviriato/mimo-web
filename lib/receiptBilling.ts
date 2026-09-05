export const RECEIPT_TERMS_VERSION = 'receipt-2026-09-05';
export const PENDING_MESSAGE_LABEL = 'Recarregue para visualizar esta mensagem.';

export function requiresReceiptConsent(user: { isProfessional?: boolean; isTeam?: boolean; receiptTermsVersion?: string | null; receiptTermsAcceptedAt?: unknown } | null | undefined): boolean {
    return !user || (!user.isProfessional && !user.isTeam &&
        (user.receiptTermsVersion !== RECEIPT_TERMS_VERSION || !user.receiptTermsAcceptedAt));
}

export function billableReceivedCharacters(count: number, cap = 50): number {
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(cap) || cap < 1) {
        throw new Error('Quantidade de caracteres inválida.');
    }
    return Math.min(count, cap);
}

// Never send pending content, audio URLs or quoted text to the paying recipient.
export function messageForViewer<T extends Record<string, any>>(message: T, viewerId?: string): T {
    if (message.billingStatus !== 'pending' || viewerId === message.senderId) return message;
    return { ...message, content: PENDING_MESSAGE_LABEL, audioUrl: undefined,
        replyToContent: null, replyToId: null, replyToSenderId: null, isContentLocked: true };
}
