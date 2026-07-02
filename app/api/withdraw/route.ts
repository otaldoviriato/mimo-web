import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { Transaction } from '@/models/Transaction';
import { Resend } from 'resend';
import { createAsaasPixTransfer } from '@/lib/asaas';

// Inicializa a Resend (certifique-se de adicionar RESEND_API_KEY no .env.local)
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

// POST /api/withdraw - Solicita um novo saque
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.taxId) {
            return NextResponse.json({ error: 'CPF não cadastrado. É necessário ter um CPF verificado para realizar saques.' }, { status: 400 });
        }

        if (user.balance <= 0) {
            return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });
        }

        // 1. Contabiliza a quantidade de saques do mês corrente (não rejeitados)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyWithdrawalsCount = await WithdrawRequest.countDocuments({
            userId: user.clerkId,
            status: { $ne: 'rejeitado' },
            createdAt: { $gte: startOfMonth }
        });

        // 2. Determina a taxa aplicável (R$ 2,00 a partir do 6º saque do mês)
        let fee = 0;
        if (monthlyWithdrawalsCount >= 5) {
            fee = 200; // R$ 2,00 em centavos
        }

        const amountToWithdraw = user.balance; // Valor bruto a debitar

        // 3. Validação do saldo suficiente para cobrir a taxa
        if (fee > 0 && amountToWithdraw <= fee) {
            return NextResponse.json({ error: 'Você não pode realizar o saque porque, a partir do quinto saque, é cobrado R$ 2 no saque e você não tem nem R$ 2 pra poder sacar.' }, { status: 400 });
        }

        const netAmount = amountToWithdraw - fee; // Valor líquido que será transferido

        // 4. Iniciar transferência Pix automática no Asaas com valor líquido (netAmount)
        let asaasTransferId = undefined;
        const isDev = process.env.NODE_ENV === 'development' || process.env.MOCK_ASAAS === 'true';

        if (isDev) {
            asaasTransferId = `transfer_mock_${Math.random().toString(36).substring(2, 11)}`;
            console.log(`[MOCK_ASAAS] Simulando transferência de R$ ${netAmount / 100} para a chave ${user.taxId}. ID: ${asaasTransferId}`);
        } else {
            try {
                const transfer = await createAsaasPixTransfer(netAmount, user.taxId);
                asaasTransferId = transfer.id;
            } catch (apiError: any) {
                console.error('Erro ao chamar API do Asaas para transferência na criação do saque:', apiError);
                
                let message = 'Falha ao iniciar transferência no Asaas';
                if (apiError.payload?.errors && apiError.payload.errors.length > 0) {
                    message = apiError.payload.errors.map((e: any) => e.description).join(', ');
                }
                
                return NextResponse.json({ 
                    error: `Erro na API do Asaas: ${message}` 
                }, { status: 400 });
            }
        }

        // 5. Cria o pedido de saque como processando (com fee e netAmount registrados)
        const withdrawRequest = await WithdrawRequest.create({
            userId: user.clerkId,
            amount: amountToWithdraw, // Guarda o bruto debitado
            fee,
            netAmount,
            pixKey: user.taxId,
            status: 'processando',
            asaasTransferId,
        });

        // 6. Zera o saldo na carteira
        user.balance = 0;
        await user.save();

        // 7. Envia e-mail de notificação para viriatoceo@gmail.com com detalhes da taxa
        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mimochat.com.br';
            await resend.emails.send({
                from: 'Mimo Financeiro <onboarding@resend.dev>', // Ou use um domínio próprio verificado se tiver (ex: financeiro@mimo.app)
                to: 'viriatoceo@gmail.com',
                subject: `Novo Pedido de Saque - ${user.username}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #1e293b; margin-top: 0;">Novo Pedido de Saque</h2>
                        <p style="color: #475569; font-size: 16px;">O usuário <strong>${user.name || user.username}</strong> (@${user.username}) solicitou um saque.</p>
                        <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                            <li style="margin-bottom: 8px;"><strong>Valor Bruto Debitado:</strong> ${(amountToWithdraw / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</li>
                            <li style="margin-bottom: 8px;"><strong>Taxa de Saque Cobrada:</strong> ${(fee / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</li>
                            <li style="margin-bottom: 8px;"><strong>Valor Líquido Enviado:</strong> ${(netAmount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</li>
                            <li style="margin-bottom: 8px;"><strong>CPF / Chave PIX:</strong> ${withdrawRequest.pixKey}</li>
                            <li style="margin-bottom: 8px;"><strong>ID do Pedido:</strong> ${withdrawRequest._id}</li>
                            <li style="margin-bottom: 0;"><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                        </ul>
                        <p style="color: #475569; margin-bottom: 25px;">O saldo na carteira do usuário foi zerado e o pedido consta como <strong>processando (enviado ao Asaas)</strong>.</p>
                        <a href="${appUrl}/admin?tab=withdrawals" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; text-align: center;">Aprovar ou Rejeitar Saque</a>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error('Erro ao enviar email via Resend:', emailError);
            // Continua, pois o saque já foi registrado no banco.
        }

        // 8. Se for ambiente de desenvolvimento, simula a aprovação automática do saque após 5 segundos em background
        if (isDev) {
            setTimeout(async () => {
                try {
                    await connectToDatabase();
                    const withdraw = await WithdrawRequest.findById(withdrawRequest._id);
                    if (withdraw && withdraw.status === 'processando') {
                        withdraw.status = 'concluido';
                        await withdraw.save();

                        const existingTx = await Transaction.findOne({ 'metadata.withdrawRequestId': withdraw._id.toString() });
                        if (!existingTx) {
                            await Transaction.create({
                                userId: withdraw.userId,
                                amount: withdraw.amount / 100, // em reais
                                status: 'COMPLETED',
                                type: 'debit',
                                source: 'withdrawal',
                                timestamp: new Date(),
                                metadata: {
                                    withdrawRequestId: withdraw._id.toString(),
                                    pixKey: withdraw.pixKey,
                                    asaasTransferId: withdraw.asaasTransferId
                                }
                            });
                        }
                        console.log(`[MOCK_ASAAS] Simulação de saque concluída com sucesso para o ID: ${withdraw._id}`);
                    }
                } catch (simError) {
                    console.error('[MOCK_ASAAS] Erro ao processar simulação de conclusão de saque:', simError);
                }
            }, 5000); // 5 segundos de delay
        }

        return NextResponse.json({ success: true, withdrawRequest }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating withdraw request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/withdraw - Retorna o saque pendente do usuário atual
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        if (request.nextUrl.searchParams.get('history') === 'true') {
            const withdrawals = await WithdrawRequest.find({
                userId,
            })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            return NextResponse.json({
                withdrawals: withdrawals.map((withdrawal: any) => ({
                    id: withdrawal._id?.toString(),
                    amount: withdrawal.amount,
                    fee: withdrawal.fee || 0,
                    netAmount: withdrawal.netAmount ?? withdrawal.amount,
                    status: withdrawal.status,
                    createdAt: withdrawal.createdAt,
                })),
            });
        }

        const pendingWithdrawal = await WithdrawRequest.findOne({ 
            userId: userId,
            status: { $in: ['pendente', 'processando'] },
        }).sort({ createdAt: -1 });

        return NextResponse.json({ pendingWithdrawal });
    } catch (error: any) {
        console.error('Error getting pending withdrawal:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
