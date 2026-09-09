import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { CampaignVisit } from '@/models/CampaignVisit';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const body = await request.json();
        const visitorId = String(body.visitorId || '').trim();

        if (!visitorId) {
            return NextResponse.json({ error: 'visitorId é obrigatório' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOne({ clerkId: userId }).select('createdAt').lean();

        // Vincula a visita do visitorId ao userId autenticado e marca cadastro se ainda não marcado
        const signupDate = user?.createdAt || new Date();

        const result = await CampaignVisit.updateMany(
            { visitorId, $or: [{ userId: null }, { userId: '' }, { userId: { $exists: false } }] },
            {
                $set: {
                    userId,
                    signupCompletedAt: signupDate,
                }
            }
        );

        return NextResponse.json({
            success: true,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        });
    } catch (error: any) {
        console.error('Erro ao sincronizar usuário de campanha:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
