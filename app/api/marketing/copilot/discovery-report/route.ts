import { Types } from 'mongoose';
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
import {
    MarketingDiscoveryReport,
    MarketingLead,
    MarketingSettings,
} from '@/models/Marketing';

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
        const session = body.session && typeof body.session === 'object'
            ? body.session as Record<string, unknown>
            : {};
        const seedProfile = body.seedProfile && typeof body.seedProfile === 'object'
            ? body.seedProfile as Record<string, unknown>
            : {};
        const sessionId = cleanString(session.id, 100);
        if (!sessionId) {
            return copilotJson(request, { error: 'Sessão de descoberta inválida.' }, 400);
        }

        const analyzedPages = sanitizeDiscoveryCollection(body.analyzedPages, 40, 15_000);
        const candidates = sanitizeDiscoveryCollection(body.candidates, 150, 15_000);
        const savedLeads = sanitizeDiscoveryCollection(body.savedLeads, 150, 5000);
        const usernames = candidates
            .map(item => cleanString((item as { username?: unknown }).username, 100).toLowerCase().replace(/^@/, ''))
            .filter(Boolean);
        const existingLeads = await MarketingLead.find({
            platform: 'instagram',
            username: { $in: usernames },
        }).select('_id').lean();
        const suppliedLeadIds = savedLeads
            .map(item => cleanString((item as { leadId?: unknown }).leadId, 100))
            .filter(value => Types.ObjectId.isValid(value))
            .map(value => new Types.ObjectId(value));
        const leadIds = [
            ...new Map(
                [...existingLeads.map(item => item._id), ...suppliedLeadIds]
                    .map(id => [String(id), id])
            ).values(),
        ];

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
        const reportSummary = await service.summarizeDiscoveryReport({
            seedProfile,
            analyzedPages,
            candidates,
            savedLeads,
            summary: cleanString(body.summary, 5000),
        });

        const report = await MarketingDiscoveryReport.findOneAndUpdate(
            { sessionId },
            {
                $set: {
                    seedUsername: cleanString(session.seedUsername || seedProfile.username, 100)
                        .toLowerCase()
                        .replace(/^@/, ''),
                    seedProfileUrl: cleanString(session.seedProfileUrl || seedProfile.url, 1500),
                    status: 'received',
                    summary: reportSummary.summary,
                    highlights: reportSummary.highlights,
                    risks: reportSummary.risks,
                    nextSuggestedStep: reportSummary.nextSuggestedStep,
                    analyzedPages,
                    candidates,
                    savedLeads,
                    leadIds,
                    source: 'mimo-scout-extension',
                    submittedBy: access.actor || '',
                    startedAt: session.startedAt ? new Date(cleanString(session.startedAt, 100)) : undefined,
                },
                $setOnInsert: { sessionId },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean();

        return copilotJson(request, {
            success: true,
            reportId: String(report._id),
            summary: report.summary,
            associatedLeadCount: leadIds.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível salvar o relatório.';
        return copilotJson(request, { error: message }, 500);
    }
}
