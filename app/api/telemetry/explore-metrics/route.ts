import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { isStaffOrAdmin } from '@/lib/internalStaff';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (userId && (await isStaffOrAdmin(userId))) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Administradores e membros da equipe não impactam métricas de atratividade.',
            });
        }

        const body = await request.json().catch(() => ({}));
        const impressions = Array.isArray(body.impressions)
            ? (body.impressions as unknown[]).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            : [];
        const click = typeof body.click === 'string' && body.click.trim().length > 0 ? body.click.trim() : null;

        if (impressions.length === 0 && !click) {
            return NextResponse.json({ success: true, updated: 0 });
        }

        await connectToDatabase();

        const promises: Promise<unknown>[] = [];

        // Incremento atômico das exibições (impressões) dos cards observados
        if (impressions.length > 0) {
            promises.push(
                User.updateMany(
                    { clerkId: { $in: impressions } },
                    { $inc: { impressionsCount: 1 } }
                )
            );
        }

        // Incremento atômico do clique recebido pelo card
        if (click) {
            promises.push(
                User.updateOne(
                    { clerkId: click },
                    { $inc: { clicksCount: 1 } }
                )
            );
        }

        await Promise.all(promises);

        return NextResponse.json({ success: true, impressionsCount: impressions.length, hasClick: Boolean(click) });
    } catch (error) {
        console.error('Erro ao registrar telemetria do Explorar:', error);
        return NextResponse.json({ error: 'Erro interno ao registrar telemetria.' }, { status: 500 });
    }
}
