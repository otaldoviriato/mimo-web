const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v2';

type AbacatePayResponse<T> = {
    data?: T;
    error?: unknown;
    success?: boolean | { message?: string };
};

export type TransparentCardPayload = {
    amountInCents: number;
    description: string;
    externalId: string;
    customer: {
        name: string;
        email: string;
        taxId: string;
        cellphone: string;
    };
    card: {
        number: string;
        holderName: string;
        holderDocument: string;
        expirationMonth: string;
        expirationYear: string;
        cvv: string;
        installments: number;
    };
};

export type AbacatePayCharge = {
    id: string;
    amount?: number;
    paidAmount?: number;
    status?: string;
    url?: string;
    receiptUrl?: string;
    methods?: string[];
    platformFee?: number;
    installmentsCount?: number | null;
    createdAt?: string;
    updatedAt?: string;
    metadata?: Record<string, unknown>;
};

function getApiKey() {
    const apiKey = process.env.ABACATEPAY_API_KEY;

    if (!apiKey) {
        throw new Error('ABACATEPAY_API_KEY is not configured');
    }

    return apiKey;
}

async function abacatePayRequest<T>(path: string, init: RequestInit) {
    const response = await fetch(`${ABACATEPAY_API_URL}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
            ...(init.headers || {}),
        },
    });

    const payload = (await response.json().catch(() => ({}))) as AbacatePayResponse<T>;

    if (!response.ok || payload.error) {
        const error = new Error('AbacatePay request failed');
        (error as Error & { status?: number; payload?: AbacatePayResponse<T> }).status = response.status;
        (error as Error & { status?: number; payload?: AbacatePayResponse<T> }).payload = payload;
        throw error;
    }

    if (!payload.data) {
        throw new Error('AbacatePay response missing data');
    }

    return payload.data;
}

export async function createTransparentCardCharge(payload: TransparentCardPayload) {
    return abacatePayRequest<AbacatePayCharge>('/transparents/create', {
        method: 'POST',
        body: JSON.stringify({
            method: 'CARD',
            data: {
                amount: payload.amountInCents,
                description: payload.description,
                externalId: payload.externalId,
                customer: payload.customer,
                card: {
                    number: payload.card.number,
                    holderName: payload.card.holderName,
                    holderDocument: payload.card.holderDocument,
                    expirationMonth: payload.card.expirationMonth,
                    expirationYear: payload.card.expirationYear,
                    cvv: payload.card.cvv,
                    installments: payload.card.installments,
                },
                metadata: {
                    source: 'mimo_recharge',
                    paymentMethod: 'CARD',
                    installments: payload.card.installments,
                },
            },
        }),
    });
}

export async function checkTransparentCharge(id: string) {
    const params = new URLSearchParams({ id });
    return abacatePayRequest<Pick<AbacatePayCharge, 'id' | 'status' | 'updatedAt'>>(
        `/transparents/check?${params.toString()}`,
        { method: 'GET' }
    );
}
