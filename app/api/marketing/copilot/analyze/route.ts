import { NextRequest, NextResponse } from 'next/server';
import { MarketingAIService } from '@/lib/marketing/ai';
import {
    copilotCorsHeaders,
    copilotJson,
    requireCopilotAccess,
    sanitizeScoutPayload,
} from '@/lib/marketing/copilot';
import { decryptSecret } from '@/lib/marketing/crypto';
import { normalizeScoringCriteria } from '@/lib/marketing/criteria';
import { MarketingSettings } from '@/models/Marketing';

export function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: copilotCorsHeaders(request) });
}

export async function GET(request: NextRequest) {
    const access = await requireCopilotAccess(request);
    if (!access.authorized) {
        return copilotJson(request, { error: 'Não autorizado.' }, 401);
    }
    return copilotJson(request, { success: true, message: 'Conexão com o Mimo Growth realizada.' });
}

export async function POST(request: NextRequest) {
    try {
        const access = await requireCopilotAccess(request);
        if (!access.authorized) {
            return copilotJson(request, { error: 'Não autorizado.' }, 401);
        }

        const profile = sanitizeScoutPayload(await request.json().catch(() => ({})));
        if (profile.platform !== 'instagram' || !profile.url.includes('instagram.com/')) {
            return copilotJson(request, { error: 'Envie uma página válida do Instagram.' }, 400);
        }
        if (!profile.username && !profile.visibleTexts.length) {
            return copilotJson(request, { error: 'Não há dados visíveis suficientes para analisar.' }, 400);
        }

        const settings = await MarketingSettings.findOne({ key: 'global' })
            .select('+openAiApiKeyEncrypted')
            .lean();
        if (!settings?.openAiApiKeyEncrypted) {
            return copilotJson(
                request,
                { error: 'A OpenAI ainda não foi configurada no backoffice de marketing.' },
                503
            );
        }

        const apiKey = decryptSecret(settings.openAiApiKeyEncrypted);
        const service = new MarketingAIService(apiKey, settings.openAiModel || 'gpt-5.4-mini');
        const analysis = await service.analyzeScoutProfile(
            {
                ...profile,
                candidateHistory: profile.candidateHistory.slice(0, 50),
            },
            normalizeScoringCriteria(settings.scoringCriteria)
        );
        return copilotJson(request, {
            ...analysis,
            score: Math.max(0, Math.min(100, Math.round(analysis.score))),
            leadId: '',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível analisar o perfil.';
        return copilotJson(request, { error: message }, 500);
    }
}
