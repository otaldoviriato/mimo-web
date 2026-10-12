import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ProfilePromotion } from '@/models/ProfilePromotion';

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        await connectToDatabase();

        const now = new Date();
        const activePromotion = await ProfilePromotion.findOne({
            professionalId: userId,
            status: 'active',
        });

        if (!activePromotion) {
            await User.updateOne({ clerkId: userId }, { $set: { isAvailable: false } });
            return NextResponse.json({ success: true, message: 'Nenhuma divulgação ativa.' });
        }

        await ProfilePromotion.updateOne(
            { _id: activePromotion._id },
            { $set: { status: 'cancelled', endedAt: now } }
        );

        await User.updateOne(
            { clerkId: userId },
            { $set: { isAvailable: false } }
        );

        return NextResponse.json({
            success: true,
            message: 'Divulgação encerrada.',
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Erro ao encerrar divulgação' }, { status: 500 });
    }
}
