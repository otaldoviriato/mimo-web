import { NextRequest, NextResponse } from 'next/server';
import { encryptSecret, maskSecret } from '@/lib/marketing/crypto';
import { boundedNumber, cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingProviderType, MarketingSettings } from '@/models/Marketing';

const PROVIDERS: MarketingProviderType[] = ['manual', 'mock', 'import', 'external'];

function serializeSettings(settings: {
    openAiApiKeyEncrypted?: string;
    openAiModel: string;
    maxLeadsPerRun: number;
    maxSeedsPerRun: number;
    minScoreToHighlight: number;
    minDelaySeconds: number;
    maxDelaySeconds: number;
    providerType: MarketingProviderType;
    createdAt?: Date;
    updatedAt?: Date;
}) {
    return {
        openAiApiKeyMasked: maskSecret(settings.openAiApiKeyEncrypted),
        hasOpenAiApiKey: Boolean(settings.openAiApiKeyEncrypted),
        openAiModel: settings.openAiModel,
        maxLeadsPerRun: settings.maxLeadsPerRun,
        maxSeedsPerRun: settings.maxSeedsPerRun,
        minScoreToHighlight: settings.minScoreToHighlight,
        minDelaySeconds: settings.minDelaySeconds,
        maxDelaySeconds: settings.maxDelaySeconds,
        providerType: settings.providerType,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
    };
}

export async function GET(request: NextRequest) {
    try {
        const access = await requireMarketingAdmin(request);
        if (access.error) return access.error;

        const settings = await MarketingSettings.findOneAndUpdate(
            { key: 'global' },
            { $setOnInsert: { key: 'global' } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).select('+openAiApiKeyEncrypted').lean();

        return NextResponse.json({ success: true, settings: serializeSettings(settings) });
    } catch (error) {
        console.error('Erro ao buscar configurações de marketing:', error);
        return NextResponse.json({ error: 'Erro ao buscar configurações.' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const access = await requireMarketingAdmin(request, { limit: 30 });
        if (access.error) return access.error;
        const body = await request.json();
        const current = await MarketingSettings.findOne({ key: 'global' }).select('+openAiApiKeyEncrypted');

        const minDelaySeconds = boundedNumber(body.minDelaySeconds, current?.minDelaySeconds ?? 1, 0, 300);
        const maxDelaySeconds = boundedNumber(body.maxDelaySeconds, current?.maxDelaySeconds ?? 3, 0, 600);
        if (maxDelaySeconds < minDelaySeconds) {
            return NextResponse.json(
                { error: 'O delay máximo deve ser maior ou igual ao delay mínimo.' },
                { status: 400 }
            );
        }

        const providerType = (
            cleanString(body.providerType, 20)
            || current?.providerType
            || 'mock'
        ) as MarketingProviderType;
        if (!PROVIDERS.includes(providerType)) {
            return NextResponse.json({ error: 'Provider inválido.' }, { status: 400 });
        }

        const update: Record<string, unknown> = {
            openAiModel: cleanString(body.openAiModel, 120) || current?.openAiModel || 'gpt-5.4-mini',
            maxLeadsPerRun: boundedNumber(body.maxLeadsPerRun, current?.maxLeadsPerRun ?? 20, 1, 200),
            maxSeedsPerRun: boundedNumber(body.maxSeedsPerRun, current?.maxSeedsPerRun ?? 5, 1, 50),
            minScoreToHighlight: boundedNumber(body.minScoreToHighlight, current?.minScoreToHighlight ?? 75, 0, 100),
            minDelaySeconds,
            maxDelaySeconds,
            providerType,
        };

        const apiKey = cleanString(body.openAiApiKey, 500);
        if (apiKey) {
            if (!apiKey.startsWith('sk-')) {
                return NextResponse.json({ error: 'A chave da OpenAI deve começar com sk-.' }, { status: 400 });
            }
            update.openAiApiKeyEncrypted = encryptSecret(apiKey);
        }

        const settings = await MarketingSettings.findOneAndUpdate(
            { key: 'global' },
            body.clearOpenAiApiKey === true
                ? { $set: update, $unset: { openAiApiKeyEncrypted: 1 } }
                : { $set: update, $setOnInsert: { key: 'global' } },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        ).select('+openAiApiKeyEncrypted').lean();

        return NextResponse.json({ success: true, settings: serializeSettings(settings) });
    } catch (error) {
        console.error('Erro ao salvar configurações de marketing:', error);
        return NextResponse.json({ error: 'Erro ao salvar configurações.' }, { status: 500 });
    }
}
