import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { connectToDatabase } from '@/lib/db';
import { createAsaasCardPayment, createAsaasSavedCardPayment, getAsaasEnvironment, mapAsaasPaymentStatus } from '@/lib/asaas';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

type CardPaymentBody = {
    amount?: number;
    holderName?: string;
    holderDocument?: string;
    cardNumber?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
    phone?: string;
    saveCard?: boolean;
    savedCardId?: string;
};

function onlyDigits(value: unknown) {
    return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

function getRemoteIp(request: NextRequest) {
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const realIp = request.headers.get('x-real-ip')?.trim();
    const vercelIp = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();

    return forwardedFor || realIp || vercelIp || '127.0.0.1';
}

function validateExpiry(month: string, year: string) {
    const parsedMonth = Number(month);
    const parsedYear = Number(year.length === 2 ? `20${year}` : year);

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return false;
    }

    if (!Number.isInteger(parsedYear)) {
        return false;
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cardExpiryMonthStart = new Date(parsedYear, parsedMonth - 1, 1);

    return cardExpiryMonthStart >= currentMonthStart;
}

function getCardDisplayData(tokenizedCard: { creditCardBrand?: string; creditCardNumber?: string }, cardNumber: string) {
    const brand = tokenizedCard.creditCardBrand || 'Cartao';
    const lastFour = (tokenizedCard.creditCardNumber || cardNumber).replace(/\D/g, '').slice(-4);

    return {
        brand,
        lastFour,
        label: `${brand} final ${lastFour}`,
    };
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json()) as CardPaymentBody;
        const amount = Number(body.amount);
        const holderName = typeof body.holderName === 'string' ? body.holderName.trim() : '';
        const holderDocument = onlyDigits(body.holderDocument);
        const cardNumber = onlyDigits(body.cardNumber);
        const expiryMonth = onlyDigits(body.expiryMonth).padStart(2, '0');
        const expiryYear = onlyDigits(body.expiryYear);
        const cvv = onlyDigits(body.cvv);
        const phone = onlyDigits(body.phone);
        const saveCard = body.saveCard !== false;
        const savedCardId = typeof body.savedCardId === 'string' ? body.savedCardId.trim() : '';

        if (!Number.isFinite(amount) || amount < 1) {
            return NextResponse.json({ error: 'Valor minimo de R$ 1,00' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const asaasEnvironment = getAsaasEnvironment();

        if (savedCardId) {
            const savedCard = (user.savedCards || []).find((card) => card.id === savedCardId);

            if (!savedCard?.token || !savedCard.asaasCustomerId) {
                return NextResponse.json({ error: 'Cartao salvo invalido' }, { status: 400 });
            }

            if (savedCard.asaasEnvironment && savedCard.asaasEnvironment !== asaasEnvironment) {
                return NextResponse.json({ error: 'Cartao salvo indisponivel neste ambiente' }, { status: 400 });
            }

            const payment = await createAsaasSavedCardPayment({
                userId,
                amount,
                customerId: savedCard.asaasCustomerId,
                creditCardToken: savedCard.token,
                remoteIp: getRemoteIp(request),
            });

            const providerMappedStatus = mapAsaasPaymentStatus(payment.status);
            const initialStatus = providerMappedStatus === 'CANCELLED' ? 'CANCELLED' : 'PENDING';

            await Transaction.create({
                userId,
                abacatePayId: payment.id,
                amount,
                status: initialStatus,
                type: 'CC',
                source: 'recharge',
                metadata: {
                    provider: 'asaas',
                    asaasEnvironment,
                    asaasCustomerId: savedCard.asaasCustomerId,
                    savedCardId: savedCard.id,
                    method: 'CREDIT_CARD',
                    providerStatus: payment.status,
                    creditCardBrand: savedCard.brand,
                    creditCardNumber: savedCard.lastFour,
                    invoiceUrl: payment.invoiceUrl,
                    transactionReceiptUrl: payment.transactionReceiptUrl,
                },
            });

            return NextResponse.json({
                success: true,
                id: payment.id,
                transactionId: payment.id,
                status: initialStatus,
                providerStatus: payment.status,
                brand: savedCard.brand,
                lastFour: savedCard.lastFour,
            });
        }

        if (holderName.length < 3) {
            return NextResponse.json({ error: 'Informe o nome impresso no cartao' }, { status: 400 });
        }

        if (holderDocument.length !== 11) {
            return NextResponse.json({ error: 'Informe um CPF valido para o titular' }, { status: 400 });
        }

        if (cardNumber.length < 13 || cardNumber.length > 19 || expiryMonth.length !== 2 || ![2, 4].includes(expiryYear.length) || cvv.length < 3) {
            return NextResponse.json({ error: 'Dados do cartao invalidos' }, { status: 400 });
        }

        const normalizedExpiryYear = expiryYear.length === 2 ? `20${expiryYear}` : expiryYear;

        if (!validateExpiry(expiryMonth, normalizedExpiryYear)) {
            return NextResponse.json({ error: 'O cartao informado esta expirado' }, { status: 400 });
        }

        if (user.taxId !== holderDocument || (phone && user.phone !== phone)) {
            user.taxId = holderDocument;
            if (phone) user.phone = phone;
            await user.save();
        }

        const { customer, tokenizedCard, payment } = await createAsaasCardPayment({
            userId,
            amount,
            holderName,
            holderDocument,
            cardNumber,
            expiryMonth,
            expiryYear: normalizedExpiryYear,
            cvv,
            remoteIp: getRemoteIp(request),
            customer: {
                name: user.name || holderName,
                email: user.email,
                cpfCnpj: holderDocument,
                mobilePhone: phone || user.phone,
                externalReference: userId,
            },
        });

        const providerMappedStatus = mapAsaasPaymentStatus(payment.status);
        const initialStatus = providerMappedStatus === 'CANCELLED' ? 'CANCELLED' : 'PENDING';
        const cardDisplay = getCardDisplayData(tokenizedCard, cardNumber);

        if (saveCard && tokenizedCard.creditCardToken) {
            const existingCard = (user.savedCards || []).find((card) =>
                card.token === tokenizedCard.creditCardToken ||
                (
                    card.lastFour === cardDisplay.lastFour &&
                    card.brand.toLowerCase() === cardDisplay.brand.toLowerCase() &&
                    card.asaasCustomerId === customer.id &&
                    card.asaasEnvironment === asaasEnvironment
                )
            );

            if (existingCard) {
                existingCard.token = tokenizedCard.creditCardToken;
                existingCard.asaasCustomerId = customer.id;
                existingCard.asaasEnvironment = asaasEnvironment;
                existingCard.expiryMonth = expiryMonth;
                existingCard.expiryYear = normalizedExpiryYear;
                existingCard.label = cardDisplay.label;
                user.markModified('savedCards');
            } else {
                user.savedCards.push({
                    id: randomUUID(),
                    label: cardDisplay.label,
                    lastFour: cardDisplay.lastFour,
                    brand: cardDisplay.brand,
                    token: tokenizedCard.creditCardToken,
                    asaasCustomerId: customer.id,
                    asaasEnvironment,
                    expiryMonth,
                    expiryYear: normalizedExpiryYear,
                    createdAt: new Date(),
                });
            }

            await user.save();
        }

        await Transaction.create({
            userId,
            abacatePayId: payment.id,
            amount,
            status: initialStatus,
            type: 'CC',
            source: 'recharge',
            metadata: {
                provider: 'asaas',
                asaasEnvironment,
                asaasCustomerId: customer.id,
                method: 'CREDIT_CARD',
                providerStatus: payment.status,
                savedCard: saveCard,
                creditCardBrand: cardDisplay.brand || payment.creditCard?.creditCardBrand,
                creditCardNumber: cardDisplay.lastFour || payment.creditCard?.creditCardNumber,
                invoiceUrl: payment.invoiceUrl,
                transactionReceiptUrl: payment.transactionReceiptUrl,
            },
        });

        return NextResponse.json({
            success: true,
            id: payment.id,
            transactionId: payment.id,
            status: initialStatus,
            providerStatus: payment.status,
            brand: cardDisplay.brand || payment.creditCard?.creditCardBrand,
            lastFour: cardDisplay.lastFour || (payment.creditCard?.creditCardNumber || '').slice(-4),
        });
    } catch (error) {
        const providerError = error as { status?: number; payload?: unknown; message?: string };
        console.error(
            'Error creating Asaas card payment:',
            JSON.stringify(
                {
                    status: providerError.status,
                    message: providerError.message,
                    payload: providerError.payload,
                },
                null,
                2
            )
        );

        return NextResponse.json(
            {
                error: 'Erro ao processar cartao na Asaas',
                details: providerError.payload || providerError.message,
            },
            { status: providerError.status || 500 }
        );
    }
}
