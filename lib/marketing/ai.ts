import {
    IMarketingCampaign,
    MarketingCandidateInput,
    MarketingCompatibilityLevel,
    MarketingRecommendation,
    MarketingScoringCriteria,
} from '@/models/Marketing';

export interface ProspectScore {
    score: number;
    summary: string;
    positiveSignals: string[];
    riskSignals: string[];
    recommendation: MarketingRecommendation;
    suggestedMessage: string;
}

export interface ScoutProfileInput {
    platform: string;
    url: string;
    pageType: string;
    username: string;
    displayName: string;
    bio: string;
    followersText: string;
    followingText: string;
    postsText: string;
    externalLink: string;
    visibleTexts: string[];
    discoverySessionId?: string;
    sourceSeedUsername?: string;
    sourceContext?: string;
    candidateHistory?: unknown[];
}

export interface ScoutProfileAnalysis {
    compatibility: MarketingCompatibilityLevel;
    summary: string;
    positiveSignals: string[];
    riskSignals: string[];
    recommendation: MarketingRecommendation;
    suggestedMessage: string;
}

export interface CandidatePriorityResult {
    recommendedCandidates: Array<{
        username: string;
        score: number;
        reason: string;
        recommendedNextAction: 'open_profile' | 'ignore' | 'save_for_later';
    }>;
    sessionSummary: string;
    nextSuggestedStep: string;
}

const SCORE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
        summary: { type: 'string' },
        positiveSignals: { type: 'array', items: { type: 'string' } },
        riskSignals: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string', enum: ['approve', 'review', 'reject'] },
        suggestedMessage: { type: 'string' },
    },
    required: [
        'score',
        'summary',
        'positiveSignals',
        'riskSignals',
        'recommendation',
        'suggestedMessage',
    ],
} as const;

const SCOUT_PROFILE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        compatibility: {
            type: 'string',
            enum: ['excellent', 'very_promising', 'promising', 'low_fit', 'incompatible'],
        },
        summary: { type: 'string' },
        positiveSignals: { type: 'array', items: { type: 'string' } },
        riskSignals: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string', enum: ['approve', 'review', 'reject'] },
        suggestedMessage: { type: 'string' },
    },
    required: [
        'compatibility',
        'summary',
        'positiveSignals',
        'riskSignals',
        'recommendation',
        'suggestedMessage',
    ],
} as const;

function extractOutputText(payload: Record<string, unknown>) {
    if (typeof payload.output_text === 'string') return payload.output_text;
    const output = Array.isArray(payload.output) ? payload.output : [];
    for (const item of output) {
        if (!item || typeof item !== 'object') continue;
        const content = Array.isArray((item as { content?: unknown[] }).content)
            ? (item as { content: unknown[] }).content
            : [];
        for (const part of content) {
            if (
                part
                && typeof part === 'object'
                && (part as { type?: string }).type === 'output_text'
                && typeof (part as { text?: unknown }).text === 'string'
            ) {
                return (part as { text: string }).text;
            }
        }
    }
    throw new Error('A OpenAI não retornou texto utilizável.');
}

export class MarketingAIService {
    constructor(
        private readonly apiKey: string,
        private readonly model: string
    ) {}

