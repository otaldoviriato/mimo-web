import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { AppSettings } from '@/models/AppSettings';
import { createAsaasPixTransfer } from '@/lib/asaas';

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
            // APROVAR SAQUE VIA PIX AUTOMÁTICO DO ASAAS:
            try {
                const transfer = await createAsaasPixTransfer(withdraw.amount, withdraw.pixKey);
                
                withdraw.status = 'processando';
                withdraw.asaasTransferId = transfer.id;
                await withdraw.save();
            } catch (apiError: any) {
                console.error('Erro ao chamar API do Asaas para transferência:', apiError);
                
                let message = 'Falha ao iniciar transferência no Asaas';
                if (apiError.payload?.errors && apiError.payload.errors.length > 0) {
                    message = apiError.payload.errors.map((e: any) => e.description).join(', ');
                }
                
                return NextResponse.json({ 
                    error: `Erro na API do Asaas: ${message}` 
                }, { status: 400 });
            }

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
