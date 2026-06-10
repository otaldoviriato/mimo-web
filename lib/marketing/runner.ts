import { connectToDatabase } from '@/lib/db';
import { decryptSecret } from '@/lib/marketing/crypto';
import { MarketingAIService } from '@/lib/marketing/ai';
import { compatibilityFromScore } from '@/lib/marketing/compatibility';
import { createMarketingDataProvider } from '@/lib/marketing/providers';
import {
    MarketingCampaign,
    MarketingCandidateInput,
    MarketingLead,
    MarketingRun,
    MarketingSeedProfile,
    MarketingSettings,
} from '@/models/Marketing';

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function addRunLog(runId: string, message: string) {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    await MarketingRun.findByIdAndUpdate(runId, {
        $push: { logs: `${timestamp} · ${message}` },
    });
}

async function isCancelled(runId: string) {
    const run = await MarketingRun.findById(runId).select('status').lean();
    return run?.status === 'cancelled';
}

function deduplicateCandidates(candidates: MarketingCandidateInput[]) {
    const unique = new Map<string, MarketingCandidateInput>();
    for (const candidate of candidates) {
        const username = candidate.username?.trim().replace(/^@/, '').toLowerCase();
        if (!username) continue;
        unique.set(username, { ...candidate, username });
    }
    return [...unique.values()];
}

export async function processMarketingRun(runId: string) {
    await connectToDatabase();
    const run = await MarketingRun.findById(runId).select('+inputCandidates');
    if (!run || run.status !== 'queued') return;

    try {
        run.status = 'running';
        run.startedAt = new Date();
        run.logs.push(`${new Date().toLocaleTimeString('pt-BR', { hour12: false })} · Rodada iniciada.`);
        await run.save();

        const [campaign, settings, seeds] = await Promise.all([
            MarketingCampaign.findById(run.campaignId),
            MarketingSettings.findOne({ key: 'global' }).select('+openAiApiKeyEncrypted'),
            MarketingSeedProfile.find({ _id: { $in: run.seedIds }, status: 'active' }),
        ]);
        if (!campaign) throw new Error('Campanha não encontrada.');
        if (!settings?.openAiApiKeyEncrypted) throw new Error('Configure uma chave da OpenAI antes de iniciar a rodada.');
        if (seeds.length === 0 && settings.providerType === 'mock') {
            throw new Error('Selecione ao menos um perfil-semente ativo.');
        }

        const apiKey = decryptSecret(settings.openAiApiKeyEncrypted);
        const ai = new MarketingAIService(apiKey, settings.openAiModel);
        const provider = createMarketingDataProvider(settings.providerType, run.inputCandidates);
        const seedUsernames = seeds.map(seed => seed.username);
        run.seedsUsed = seedUsernames;
        await run.save();

        await addRunLog(runId, `Provider ${settings.providerType} carregado.`);
        let candidates: MarketingCandidateInput[] = [];

        if (settings.providerType === 'manual' || settings.providerType === 'import') {
            candidates = run.inputCandidates;
        } else {
            for (const seed of seeds.slice(0, settings.maxSeedsPerRun)) {
                if (await isCancelled(runId)) return;
                const found = await provider.getCandidateInteractions(seed.username);
                candidates.push(...found);
                await MarketingSeedProfile.findByIdAndUpdate(seed._id, { lastUsedAt: new Date() });
                await addRunLog(runId, `${found.length} candidatos recebidos de @${seed.username}.`);
            }
        }

        candidates = deduplicateCandidates(candidates).filter(candidate => {
            const followers = candidate.followersCount || 0;
            return followers >= campaign.minFollowers && followers <= campaign.maxFollowers;
        });
        if (candidates.length === 0) {
            throw new Error('Nenhum candidato válido foi encontrado para os critérios da campanha.');
        }

        await addRunLog(runId, `${candidates.length} candidatos válidos. Priorizando com IA.`);
        const prioritizedUsernames = await ai.prioritizeCandidates(candidates, campaign, run.maxLeads);
        const prioritized = prioritizedUsernames
            .map(username => candidates.find(candidate => candidate.username === username))
            .filter((candidate): candidate is MarketingCandidateInput => Boolean(candidate));

        let saved = 0;
        for (const candidate of prioritized) {
            if (await isCancelled(runId)) return;

            const enriched = await provider.getProfileDetails(candidate.username);
            const prospect = { ...candidate, ...(enriched || {}), username: candidate.username };
            const score = await ai.scoreProspect(prospect, campaign);
            score.suggestedMessage = score.recommendation === 'reject'
                ? ''
                : await ai.generateOutreachMessage(prospect, campaign, score);

            await MarketingLead.findOneAndUpdate(
                { platform: 'instagram', username: prospect.username },
                {
                    $set: {
                        platform: 'instagram',
                        username: prospect.username,
                        displayName: prospect.displayName || '',
                        profileUrl: prospect.profileUrl || `https://www.instagram.com/${prospect.username}/`,
                        bio: prospect.bio || '',
                        followersCount: prospect.followersCount || 0,
                        followingCount: prospect.followingCount || 0,
                        postsCount: prospect.postsCount || 0,
                        externalLink: prospect.externalLink || '',
                        sourceSeedUsername: prospect.sourceSeedUsername || '',
                        sourceContext: [prospect.sourceContext, prospect.comments].filter(Boolean).join('\n'),
                        campaignId: campaign._id,
                        runId: run._id,
                        aiScore: score.score,
                        aiCompatibility: compatibilityFromScore(score.score),
                        aiSummary: score.summary,
                        aiPositiveSignals: score.positiveSignals,
                        aiRiskSignals: score.riskSignals,
                        aiRecommendation: score.recommendation,
                        suggestedMessage: score.suggestedMessage,
                    },
                    $setOnInsert: { status: 'new', notes: '' },
                },
                { upsert: true, new: true, runValidators: true }
            );
            saved += 1;
            await MarketingRun.findByIdAndUpdate(runId, { leadsFound: saved });
            await addRunLog(runId, `@${prospect.username} qualificada com score ${Math.round(score.score)}.`);

            const minDelay = settings.minDelaySeconds * 1000;
            const maxDelay = settings.maxDelaySeconds * 1000;
            if (maxDelay > 0) {
                await delay(Math.round(minDelay + Math.random() * Math.max(0, maxDelay - minDelay)));
            }
        }

        await MarketingRun.findByIdAndUpdate(runId, {
            status: 'completed',
            leadsFound: saved,
            finishedAt: new Date(),
            $push: { logs: `${new Date().toLocaleTimeString('pt-BR', { hour12: false })} · Rodada concluída com ${saved} leads.` },
            $unset: { inputCandidates: 1, errorMessage: 1 },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro inesperado na rodada.';
        await MarketingRun.findByIdAndUpdate(runId, {
            status: 'failed',
            errorMessage: message.slice(0, 2000),
            finishedAt: new Date(),
            $push: { logs: `${new Date().toLocaleTimeString('pt-BR', { hour12: false })} · Rodada falhou: ${message.slice(0, 500)}` },
            $unset: { inputCandidates: 1 },
        });
    }
}
