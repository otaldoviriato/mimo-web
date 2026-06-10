import { NextRequest, NextResponse } from 'next/server';
import { MarketingAIService } from '@/lib/marketing/ai';
import { decryptSecret } from '@/lib/marketing/crypto';
import { cleanString, requireMarketingAdmin } from '@/lib/marketing/security';
import { MarketingSettings } from '@/models/Marketing';

export async function POST(request: NextRequest) {
    try {
        const access = await requireMarketingAdmin(request, { limit: 10, windowMs: 60_000 });
        if (access.error) return access.error;

        const body = await request.json().catch(() => ({}));
        const settings = await MarketingSettings.findOne({ key: 'global' }).select('+openAiApiKeyEncrypted');
        const suppliedKey = cleanString(body.openAiApiKey, 500);
        const apiKey = suppliedKey || (
            settings?.openAiApiKeyEncrypted
                ? decryptSecret(settings.openAiApiKeyEncrypted)
                : ''
        );
        if (!apiKey) {
            return NextResponse.json({ error: 'Informe ou salve uma chave da OpenAI.' }, { status: 400 });
        }

        const model = cleanString(body.openAiModel, 120) || settings?.openAiModel || 'gpt-5.4-mini';
        const result = await new MarketingAIService(apiKey, model).testConnection();
        return NextResponse.json({ success: true, message: result.message });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível testar a OpenAI.';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
