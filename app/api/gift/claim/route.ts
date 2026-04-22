import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { GiftCode } from '@/models/GiftCode';
import { Transaction } from '@/models/Transaction';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const rawCode = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
        if (!rawCode) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

        await connectToDatabase();

        // Busca o cupom no banco
        const giftCode = await GiftCode.findOne({ code: rawCode, isActive: true });
        if (!giftCode) {
            return NextResponse.json({ error: 'invalid_code' }, { status: 404 });
        }

        // Verifica se o cupom expirou
        if (giftCode.expiresAt && giftCode.expiresAt < new Date()) {
            return NextResponse.json({ error: 'expired_code' }, { status: 410 });
        }

        // Verifica se atingiu o limite de usos totais
        if (giftCode.maxUses !== null && giftCode.maxUses !== undefined && giftCode.totalUses >= giftCode.maxUses) {
            return NextResponse.json({ error: 'code_exhausted' }, { status: 409 });
        }

        // Busca o usuário para validar público-alvo e uso anterior
        const user = await User.findOne({ clerkId: userId }).select('claimedGiftCodes isProfessional');
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // Valida se o perfil do usuário pode usar este cupom
        const audience = giftCode.targetAudience ?? 'all';
        if (audience === 'client' && user.isProfessional) {
            return NextResponse.json({ error: 'not_eligible' }, { status: 403 });
        }
        if (audience === 'professional' && !user.isProfessional) {
            return NextResponse.json({ error: 'not_eligible' }, { status: 403 });
        }

        // Verifica se este usuário já usou este cupom
        if (user.claimedGiftCodes?.includes(rawCode)) {
            return NextResponse.json({ error: 'already_claimed' }, { status: 409 });
        }

        const amount = giftCode.amount;

        // Credita saldo e contabiliza uso de forma atômica
        await Promise.all([
            User.findOneAndUpdate(
                { clerkId: userId },
                {
                    $inc: { balance: amount },
                    $push: { claimedGiftCodes: rawCode },
                }
            ),
            GiftCode.findByIdAndUpdate(giftCode._id, { $inc: { totalUses: 1 } }),
        ]);

        await Transaction.create({
            userId,
            amount,
            status: 'COMPLETED',
            type: 'credit',
            source: 'gift',
            metadata: { giftCode: rawCode },
            timestamp: new Date(),
        });

        return NextResponse.json({ success: true, amount });
    } catch (error) {
        console.error('Error claiming gift:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
