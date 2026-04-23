import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { WithdrawRequest } from '@/models/WithdrawRequest';
import { Resend } from 'resend';

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

        if (!user.pixKey) {
            return NextResponse.json({ error: 'Chave Pix não configurada' }, { status: 400 });
        }

        if (user.balance <= 0) {
            return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });
        }

        const amountToWithdraw = user.balance;

        // 1. Cria o pedido de saque pendente
        const withdrawRequest = await WithdrawRequest.create({
            userId: user.clerkId,
            amount: amountToWithdraw,
            pixKey: user.pixKey,
            status: 'pendente',
        });

        // 2. Zera o saldo na carteira
        user.balance = 0;
        await user.save();

        // 3. Envia e-mail de notificação para viriatoceo@gmail.com
        try {
            await resend.emails.send({
                from: 'Mimo Financeiro <onboarding@resend.dev>', // Ou use um domínio próprio verificado se tiver (ex: financeiro@mimo.app)
                to: 'viriatoceo@gmail.com',
                subject: `Novo Pedido de Saque - ${user.username}`,
                html: `
                    <h2>Novo Pedido de Saque</h2>
                    <p>O usuário <strong>${user.name || user.username}</strong> (@${user.username}) solicitou um saque.</p>
                    <ul>
                        <li><strong>Valor:</strong> ${(amountToWithdraw / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</li>
                        <li><strong>Chave PIX:</strong> ${user.pixKey}</li>
                        <li><strong>ID do Pedido:</strong> ${withdrawRequest._id}</li>
                        <li><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                    </ul>
                    <p>O saldo na carteira do usuário foi zerado e o pedido consta como <strong>pendente</strong>.</p>
                `,
            });
        } catch (emailError) {
            console.error('Erro ao enviar email via Resend:', emailError);
            // Continua, pois o saque já foi registrado no banco.
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

        const pendingWithdrawal = await WithdrawRequest.findOne({ 
            userId: userId,
            status: 'pendente'
        }).sort({ createdAt: -1 });

        return NextResponse.json({ pendingWithdrawal });
    } catch (error: any) {
        console.error('Error getting pending withdrawal:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
