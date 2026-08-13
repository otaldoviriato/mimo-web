import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { recordAcquisitionEvent } from '@/lib/acquisitionAnalytics';
import { sanitizeReferralValue } from '@/lib/referral';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PUBLIC_EVENTS = new Set(['link_viewed', 'explore_profile_viewed']);

function cleanMetadata(value: unknown) {
    if (!value || typeof value !== 'object') return undefined;
    const source = value as Record<string, unknown>;
    const allowed = ['utmSource', 'utmMedium', 'utmCampaign'];
    const result: Record<string, string> = {};
    for (const key of allowed) {
        const clean = sanitizeReferralValue(source[key]);
        if (clean) result[key] = clean;
    }
    return Object.keys(result).length ? result : undefined;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as Record<string, unknown>;
        const eventType = typeof body.eventType === 'string' ? body.eventType : '';
        const professionalId = sanitizeReferralValue(body.professionalId);
        const visitorId = sanitizeReferralValue(body.visitorId);

        if (!PUBLIC_EVENTS.has(eventType) || !professionalId || !visitorId) {
            return NextResponse.json({ error: 'Evento invalido.' }, { status: 400 });
        }

        const { userId } = await auth();
        if (eventType === 'explore_profile_viewed' && !userId) {
            return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
        }

        await connectToDatabase();
        const professional = await User.findOne({ clerkId: professionalId, isProfessional: true })
            .select('clerkId')
            .lean();
        if (!professional) {
            return NextResponse.json({ error: 'Perfil profissional nao encontrado.' }, { status: 404 });
        }

        const day = new Date().toISOString().slice(0, 10);
        const actorKey = userId || visitorId;
        await recordAcquisitionEvent({
            eventType: eventType as 'link_viewed' | 'explore_profile_viewed',
            dedupeKey: `${eventType}:${actorKey}:${professionalId}:${day}`,
            actorId: userId || undefined,
            clientId: userId || undefined,
            visitorId,
            professionalId,
            origin: eventType === 'link_viewed' ? 'profile_share' : 'explore',
            metadata: cleanMetadata(body.metadata),
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Erro ao registrar evento de aquisicao:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
