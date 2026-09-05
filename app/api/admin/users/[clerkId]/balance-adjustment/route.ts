import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AppSettings } from '@/models/AppSettings';
import { Transaction } from '@/models/Transaction';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ clerkId: string }> }
) {
    try {
        const { userId: adminUserId } = await auth();
        if (!adminUserId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { clerkId } = await params;
        if (!clerkId) {
            return NextResponse.json({ error: 'ID do usuário obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings ? settings.adminClerkIds.includes(adminUserId) || adminUserId === FALLBACK_ADMIN : adminUserId === FALLBACK_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { type, amount, targetBalance, justification } = body;

        if (!type || !['credit', 'debit'].includes(type)) {
            return NextResponse.json({ error: 'Tipo de ajuste inválido. Deve ser "credit" ou "debit".' }, { status: 400 });
        }

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return NextResponse.json({ error: 'O valor da movimentação deve ser maior que zero.' }, { status: 400 });
        }

        if (!justification || typeof justification !== 'string' || justification.trim().length < 5) {
            return NextResponse.json({ error: 'A justificativa é obrigatória e deve ter no mínimo 5 caracteres.' }, { status: 400 });
        }

        const user = await User.findOne({ clerkId });
        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        const currentBalanceCents = Math.round(Number(user.balance) || 0);
        const amountCents = Math.round(numericAmount * 100);

        if (type === 'debit' && currentBalanceCents < amountCents) {
            const currentBRL = (currentBalanceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            return NextResponse.json({ 
                error: `O débito informado excede o saldo atual do usuário (${currentBRL}). O saldo não pode ficar negativo.` 
            }, { status: 400 });
        }

        const deltaCents = type === 'credit' ? amountCents : -amountCents;

        // Atualização atômica dos campos monetários sem regravar o documento inteiro
        const incFields: Record<string, number> = { balance: deltaCents };
        if (user.marketplaceWalletMigratedAt) {
            if (user.isProfessional) {
                incFields.professionalAvailableCents = deltaCents;
            } else {
                incFields.customerCashAvailableCents = deltaCents;
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            { clerkId },
            { $inc: incFields },
            { returnDocument: 'after' }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: 'Falha ao atualizar saldo do usuário.' }, { status: 500 });
        }

        const cleanJustification = justification.trim();

        // Cria o registro oficial de transação
        const transaction = await Transaction.create({
            userId: clerkId,
            amount: numericAmount, // em Reais (BRL)
            status: 'COMPLETED',
            type: type,
            source: 'adjustment',
            timestamp: new Date(),
            metadata: {
                adjustmentType: type,
                justification: cleanJustification,
                adminClerkId: adminUserId,
                previousBalanceCents: currentBalanceCents,
                newBalanceCents: updatedUser.balance,
                deltaCents,
                previousBalance: currentBalanceCents / 100,
                newBalance: (updatedUser.balance || 0) / 100,
                delta: deltaCents / 100,
                requestedTargetBalance: targetBalance !== undefined ? Number(targetBalance) : undefined,
            }
        });

        return NextResponse.json({
            success: true,
            newBalance: (updatedUser.balance || 0) / 100,
            transaction: {
                id: transaction._id.toString(),
                amount: numericAmount,
                type,
                source: 'adjustment',
                status: 'COMPLETED',
                justification: cleanJustification,
                createdAt: transaction.timestamp,
            }
        });

    } catch (error: any) {
        console.error('Erro ao realizar ajuste de saldo pelo admin:', error);
        return NextResponse.json({ error: 'Erro interno ao realizar ajuste de saldo.' }, { status: 500 });
    }
}
