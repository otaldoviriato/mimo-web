import { MarketingCompatibilityLevel } from '@/models/Marketing';

export const MARKETING_COMPATIBILITY_LEVELS: MarketingCompatibilityLevel[] = [
    'excellent',
    'very_promising',
    'promising',
    'low_fit',
    'incompatible',
];

export const MARKETING_COMPATIBILITY_LABELS: Record<MarketingCompatibilityLevel, string> = {
    excellent: 'Excelente',
    very_promising: 'Muito promissor',
    promising: 'Promissor',
    low_fit: 'Pouco compatível',
    incompatible: 'Incompatível',
};

export function compatibilityFromScore(score: number): MarketingCompatibilityLevel {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'very_promising';
    if (score >= 50) return 'promising';
    if (score >= 25) return 'low_fit';
    return 'incompatible';
}

export function compatibilityRank(level: MarketingCompatibilityLevel) {
    return {
        excellent: 5,
        very_promising: 4,
        promising: 3,
        low_fit: 2,
        incompatible: 1,
    }[level];
}
