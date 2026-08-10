import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const user = await User.findOneAndUpdate(
            { clerkId: userId },
            { $set: { activationLastViewedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            activationLastViewedAt: user.activationLastViewedAt,
        });
    } catch (error: any) {
        console.error('Erro ao registrar visualização da aba de ativação:', error);
        return NextResponse.json({ error: 'Erro interno ao atualizar visualização' }, { status: 500 });
    }
}