    private async requestJson<T>(
        name: string,
        schema: Record<string, unknown>,
        instructions: string,
        input: unknown
    ): Promise<T> {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                store: false,
                instructions,
                input: JSON.stringify(input),
                text: {
                    format: {
                        type: 'json_schema',
                        name,
                        strict: true,
                        schema,
                    },
                },
            }),
            signal: AbortSignal.timeout(60_000),
        });

        const payload = await response.json() as Record<string, unknown>;
        if (!response.ok) {
            const error = payload.error as { message?: unknown } | undefined;
            const message = typeof error?.message === 'string'
                ? error.message
                : error?.message
                    ? JSON.stringify(error.message)
                    : `Falha na OpenAI (${response.status}).`;
            throw new Error(message);
        }
        return JSON.parse(extractOutputText(payload)) as T;
    }

    async prioritizeCandidates(
        candidates: MarketingCandidateInput[],
        campaign: IMarketingCampaign,
        limit: number
    ) {
        const schema = {
            type: 'object',
            additionalProperties: false,
            properties: {
                usernames: {
                    type: 'array',
                    items: { type: 'string' },
                    maxItems: limit,
                },
            },
            required: ['usernames'],
        };
        const result = await this.requestJson<{ usernames: string[] }>(
            'marketing_candidate_priority',
            schema,
            'Priorize perfis para prospecção ética do MimoChat. Use somente os dados fornecidos. Não presuma idade; perfis com possível menoridade devem ir para o fim. Retorne usernames únicos.',
            {
                campaign: {
                    targetDescription: campaign.targetDescription,
                    minFollowers: campaign.minFollowers,
                    maxFollowers: campaign.maxFollowers,
                    positiveSignals: campaign.positiveSignals,
                    negativeSignals: campaign.negativeSignals,
                },
                candidates,
                limit,
            }
        );
        const allowed = new Set(candidates.map(item => item.username.toLowerCase()));
        return result.usernames
            .map(username => username.toLowerCase().replace(/^@/, ''))
            .filter(username => allowed.has(username))
            .slice(0, limit);
    }

    async scoreProspect(
        candidate: MarketingCandidateInput,
        campaign: IMarketingCampaign
    ): Promise<ProspectScore> {
        return this.requestJson<ProspectScore>(
            'marketing_prospect_score',
            SCORE_SCHEMA,
            [
                'Qualifique a potencial criadora para o MimoChat usando somente os dados fornecidos.',
                'Sinais positivos: pessoa real, audiência própria, perfil ativo, link externo, boa comunicação, provável benefício com o Mimo e estética de criadora digital.',
                'Sinais negativos: fake, possível menoridade, dados insuficientes, pouca atividade, marca/empresa, golpe ou conteúdo incompatível.',
                'Se houver sinal de menoridade, recomende reject. Não faça inferências sensíveis sem evidência.',
                'suggestedMessage deve ficar vazio nesta etapa.',
            ].join(' '),
            { campaign, candidate }
        );
    }

    async analyzeScoutProfile(
        profile: ScoutProfileInput,
        criteria: MarketingScoringCriteria
    ): Promise<ScoutProfileAnalysis> {
        return this.requestJson<ScoutProfileAnalysis>(
            'mimo_scout_profile_analysis',
            SCOUT_PROFILE_SCHEMA,
            [
                'Avalie se o perfil é compatível com o público desejado pelo MimoChat usando somente os dados visíveis fornecidos.',
                'Aplique os pesos e penalidades configurados para escolher um dos cinco níveis de compatibilidade.',
                'Use excellent para Excelente, very_promising para Muito promissor, promising para Promissor, low_fit para Pouco compatível e incompatible para Incompatível.',
                'A compatibilidade depende principalmente de sinais claros na bio de que a pessoa vende ou pode vender conteúdo adulto, exclusivo ou privado.',
                'Exemplos de sinais: Privacy, conteúdo exclusivo, acesso exclusivo, chamadas como o que você quer ou o que você procura, venda de conteúdo, atendimento privado e links relacionados.',
                'Sem ao menos um indício desse tipo na bio ou no link externo, use incompatible e recomendação reject, mesmo que o perfil seja ativo ou tenha muitos seguidores.',
                'Se os elementos visíveis indicarem chance relevante de ser um perfil masculino, aplique a penalidade possibleMale de forma forte. Descreva como possibilidade baseada somente nos sinais visíveis, sem afirmar identidade de gênero.',
                'Considere a faixa de seguidores configurada sem rejeitar automaticamente apenas pela quantidade.',
                'Se houver evidência de possível menoridade, recomende reject e explique o risco.',
                'A mensagem sugerida deve ser curta, humana, respeitosa e em português do Brasil. Não mencione scraping, monitoramento ou ganhos garantidos.',
                'Retorne somente um dos cinco níveis definidos e use somente approve, review ou reject na recomendação.',
            ].join(' '),
            { criteria, profile }
        );
    }

    async prioritizeScoutCandidates(input: {
        seedProfile: unknown;
        analyzedPages: unknown[];
        candidates: unknown[];
        targetDescription: string;
        criteria: MarketingScoringCriteria;
    }): Promise<CandidatePriorityResult> {
        const schema = {
            type: 'object',
            additionalProperties: false,
            properties: {
                recommendedCandidates: {
                    type: 'array',
                    maxItems: 10,
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            username: { type: 'string' },
                            score: { type: 'number', minimum: 0, maximum: 100 },
                            reason: { type: 'string' },
                            recommendedNextAction: {
                                type: 'string',
                                enum: ['open_profile', 'ignore', 'save_for_later'],
                            },
                        },
                        required: ['username', 'score', 'reason', 'recommendedNextAction'],
                    },
                },
                sessionSummary: { type: 'string' },
                nextSuggestedStep: { type: 'string' },
            },
            required: ['recommendedCandidates', 'sessionSummary', 'nextSuggestedStep'],
        };
        return this.requestJson<CandidatePriorityResult>(
            'mimo_scout_candidate_priority',
            schema,
            [
                'Priorize candidatos descobertos manualmente usando somente os dados fornecidos.',
                'Use a descrição, os pesos, as penalidades, a faixa de seguidores e os sinais configurados em criteria.',
                'Não infira atributos sensíveis. Recomende um próximo passo manual que enriqueça a sessão quando houver poucos dados.',
                'Retorne no máximo 10 candidatos presentes na entrada e normalize usernames sem arroba.',
            ].join(' '),
            input
        );
    }

    async summarizeDiscoveryReport(input: {
        seedProfile: unknown;
        analyzedPages: unknown[];
        candidates: unknown[];
        savedLeads: unknown[];
        summary: string;
    }) {
        const schema = {
            type: 'object',
            additionalProperties: false,
            properties: {
                summary: { type: 'string' },
                highlights: { type: 'array', items: { type: 'string' }, maxItems: 10 },
                risks: { type: 'array', items: { type: 'string' }, maxItems: 10 },
                nextSuggestedStep: { type: 'string' },
            },
            required: ['summary', 'highlights', 'risks', 'nextSuggestedStep'],
        };
        return this.requestJson<{
            summary: string;
            highlights: string[];
            risks: string[];
            nextSuggestedStep: string;
        }>(
            'mimo_scout_discovery_report',
            schema,
            'Resuma a sessão manual de descoberta do MimoChat. Use somente os dados fornecidos, destaque os melhores candidatos e riscos, e proponha um próximo passo manual e ético.',
            input
        );
    }

    async generateOutreachMessage(
        candidate: MarketingCandidateInput,
        campaign: IMarketingCampaign,
        score: ProspectScore
    ) {
        const schema = {
            type: 'object',
            additionalProperties: false,
            properties: { suggestedMessage: { type: 'string' } },
            required: ['suggestedMessage'],
        };
        const result = await this.requestJson<{ suggestedMessage: string }>(
            'marketing_outreach_message',
            schema,
            'Escreva uma mensagem curta, humana e respeitosa em português do Brasil para contato manual. Não diga que houve scraping ou monitoramento. Não pressione, não prometa ganhos e não inclua conteúdo sexual. Convide a conhecer o MimoChat.',
            {
                campaign: {
                    name: campaign.name,
                    targetDescription: campaign.targetDescription,
                },
                candidate: {
                    username: candidate.username,
                    displayName: candidate.displayName,
                    bio: candidate.bio,
                },
                qualification: score,
            }
        );
        return result.suggestedMessage.trim();
    }

    async testConnection() {
        return this.requestJson<{ ok: boolean; message: string }>(
            'marketing_openai_test',
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    ok: { type: 'boolean' },
                    message: { type: 'string' },
                },
                required: ['ok', 'message'],
            },
            'Responda que a conexão de configuração do CRM MimoChat está funcionando.',
            { test: true }
        );
    }
}
