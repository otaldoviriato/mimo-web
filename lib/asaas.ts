const ASAAS_SANDBOX_URL = 'https://api-sandbox.asaas.com/v3';
const ASAAS_PRODUCTION_URL = 'https://api.asaas.com/v3';

type AsaasError = {
    errors?: Array<{ code?: string; description?: string }>;
};

type AsaasCustomer = {
    id: string;
    name?: string;
    email?: string;
    cpfCnpj?: string;
    mobilePhone?: string;
};

type AsaasTokenizedCard = {
    creditCardNumber?: string;
    creditCardBrand?: string;
    creditCardToken: string;
};

export type AsaasPayment = {
    id: string;
    status: string;
    value: number;
    netValue?: number;
    billingType: 'CREDIT_CARD';
    invoiceUrl?: string;
    transactionReceiptUrl?: string;
    creditCard?: {
        creditCardNumber?: string;
        creditCardBrand?: string;
    };
};

export type AsaasCardPaymentInput = {
    userId: string;
    amount: number;
    holderName: string;
    holderDocument: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    remoteIp: string;
    customer: {
        name: string;
        email: string;
        cpfCnpj: string;
        mobilePhone?: string;
        externalReference: string;
    };
};

export type AsaasSavedCardPaymentInput = {
    userId: string;
    amount: number;
    customerId: string;
    creditCardToken: string;
    remoteIp: string;
};

function getAsaasApiKey() {
    let apiKey = process.env.ASAAS_API_KEY;

    if (!apiKey) {
        throw new Error('ASAAS_API_KEY is not configured');
    }

    if (apiKey.startsWith('\\$')) {
        apiKey = apiKey.substring(1);
    }

    return apiKey;
}

export function getAsaasEnvironment() {
    return process.env.ASAAS_ENV === 'production' || process.env.ASAAS_ENVIRONMENT === 'production'
        ? 'production'
        : 'sandbox';
}

function getAsaasBaseUrl() {
    return getAsaasEnvironment() === 'production' ? ASAAS_PRODUCTION_URL : ASAAS_SANDBOX_URL;
}

async function asaasRequest<T>(path: string, init: RequestInit) {
    const response = await fetch(`${getAsaasBaseUrl()}${path}`, {
        ...init,
        headers: {
            access_token: getAsaasApiKey(),
            accept: 'application/json',
            'content-type': 'application/json',
            'User-Agent': 'MimoChat/1.0.0',
            ...(init.headers || {}),
        },
    });

    const payload = (await response.json().catch(() => ({}))) as T | AsaasError;

    if (!response.ok) {
        const error = new Error(`Asaas request failed: ${response.status} ${path}`);
        (error as Error & { status?: number; payload?: unknown }).status = response.status;
        (error as Error & { status?: number; payload?: unknown }).payload = payload;
        throw error;
    }

    return payload as T;
}

async function findCustomerByExternalReference(externalReference: string) {
    const params = new URLSearchParams({ externalReference });
    const response = await asaasRequest<{ data?: AsaasCustomer[] }>(`/customers?${params.toString()}`, {
        method: 'GET',
    });

    return response.data?.[0] ?? null;
}

export async function getOrCreateAsaasCustomer(input: AsaasCardPaymentInput['customer']) {
    const existing = await findCustomerByExternalReference(input.externalReference);

    if (existing?.id) {
        return existing;
    }

    return asaasRequest<AsaasCustomer>('/customers', {
        method: 'POST',
        body: JSON.stringify({
            name: input.name,
            cpfCnpj: input.cpfCnpj,
            email: input.email,
            mobilePhone: input.mobilePhone,
            externalReference: input.externalReference,
            notificationDisabled: true,
        }),
    });
}

export async function tokenizeAsaasCard(customerId: string, input: AsaasCardPaymentInput) {
    return asaasRequest<AsaasTokenizedCard>('/creditCard/tokenizeCreditCard', {
        method: 'POST',
        body: JSON.stringify({
            customer: customerId,
            creditCard: {
                holderName: input.holderName,
                number: input.cardNumber,
                expiryMonth: input.expiryMonth,
                expiryYear: input.expiryYear,
                ccv: input.cvv,
            },
            creditCardHolderInfo: {
                name: input.holderName,
                email: input.customer.email,
                cpfCnpj: input.holderDocument,
                postalCode: '01310000',
                addressNumber: '100',
                phone: input.customer.mobilePhone,
                mobilePhone: input.customer.mobilePhone,
            },
            remoteIp: input.remoteIp,
        }),
    });
}

