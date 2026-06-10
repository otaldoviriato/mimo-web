import { MarketingCandidateInput, MarketingProviderType } from '@/models/Marketing';

export interface MarketingDataProvider {
    getSeedProfile(username: string): Promise<MarketingCandidateInput | null>;
    getCandidateInteractions(seedUsername: string): Promise<MarketingCandidateInput[]>;
    getProfileDetails(username: string): Promise<MarketingCandidateInput | null>;
}

function normalizeUsername(value: string) {
    return value.trim().replace(/^@/, '').toLowerCase();
}

function normalizeCandidate(candidate: MarketingCandidateInput): MarketingCandidateInput {
    const username = normalizeUsername(candidate.username);
    return {
        ...candidate,
        username,
        profileUrl: candidate.profileUrl || `https://www.instagram.com/${username}/`,
        followersCount: Math.max(0, Number(candidate.followersCount) || 0),
        followingCount: Math.max(0, Number(candidate.followingCount) || 0),
        postsCount: Math.max(0, Number(candidate.postsCount) || 0),
    };
}

export class ManualMarketingDataProvider implements MarketingDataProvider {
    constructor(private readonly candidates: MarketingCandidateInput[]) {}

    async getSeedProfile(username: string) {
        const normalized = normalizeUsername(username);
        return this.candidates.find(item => normalizeUsername(item.username) === normalized) || null;
    }

    async getCandidateInteractions(seedUsername: string) {
        const normalizedSeed = normalizeUsername(seedUsername);
        return this.candidates
            .filter(item => !item.sourceSeedUsername || normalizeUsername(item.sourceSeedUsername) === normalizedSeed)
            .map(item => normalizeCandidate({ ...item, sourceSeedUsername: item.sourceSeedUsername || normalizedSeed }));
    }

    async getProfileDetails(username: string) {
        const normalized = normalizeUsername(username);
        const candidate = this.candidates.find(item => normalizeUsername(item.username) === normalized);
        return candidate ? normalizeCandidate(candidate) : null;
    }
}

export class ImportMarketingDataProvider extends ManualMarketingDataProvider {}

export class MockMarketingDataProvider implements MarketingDataProvider {
    async getSeedProfile(username: string) {
        const normalized = normalizeUsername(username);
        return {
            username: normalized,
            displayName: `Perfil semente ${normalized}`,
            profileUrl: `https://www.instagram.com/${normalized}/`,
        };
    }

    async getCandidateInteractions(seedUsername: string) {
        const seed = normalizeUsername(seedUsername);
        return Array.from({ length: 8 }, (_, index) => {
            const suffix = index + 1;
            const username = `${seed}_creator_${suffix}`;
            return normalizeCandidate({
                username,
                displayName: `Criadora ${suffix}`,
                bio: suffix % 3 === 0
                    ? 'Marca de moda e acessórios. Atendimento comercial.'
                    : 'Criadora de conteúdo, lifestyle e beleza. Conteúdo novo toda semana.',
                followersCount: 4500 + suffix * 3700,
                followingCount: 300 + suffix * 20,
                postsCount: 45 + suffix * 8,
                externalLink: suffix % 2 === 0 ? `https://beacons.ai/${username}` : '',
                sourceSeedUsername: seed,
                sourceContext: `Interagiu publicamente com conteúdo de @${seed}. Dado fictício do provider mock.`,
                comments: suffix % 2 === 0 ? 'Comentários frequentes e respostas cordiais aos seguidores.' : '',
            });
        });
    }

    async getProfileDetails(username: string) {
        const normalized = normalizeUsername(username);
        return normalizeCandidate({
            username: normalized,
            displayName: normalized.split('_').map(part => part[0]?.toUpperCase() + part.slice(1)).join(' '),
            profileUrl: `https://www.instagram.com/${normalized}/`,
            bio: 'Criadora de conteúdo digital sobre lifestyle, beleza e rotina.',
            followersCount: 18500,
            followingCount: 840,
            postsCount: 126,
            externalLink: `https://beacons.ai/${normalized}`,
            sourceContext: 'Perfil fictício gerado para validação interna do fluxo.',
        });
    }
}

export class ExternalMarketingDataProvider implements MarketingDataProvider {
    private unavailable(): never {
        throw new Error(
            'O provider externo ainda não foi configurado. Conecte apenas um serviço autorizado; scraping logado não é suportado.'
        );
    }

    async getSeedProfile(): Promise<MarketingCandidateInput | null> {
        return this.unavailable();
    }

    async getCandidateInteractions(): Promise<MarketingCandidateInput[]> {
        return this.unavailable();
    }

    async getProfileDetails(): Promise<MarketingCandidateInput | null> {
        return this.unavailable();
    }
}

export function createMarketingDataProvider(
    type: MarketingProviderType,
    candidates: MarketingCandidateInput[] = []
): MarketingDataProvider {
    if (type === 'manual') return new ManualMarketingDataProvider(candidates);
    if (type === 'import') return new ImportMarketingDataProvider(candidates);
    if (type === 'external') return new ExternalMarketingDataProvider();
    return new MockMarketingDataProvider();
}
