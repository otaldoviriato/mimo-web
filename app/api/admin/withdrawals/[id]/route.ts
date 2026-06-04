import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'ID da solicitação é obrigatório' }, { status: 400 });
        }

        const body = await request.json();
        const { action } = body;

        if (action !== 'approve' && action !== 'reject') {
            return NextResponse.json({ error: 'Ação inválida. Deve ser "approve" ou "reject"' }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Validar se o usuário é administrador
        const settings = await AppSettings.findOne({ key: 'global' });
        const isAdmin = settings 
            ? settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN 
            : userId === FALLBACK_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        // 2. Buscar a solicitação de saque no banco
        const withdraw = await WithdrawRequest.findById(id);
        if (!withdraw) {
            return NextResponse.json({ error: 'Solicitação de saque não encontrada' }, { status: 404 });
        }

        if (withdraw.status !== 'pendente') {
            return NextResponse.json({ error: 'Esta solicitação de saque já foi processada' }, { status: 400 });
        }

        if (action === 'approve') {
            // APROVAR SAQUE:
            // 1. Atualiza status no banco para 'concluido'
            withdraw.status = 'concluido';
            await withdraw.save();

            // 2. Cria registro na tabela macro de Transaction
            // Salvamos amount em REAIS para unificar a tabela de transações macro
            await Transaction.create({
                userId: withdraw.userId,
                amount: withdraw.amount / 100, // em reais
                status: 'COMPLETED',
                type: 'debit',
                source: 'withdrawal',
                timestamp: new Date(),
                metadata: {
                    withdrawRequestId: withdraw._id.toString(),
                    pixKey: withdraw.pixKey
                }
            });

        } else if (action === 'reject') {
            // REJEITAR SAQUE:
            // 1. Devolve o saldo retido para a profissional (no banco, em centavos)
            const user = await User.findOneAndUpdate(
                { clerkId: withdraw.userId },
                { $inc: { balance: withdraw.amount } }
            );

            if (!user) {
                return NextResponse.json({ error: 'Profissional associada a este saque não encontrada no banco' }, { status: 404 });
            }

            // 2. Atualiza status para 'rejeitado'
            withdraw.status = 'rejeitado';
            await withdraw.save();
        }

        return NextResponse.json({ success: true, status: withdraw.status });

    } catch (error: any) {
        console.error('Erro ao processar saque:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
