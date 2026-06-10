import { NextRequest, NextResponse } from 'next/server';
import { MarketingAIService } from '@/lib/marketing/ai';
import {
    copilotCorsHeaders,
    copilotJson,
    requireCopilotAccess,
    sanitizeDiscoveryCollection,
} from '@/lib/marketing/copilot';
import { decryptSecret } from '@/lib/marketing/crypto';
import { cleanString } from '@/lib/marketing/security';
import { MarketingSettings } from '@/models/Marketing';

export function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: copilotCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
    try {
        const access = await requireCopilotAccess(request);
        if (!access.authorized) {
            return copilotJson(request, { error: 'Não autorizado.' }, 401);
        }

        const body = await request.json().catch(() => ({})) as Record<string, unknown>;
        const candidates = sanitizeDiscoveryCollection(body.candidates, 150, 10_000);
        if (!candidates.length) {
            return copilotJson(request, { error: 'Nenhum candidato foi encontrado na sessão.' }, 400);
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

        const service = new MarketingAIService(
            decryptSecret(settings.openAiApiKeyEncrypted),
            settings.openAiModel || 'gpt-5.4-mini'
        );
        const result = await service.prioritizeScoutCandidates({
            seedProfile: body.seedProfile || {},
            analyzedPages: sanitizeDiscoveryCollection(body.analyzedPages, 40, 10_000),
            candidates,
            targetDescription: cleanString(body.targetDescription, 2000),
        });

        const allowed = new Set(candidates.map(item => {
            const candidate = item as { username?: unknown };
            return cleanString(candidate.username, 100).toLowerCase().replace(/^@/, '');
        }));
        const recommendedCandidates = result.recommendedCandidates
            .map(item => ({
                ...item,
                username: cleanString(item.username, 100).toLowerCase().replace(/^@/, ''),
                score: Math.max(0, Math.min(100, Math.round(item.score))),
            }))
            .filter(item => allowed.has(item.username))
            .slice(0, 10);

        return copilotJson(request, { ...result, recommendedCandidates });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível priorizar candidatos.';
        return copilotJson(request, { error: message }, 500);
    }
}
