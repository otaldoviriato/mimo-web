import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { createTransparentCardCharge } from '@/lib/abacatepay';
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
    installments?: number;
    phone?: string;
};

function onlyDigits(value: unknown) {
    return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

function asCleanString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}

function getCardBrand(number: string) {
    if (/^4/.test(number)) return 'Visa';
    if (/^5[1-5]/.test(number)) return 'Mastercard';
    if (/^3[47]/.test(number)) return 'Amex';
    if (/^6(?:011|5)/.test(number)) return 'Elo';
    return 'Cartao';
}

function validateExpiry(month: string, year: string) {
    const parsedMonth = Number(month);
    const parsedYear = Number(year.length === 2 ? `20${year}` : year);

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return false;
    }

    if (!Number.isInteger(parsedYear) || parsedYear < new Date().getFullYear()) {
        return false;
    }

    const expiresAt = new Date(parsedYear, parsedMonth, 1);
    const now = new Date();
    return expiresAt > new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = (await request.json()) as CardPaymentBody;
        const amount = Number(body.amount);
        const amountInCents = Math.round(amount * 100);
        const holderName = asCleanString(body.holderName);
        const holderDocument = onlyDigits(body.holderDocument);
        const cardNumber = onlyDigits(body.cardNumber);
        const expiryMonth = onlyDigits(body.expiryMonth).padStart(2, '0');
        const expiryYear = onlyDigits(body.expiryYear);
        const cvv = onlyDigits(body.cvv);
        const installments = Number(body.installments || 1);
        const phone = onlyDigits(body.phone);

        if (!Number.isFinite(amount) || amount < 1) {
            return NextResponse.json({ error: 'Valor mínimo de R$ 1,00' }, { status: 400 });
        }

        if (holderName.length < 3 || holderName.length > 80) {
            return NextResponse.json({ error: 'Informe o nome impresso no cartão' }, { status: 400 });
        }

        if (holderDocument.length !== 11) {
            return NextResponse.json({ error: 'Informe um CPF válido para o titular' }, { status: 400 });
        }

        if (cardNumber.length < 13 || cardNumber.length > 19) {
            return NextResponse.json({ error: 'Número do cartão inválido' }, { status: 400 });
        }

        if (!validateExpiry(expiryMonth, expiryYear)) {
            return NextResponse.json({ error: 'Validade do cartão inválida' }, { status: 400 });
        }

        if (cvv.length < 3 || cvv.length > 4) {
            return NextResponse.json({ error: 'CVV inválido' }, { status: 400 });
        }

        if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
            return NextResponse.json({ error: 'Número de parcelas inválido' }, { status: 400 });
        }

        if (installments > 1 && amountInCents / installments < 1000) {
            return NextResponse.json({ error: 'Cada parcela deve ter pelo menos R$ 10,00' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const externalId = `recharge_card_${userId}_${Date.now()}`;
        const brand = getCardBrand(cardNumber);
        const normalizedExpiryYear = expiryYear.length === 2 ? `20${expiryYear}` : expiryYear;

        const charge = await createTransparentCardCharge({
            amountInCents,
            description: 'Recarga de Saldo - MimoChat',
            externalId,
            customer: {
                name: user.name || holderName,
                email: user.email,
                taxId: holderDocument,
                cellphone: phone || user.phone || '',
            },
            card: {
                number: cardNumber,
                holderName,
                holderDocument,
                expirationMonth: expiryMonth,
                expirationYear: normalizedExpiryYear,
                cvv,
                installments,
            },
        });

        await Transaction.create({
            userId,
            abacatePayId: charge.id,
            amount,
            status: charge.status === 'PAID' ? 'PAID' : 'PENDING',
            type: 'CC',
            source: 'recharge',
            metadata: {
                externalId,
                method: 'CARD',
                brand,
                lastFour: cardNumber.slice(-4),
                installments,
                providerStatus: charge.status || 'PENDING',
                providerAmount: charge.amount,
                platformFee: charge.platformFee,
                receiptUrl: charge.receiptUrl,
            },
        });

        if (user.taxId !== holderDocument || (phone && user.phone !== phone)) {
            user.taxId = holderDocument;
            if (phone) user.phone = phone;
            await user.save();
        }

        return NextResponse.json({
            success: true,
            id: charge.id,
            transactionId: charge.id,
            status: charge.status || 'PENDING',
            brand,
            lastFour: cardNumber.slice(-4),
            installments,
        });
    } catch (error) {
        const providerError = error as { status?: number; payload?: unknown; message?: string };
        console.error('Error creating card payment:', {
            status: providerError.status,
            message: providerError.message,
            payload: providerError.payload,
        });

        return NextResponse.json(
            {
                error: 'Erro ao processar cartão na AbacatePay',
                details: providerError.payload || providerError.message,
            },
            { status: providerError.status || 500 }
        );
    }
}
