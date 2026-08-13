import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { ProfessionalActivation } from '@/models/ProfessionalActivation';
import { recordAcquisitionEvent } from '@/lib/acquisitionAnalytics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ProfessionalRow = {
    clerkId: string;
    isProfessional?: boolean;
    name?: string;
    username?: string;
};

type ShareActivationRow = {
    shareClickCount?: number;
    lastShareClickedAt?: Date | string | null;
};

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const professional = await User.findOne({ clerkId: userId })
            .select('clerkId isProfessional name username')
            .lean() as ProfessionalRow | null;

        if (!professional?.isProfessional) {
            return NextResponse.json({ error: 'Apenas profissionais podem registrar compartilhamento.' }, { status: 403 });
        }

        const now = new Date();
        const body = await request.json().catch(() => ({})) as { channel?: string; eventId?: string };
        const channel = ['native_share', 'clipboard', 'copy_button'].includes(body.channel || '')
            ? body.channel
            : 'unknown';

        const activation = await ProfessionalActivation.findOneAndUpdate(
            { professionalId: userId },
            {
                $setOnInsert: {
                    professionalId: userId,
                    status: 'pending',
                    stage: 'Profissional cadastrada',
                    notes: '',
                    nextSteps: '',
                    contactedAt: null,
                    activatedAt: null,
                    firstShareClickedAt: now,
                },
                $set: {
                    lastShareClickedAt: now,
                },
                $inc: {
                    shareClickCount: 1,
                },
            },
            { upsert: true, new: true }
        ).lean() as ShareActivationRow | null;

        const eventId = typeof body.eventId === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(body.eventId)
            ? body.eventId
            : `${userId}:${now.getTime()}`;
        await recordAcquisitionEvent({
            eventType: 'link_shared',
            dedupeKey: `link_shared:${eventId}`,
            actorId: userId,
            professionalId: userId,
            origin: 'profile_share',
            occurredAt: now,
            metadata: { channel },
        });

        return NextResponse.json({
            success: true,
            shareClickCount: activation?.shareClickCount || 1,
            lastShareClickedAt: activation?.lastShareClickedAt || now,
        });
    } catch (error: unknown) {
        console.error('Erro ao registrar clique de compartilhamento:', error);
        const message = error instanceof Error ? error.message : 'Erro interno do servidor';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
