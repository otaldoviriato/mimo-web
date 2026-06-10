import { MarketingScoringCriteria } from '@/models/Marketing';
import { boundedNumber, cleanString, cleanStringArray } from '@/lib/marketing/security';

export const DEFAULT_MARKETING_SCORING_CRITERIA: MarketingScoringCriteria = {
    targetDescription: 'Mulheres adultas que aparentam vender ou ter interesse em vender conteúdo adulto ou exclusivo, com sinais claros na bio e potencial para usar o MimoChat.',
    minFollowers: 1000,
    idealFollowers: 10000,
    maxFollowers: 1000000,
    positiveSignals: [
        'Bio menciona conteúdo exclusivo',
        'Bio menciona Privacy ou plataforma semelhante',
        'Bio usa frases como o que você quer ou o que você procura',
        'Bio sugere venda de conteúdo, acesso exclusivo ou atendimento privado',
        'Link externo relacionado a conteúdo exclusivo',
        'Perfil aparenta ser de uma mulher adulta',
        'Parece uma pessoa real',
    ],
    negativeSignals: [
        'Parece marca ou empresa',
        'Parece fake ou bot',
        'Possível menor de idade',
        'Possível perfil masculino',
        'Bio sem indícios de venda de conteúdo adulto ou exclusivo',
        'Perfil privado ou sem dados suficientes',
        'Sinais de spam ou golpe',
        'Pouca atividade',
    ],
    weights: {
        realPerson: 5,
        personalIdentity: 5,
        profileActivity: 5,
        ownAudience: 5,
        profileQuality: 5,
        externalLink: 5,
        followerInteraction: 5,
        creatorFit: 5,
        adultContentFit: 70,
    },
    penalties: {
        brandOrCompany: 35,
        fakeOrBot: 60,
        possibleMinor: 100,
        possibleMale: 90,
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
    const storedTargetDescription = cleanString(input.targetDescription, 4000);
    const legacyDefaults = storedTargetDescription === 'Criadoras digitais com audiência própria, perfil ativo e potencial para usar o MimoChat.';
    const positiveSignals = cleanStringArray(input.positiveSignals, 30, 300);
    const negativeSignals = cleanStringArray(input.negativeSignals, 30, 300);

    return {
        targetDescription: legacyDefaults
            ? defaults.targetDescription
            : storedTargetDescription || defaults.targetDescription,
        minFollowers: boundedNumber(input.minFollowers, defaults.minFollowers, 0, 1000000000),
        idealFollowers: boundedNumber(input.idealFollowers, defaults.idealFollowers, 0, 1000000000),
        maxFollowers: boundedNumber(input.maxFollowers, defaults.maxFollowers, 0, 1000000000),
        positiveSignals: legacyDefaults ? defaults.positiveSignals : positiveSignals.length ? positiveSignals : defaults.positiveSignals,
        negativeSignals: legacyDefaults ? defaults.negativeSignals : negativeSignals.length ? negativeSignals : defaults.negativeSignals,
        weights: {
            realPerson: legacyDefaults ? defaults.weights.realPerson : boundedNumber(weights.realPerson, defaults.weights.realPerson, 0, 100),
            personalIdentity: legacyDefaults ? defaults.weights.personalIdentity : boundedNumber(weights.personalIdentity, defaults.weights.personalIdentity, 0, 100),
            profileActivity: legacyDefaults ? defaults.weights.profileActivity : boundedNumber(weights.profileActivity, defaults.weights.profileActivity, 0, 100),
            ownAudience: legacyDefaults ? defaults.weights.ownAudience : boundedNumber(weights.ownAudience, defaults.weights.ownAudience, 0, 100),
            profileQuality: legacyDefaults ? defaults.weights.profileQuality : boundedNumber(weights.profileQuality, defaults.weights.profileQuality, 0, 100),
            externalLink: legacyDefaults ? defaults.weights.externalLink : boundedNumber(weights.externalLink, defaults.weights.externalLink, 0, 100),
            followerInteraction: legacyDefaults ? defaults.weights.followerInteraction : boundedNumber(weights.followerInteraction, defaults.weights.followerInteraction, 0, 100),
            creatorFit: legacyDefaults ? defaults.weights.creatorFit : boundedNumber(weights.creatorFit, defaults.weights.creatorFit, 0, 100),
            adultContentFit: boundedNumber(weights.adultContentFit, defaults.weights.adultContentFit, 0, 100),
        },
        penalties: {
            brandOrCompany: boundedNumber(penalties.brandOrCompany, defaults.penalties.brandOrCompany, 0, 100),
            fakeOrBot: boundedNumber(penalties.fakeOrBot, defaults.penalties.fakeOrBot, 0, 100),
            possibleMinor: boundedNumber(penalties.possibleMinor, defaults.penalties.possibleMinor, 0, 100),
            possibleMale: boundedNumber(penalties.possibleMale, defaults.penalties.possibleMale, 0, 100),
            privateOrInsufficient: boundedNumber(penalties.privateOrInsufficient, defaults.penalties.privateOrInsufficient, 0, 100),
            spamOrScam: boundedNumber(penalties.spamOrScam, defaults.penalties.spamOrScam, 0, 100),
            inactiveProfile: boundedNumber(penalties.inactiveProfile, defaults.penalties.inactiveProfile, 0, 100),
        },
    };
}
