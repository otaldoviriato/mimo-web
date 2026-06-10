import { NextRequest, NextResponse } from 'next/server';
import {
    copilotCorsHeaders,
    copilotJson,
    parseVisibleCount,
    requireCopilotAccess,
    sanitizeScoutPayload,
} from '@/lib/marketing/copilot';
import { boundedNumber, cleanString, cleanStringArray } from '@/lib/marketing/security';
import { MarketingLead, MarketingRecommendation } from '@/models/Marketing';

const recommendations: MarketingRecommendation[] = ['approve', 'review', 'reject'];

export function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 204, headers: copilotCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
    try {
        const access = await requireCopilotAccess(request);
        if (!access.authorized) {
            return copilotJson(request, { error: 'Não autorizado.' }, 401);
        }

        const rawBody = await request.json().catch(() => ({}));
        const body = rawBody && typeof rawBody === 'object'
            ? rawBody as Record<string, unknown>
            : {};
        const profile = sanitizeScoutPayload(body);
        const recommendation = cleanString(body.aiRecommendation, 20) as MarketingRecommendation;

        if (profile.platform !== 'instagram' || !profile.username || !profile.url) {
            return copilotJson(request, { error: 'Perfil do Instagram incompleto.' }, 400);
        }
        if (!recommendations.includes(recommendation)) {
            return copilotJson(request, { error: 'Recomendação da IA inválida.' }, 400);
        }

        const existing = await MarketingLead.findOne({
            platform: profile.platform,
            username: profile.username,
        }).select('_id').lean();

        const lead = await MarketingLead.findOneAndUpdate(
            { platform: profile.platform, username: profile.username },
            {
                $set: {
                    displayName: profile.displayName,
                    profileUrl: profile.url,
                    bio: profile.bio,
                    followersCount: parseVisibleCount(profile.followersText),
                    followingCount: parseVisibleCount(profile.followingText),
                    postsCount: parseVisibleCount(profile.postsText),
                    followersText: profile.followersText,
                    followingText: profile.followingText,
                    postsText: profile.postsText,
                    externalLink: profile.externalLink,
                    visibleTexts: profile.visibleTexts,
                    source: profile.source,
                    discoverySessionId: profile.discoverySessionId,
                    sourceSeedUsername: profile.sourceSeedUsername,
                    sourceContext: profile.sourceContext
                        || profile.visibleTexts.join('\n').slice(0, 5000),
                    comments: profile.visibleTexts.join('\n').slice(0, 5000),
                    aiScore: boundedNumber(body.aiScore, 0, 0, 100),
                    aiSummary: cleanString(body.aiSummary, 3000),
                    aiPositiveSignals: cleanStringArray(body.aiPositiveSignals, 30, 300),
                    aiRiskSignals: cleanStringArray(body.aiRiskSignals, 30, 300),
                    aiRecommendation: recommendation,
                    suggestedMessage: cleanString(body.suggestedMessage, 3000),
                },
                $setOnInsert: {
                    platform: profile.platform,
                    username: profile.username,
                    status: 'new',
                },
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        ).lean();

        return copilotJson(request, {
            success: true,
            leadId: String(lead._id),
            created: !existing,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível salvar o lead.';
        return copilotJson(request, { error: message }, 500);
    }
}
