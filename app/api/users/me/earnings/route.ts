import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const otherUserId = searchParams.get('otherUserId');

        // Busca os créditos mais recentes (ganhos) do usuário
        const query: any = {
            userId: clerkId,
            type: 'credit',
            source: { $in: ['message', 'image_unlock', 'gift'] }
        };

        if (otherUserId) {
            query.relatedUserId = otherUserId;
        }

        const recentCredits = await Transaction.find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();

        if (recentCredits.length === 0) {
            return NextResponse.json({ lastSessionEarnings: 0 });
        }

        let totalEarnings = 0;
        const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

        // A lógica: começamos do crédito mais recente e voltamos no tempo
        // enquanto o intervalo entre eles for menor que 4 horas
        
        totalEarnings += recentCredits[0].amount;
        
        for (let i = 1; i < recentCredits.length; i++) {
            const current = new Date(recentCredits[i-1].timestamp).getTime();
            const prev = new Date(recentCredits[i].timestamp).getTime();
            
            const diff = current - prev;
            
            if (diff > FOUR_HOURS_MS) {
                // Gap de mais de 4 horas encontrado, a sessão anterior acabou aqui
                break;
            }
            
            totalEarnings += recentCredits[i].amount;
        }

        return NextResponse.json({ 
            lastSessionEarnings: totalEarnings 
        });

    } catch (error) {
        console.error('Error calculating recent earnings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
