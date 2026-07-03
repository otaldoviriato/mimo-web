export class SubscriptionBillingError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = 'SubscriptionBillingError';
        this.status = status;
    }
}

export function subscriptionPriceBRLToCents(priceInReais: unknown): number {
    const price = Number(priceInReais);

    if (!Number.isFinite(price) || price < 0) {
        throw new SubscriptionBillingError('Preço da assinatura inválido');
    }

    return Math.round(price * 100);
}

export function normalizeStoredSubscriptionPriceInCents(
    storedPriceInCents: unknown,
    currentProfessionalPriceInReais?: unknown
): number {
    const stored = Number(storedPriceInCents);

    if (!Number.isFinite(stored) || stored < 0) {
        throw new SubscriptionBillingError('Preço da assinatura inválido');
    }

    const currentPrice = Number(currentProfessionalPriceInReais);
    const hasCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0;
    const currentPriceInCents = hasCurrentPrice ? subscriptionPriceBRLToCents(currentPrice) : null;

    // Legacy production records were sometimes saved as BRL in a field named priceInCents.
    // Example: 25.9 was displayed as R$ 0,26 after the UI divided by 100.
    if (!Number.isInteger(stored)) {
        return subscriptionPriceBRLToCents(stored);
    }

    // Defensive repair for legacy integer-rounded BRL values, e.g. 26 instead of 2590.
    if (
        currentPriceInCents &&
        stored > 0 &&
        stored < currentPriceInCents / 10 &&
        Math.abs(stored - Math.round(currentPrice)) <= 1
    ) {
        return currentPriceInCents;
    }

    return stored;
}
