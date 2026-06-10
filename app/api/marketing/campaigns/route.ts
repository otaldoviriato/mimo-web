import { NextRequest, NextResponse } from 'next/server';
import { boundedNumber, cleanString, cleanStringArray, requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingCampaign } from '@/models/Marketing';

export async function GET(request: NextRequest) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;
    const campaigns = await MarketingCampaign.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, campaigns });
}

export async function POST(request: NextRequest) {
    try {
        const access = await requireMarketingAdmin(request, { limit: 30 });
        if (access.error) return access.error;
        const body = await request.json();
        const name = cleanString(body.name, 120);
        const targetDescription = cleanString(body.targetDescription, 4000);
        const minFollowers = boundedNumber(body.minFollowers, 0, 0, 1_000_000_000);
        const maxFollowers = boundedNumber(body.maxFollowers, 1_000_000, 0, 1_000_000_000);
        if (!name || !targetDescription) {
            return NextResponse.json({ error: 'Nome e descrição do público-alvo são obrigatórios.' }, { status: 400 });
        }
        if (maxFollowers < minFollowers) {
            return NextResponse.json({ error: 'O máximo de seguidores deve ser maior que o mínimo.' }, { status: 400 });
        }

        const campaign = await MarketingCampaign.create({
            name,
            description: cleanString(body.description, 2000),
            targetDescription,
            minFollowers,
            maxFollowers,
            positiveSignals: cleanStringArray(body.positiveSignals),
            negativeSignals: cleanStringArray(body.negativeSignals),
            status: 'active',
        });
        return NextResponse.json({ success: true, campaign }, { status: 201 });
    } catch (error) {
        console.error('Erro ao criar campanha:', error);
        return NextResponse.json({ error: 'Erro ao criar campanha.' }, { status: 500 });
    }
}
