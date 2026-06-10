import mongoose from 'mongoose';
import { after, NextRequest, NextResponse } from 'next/server';
import { boundedNumber, requireMarketingAdmin } from '@/lib/marketing/security';
import { normalizeCandidateList } from '@/lib/marketing/validation';
import { processMarketingRun } from '@/lib/marketing/runner';
import {
    MarketingCampaign,
    MarketingRun,
    MarketingSeedProfile,
    MarketingSettings,
} from '@/models/Marketing';

export async function GET(request: NextRequest) {
    const access = await requireMarketingAdmin(request);
    if (access.error) return access.error;
    const runs = await MarketingRun.find()
        .populate('campaignId', 'name')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    return NextResponse.json({ success: true, runs });
}

export async function POST(request: NextRequest) {
    try {
        const access = await requireMarketingAdmin(request, { limit: 10, windowMs: 60 * 60 * 1000 });
        if (access.error) return access.error;
        const body = await request.json();
        if (typeof body.campaignId !== 'string' || !mongoose.Types.ObjectId.isValid(body.campaignId)) {
            return NextResponse.json({ error: 'Selecione uma campanha válida.' }, { status: 400 });
        }
        const [campaign, settings] = await Promise.all([
            MarketingCampaign.findOne({ _id: body.campaignId, status: 'active' }).lean(),
            MarketingSettings.findOne({ key: 'global' }).lean(),
        ]);
        if (!campaign) return NextResponse.json({ error: 'Selecione uma campanha ativa.' }, { status: 400 });
        if (!settings) return NextResponse.json({ error: 'Configure o módulo de marketing primeiro.' }, { status: 400 });

        const seedIds = Array.isArray(body.seedIds)
            ? body.seedIds
                .filter((id: unknown): id is string => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
                .slice(0, settings.maxSeedsPerRun)
            : [];
        const validSeeds = await MarketingSeedProfile.find({ _id: { $in: seedIds }, status: 'active' }).select('_id');
        const candidates = normalizeCandidateList(body.candidates);
        if (['manual', 'import'].includes(settings.providerType) && candidates.length === 0) {
            return NextResponse.json(
                { error: 'Inclua ao menos um candidato para o provider manual/import.' },
                { status: 400 }
            );
        }
        if (settings.providerType === 'mock' && validSeeds.length === 0) {
            return NextResponse.json({ error: 'Selecione ao menos um perfil-semente.' }, { status: 400 });
        }

        const run = await MarketingRun.create({
            campaignId: campaign._id,
            status: 'queued',
            maxLeads: boundedNumber(body.maxLeads, settings.maxLeadsPerRun, 1, settings.maxLeadsPerRun),
            seedIds: validSeeds.map(seed => seed._id),
            seedsUsed: [],
            leadsFound: 0,
            logs: ['Rodada criada e aguardando processamento.'],
            inputCandidates: candidates,
        });

        after(() => processMarketingRun(run.id));
        return NextResponse.json({ success: true, run }, { status: 202 });
    } catch (error) {
        console.error('Erro ao iniciar rodada:', error);
        return NextResponse.json({ error: 'Erro ao iniciar rodada.' }, { status: 500 });
    }
}
