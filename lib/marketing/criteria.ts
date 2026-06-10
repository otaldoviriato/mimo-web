import { MarketingScoringCriteria } from '@/models/Marketing';
import { boundedNumber, cleanString, cleanStringArray } from '@/lib/marketing/security';

export const DEFAULT_MARKETING_SCORING_CRITERIA: MarketingScoringCriteria = {
    targetDescription: 'Criadoras digitais com audiência própria, perfil ativo e potencial para usar o MimoChat.',
    minFollowers: 1000,
    idealFollowers: 10000,
    maxFollowers: 1000000,
    positiveSignals: [
        'Parece uma pessoa real',
        'Perfil ativo',
        'Tem audiência própria',
        'Bio bem montada',
        'Possui link externo',
        'Interage com seguidores',
        'Conteúdo compatível com criadora digital',
    ],
    negativeSignals: [
        'Parece marca ou empresa',
        'Parece fake ou bot',
        'Possível menor de idade',
        'Perfil privado ou sem dados suficientes',
        'Sinais de spam ou golpe',
        'Pouca atividade',
    ],
    weights: {
        realPerson: 20,
        personalIdentity: 10,
        profileActivity: 15,
        ownAudience: 20,
        profileQuality: 10,
        externalLink: 5,
        followerInteraction: 15,
        creatorFit: 15,
    },
    penalties: {
        brandOrCompany: 35,
        fakeOrBot: 60,
        possibleMinor: 100,
        privateOrInsufficient: 25,
        spamOrScam: 80,
        inactiveProfile: 25,
    },
};

export function normalizeScoringCriteria(value: unknown): MarketingScoringCriteria {
    const input = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
    const weights = input.weights && typeof input.weights === 'object'
        ? input.weights as Record<string, unknown>
        : {};
    const penalties = input.penalties && typeof input.penalties === 'object'
        ? input.penalties as Record<string, unknown>
        : {};
    const defaults = DEFAULT_MARKETING_SCORING_CRITERIA;

    return {
        targetDescription: cleanString(input.targetDescription, 4000)
            || defaults.targetDescription,
        minFollowers: boundedNumber(input.minFollowers, defaults.minFollowers, 0, 1000000000),
        idealFollowers: boundedNumber(input.idealFollowers, defaults.idealFollowers, 0, 1000000000),
        maxFollowers: boundedNumber(input.maxFollowers, defaults.maxFollowers, 0, 1000000000),
        positiveSignals: cleanStringArray(input.positiveSignals, 30, 300).length
            ? cleanStringArray(input.positiveSignals, 30, 300)
            : defaults.positiveSignals,
        negativeSignals: cleanStringArray(input.negativeSignals, 30, 300).length
            ? cleanStringArray(input.negativeSignals, 30, 300)
            : defaults.negativeSignals,
        weights: {
            realPerson: boundedNumber(weights.realPerson, defaults.weights.realPerson, 0, 100),
            personalIdentity: boundedNumber(weights.personalIdentity, defaults.weights.personalIdentity, 0, 100),
            profileActivity: boundedNumber(weights.profileActivity, defaults.weights.profileActivity, 0, 100),
            ownAudience: boundedNumber(weights.ownAudience, defaults.weights.ownAudience, 0, 100),
            profileQuality: boundedNumber(weights.profileQuality, defaults.weights.profileQuality, 0, 100),
            externalLink: boundedNumber(weights.externalLink, defaults.weights.externalLink, 0, 100),
            followerInteraction: boundedNumber(weights.followerInteraction, defaults.weights.followerInteraction, 0, 100),
            creatorFit: boundedNumber(weights.creatorFit, defaults.weights.creatorFit, 0, 100),
        },
        penalties: {
            brandOrCompany: boundedNumber(penalties.brandOrCompany, defaults.penalties.brandOrCompany, 0, 100),
            fakeOrBot: boundedNumber(penalties.fakeOrBot, defaults.penalties.fakeOrBot, 0, 100),
            possibleMinor: boundedNumber(penalties.possibleMinor, defaults.penalties.possibleMinor, 0, 100),
            privateOrInsufficient: boundedNumber(penalties.privateOrInsufficient, defaults.penalties.privateOrInsufficient, 0, 100),
            spamOrScam: boundedNumber(penalties.spamOrScam, defaults.penalties.spamOrScam, 0, 100),
            inactiveProfile: boundedNumber(penalties.inactiveProfile, defaults.penalties.inactiveProfile, 0, 100),
        },
    };
}