export async function createAsaasCardPayment(input: AsaasCardPaymentInput) {
    const customer = await getOrCreateAsaasCustomer(input.customer);
    const tokenizedCard = await tokenizeAsaasCard(customer.id, input);
    const dueDate = new Date().toISOString().slice(0, 10);

    const payment = await asaasRequest<AsaasPayment>('/lean/payments/', {
        method: 'POST',
        body: JSON.stringify({
            customer: customer.id,
            billingType: 'CREDIT_CARD',
            value: input.amount,
            dueDate,
            description: 'Recarga de Saldo - MimoChat',
            externalReference: `mimo_recharge_${input.userId}_${Date.now()}`,
            creditCardToken: tokenizedCard.creditCardToken,
            remoteIp: input.remoteIp,
        }),
    });

    return {
        customer,
        tokenizedCard,
        payment,
    };
}

export async function createAsaasSavedCardPayment(input: AsaasSavedCardPaymentInput) {
    const dueDate = new Date().toISOString().slice(0, 10);

    return asaasRequest<AsaasPayment>('/lean/payments/', {
        method: 'POST',
        body: JSON.stringify({
            customer: input.customerId,
            billingType: 'CREDIT_CARD',
            value: input.amount,
            dueDate,
            description: 'Recarga de Saldo - MimoChat',
            externalReference: `mimo_recharge_${input.userId}_${Date.now()}`,
            creditCardToken: input.creditCardToken,
            remoteIp: input.remoteIp,
        }),
    });
}

export async function checkAsaasPayment(id: string) {
    return asaasRequest<AsaasPayment>(`/payments/${encodeURIComponent(id)}`, { method: 'GET' });
}

export function mapAsaasPaymentStatus(status: string) {
    if (status === 'RECEIVED' || status === 'CONFIRMED') return 'PAID';
    if (
        status === 'REFUNDED' ||
        status === 'REFUND_REQUESTED' ||
        status === 'CHARGEBACK_REQUESTED' ||
        status === 'CREDIT_CARD_CAPTURE_REFUSED' ||
        status === 'REPROVED_BY_RISK_ANALYSIS'
    ) {
        return 'CANCELLED';
    }
    return 'PENDING';
}

export type AsaasTransfer = {
    id: string;
    dateCreated: string;
    status: string;
    value: number;
    netValue: number;
    transferFee: number;
    scheduleDate: string;
    authorized: boolean;
    failReason: string | null;
    transactionReceiptUrl: string | null;
};

function isValidCPF(cpf: string): boolean {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    
    // Elimina CPFs conhecidos que passam no cálculo do dígito verificador mas são inválidos
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
        sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
    
    return true;
}

export function detectPixKeyType(pixKey: string): 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP' {
    const cleanKey = pixKey.trim();

    // Chave EVP (Aleatória)
    const evpRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (evpRegex.test(cleanKey)) {
        return 'EVP';
    }

    if (cleanKey.includes('@')) {
        return 'EMAIL';
    }

    const digitsOnly = cleanKey.replace(/\D/g, '');

    if (digitsOnly.length === 11 && isValidCPF(digitsOnly)) {
        return 'CPF';
    }

    if (digitsOnly.length === 14) {
        return 'CNPJ';
    }

    if (cleanKey.startsWith('+') || digitsOnly.length === 10 || digitsOnly.length === 11 || digitsOnly.length === 12 || digitsOnly.length === 13) {
        return 'PHONE';
    }

    return 'EVP';
}

export function normalizePixKey(pixKey: string, type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'): string {
    const cleanKey = pixKey.trim();
    if (type === 'PHONE') {
        const digitsOnly = cleanKey.replace(/\D/g, '');
        if (cleanKey.startsWith('+')) {
            return digitsOnly;
        }
        if (digitsOnly.length === 10 || digitsOnly.length === 11) {
            return `55${digitsOnly}`;
        }
        return digitsOnly;
    }
    if (type === 'CPF' || type === 'CNPJ') {
        return cleanKey.replace(/\D/g, '');
    }
    return cleanKey;
}

export async function createAsaasPixTransfer(amountInCents: number, pixKey: string) {
    const value = amountInCents / 100;
    const type = detectPixKeyType(pixKey);
    const normalizedKey = normalizePixKey(pixKey, type);

    return asaasRequest<AsaasTransfer>('/transfers', {
        method: 'POST',
        body: JSON.stringify({
            value,
            pixAddressKey: normalizedKey,
            pixAddressKeyType: type,
            description: 'Saque MimoChat',
        }),
    });
}

