export const RECEIPT_TERMS_VERSION = 'receipt-2026-09-05';
export const RECEIPT_TERMS_EFFECTIVE_DATE = new Date('2026-09-05T00:00:00.000Z');
export const PENDING_MESSAGE_LABEL = 'Recarregue para visualizar esta mensagem.';

export function requiresReceiptConsent(user: {
    isProfessional?: boolean;
    isTeam?: boolean;
    receiptTermsVersion?: string | null;
    receiptTermsAcceptedAt?: unknown;
    createdAt?: Date | string | null;
} | null | undefined): boolean {
    if (!user || user.isTeam) return false;

    // Se o usuário já aceitou a versão vigente dos termos
    if (user.receiptTermsVersion === RECEIPT_TERMS_VERSION && user.receiptTermsAcceptedAt) {
        return false;
    }

    // Usuários novos (criados a partir da data de vigência do novo modelo) já concordam
    // com os termos vigentes na tela de cadastro e não devem ver modal de atualização/transição
    if (user.createdAt && new Date(user.createdAt).getTime() >= RECEIPT_TERMS_EFFECTIVE_DATE.getTime()) {
        return false;
    }

    return true;
}

export function billableReceivedCharacters(count: number, cap = 50, usedInTurn = 0): number {
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(cap) || cap < 1 || !Number.isSafeInteger(usedInTurn) || usedInTurn < 0) {
        throw new Error('Quantidade de caracteres inválida.');
    }
    const remainingCap = Math.max(0, cap - usedInTurn);
    return Math.min(count, remainingCap);
}

// Independent random characters, never a reversible substitution cipher.
// Only whitespace, length and letter case are intentionally disclosed.
export function lockedMessagePreview(content: string): string {
    return Array.from(content, (character) => {
        if (/\s/u.test(character)) return character;
        const random = crypto.getRandomValues(new Uint32Array(1))[0];
        const letter = String.fromCharCode(97 + random % 26);
        return /\p{Lu}/u.test(character) ? letter.toUpperCase() : letter;
    }).join('');
}

// Never send pending content, audio URLs or quoted text to the paying recipient.
export function messageForViewer<T extends Record<string, any>>(message: T, viewerId?: string): T {
    if (message.billingStatus !== 'pending' || viewerId === message.senderId) return message;
    return { ...message, content: message.isAudio ? '' : lockedMessagePreview(String(message.content ?? '')), audioUrl: undefined,
        replyToContent: null, replyToId: null, replyToSenderId: null, isContentLocked: true };
}
