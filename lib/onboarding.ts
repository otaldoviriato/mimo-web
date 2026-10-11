export type OnboardingStep = 'welcome' | 'identity' | 'profile' | 'completed';

type OnboardingUser = {
    isProfessional?: boolean | null;
    applicantEnrollment?: boolean;
    applicantCompletedAt?: Date | string | null;
    taxId?: string | null;
    birthDate?: Date | string | null;
    name?: string | null;
    username?: string | null;
    photoUrl?: string | null;
    onboardingStep?: OnboardingStep | null;
};

function hasValue(value: unknown) {
    return typeof value === 'string' && value.trim() !== '';
}

export function calculateOnboardingStep(user: OnboardingUser | null | undefined): OnboardingStep {
    if (!user || user.isProfessional === undefined || user.isProfessional === null) {
        return 'welcome';
    }

    if (user.isProfessional && user.applicantEnrollment) {
        return user.applicantCompletedAt ? 'completed' : 'profile';
    }

    if (user.isProfessional && (!hasValue(user.taxId) || !user.birthDate)) {
        return 'identity';
    }

    if (!user.isProfessional) return 'completed';

    const hasRequiredProfile = hasValue(user.name)
        && hasValue(user.username)
        && (!user.isProfessional || hasValue(user.photoUrl));

    if (!hasRequiredProfile || user.onboardingStep !== 'completed') {
        return 'profile';
    }

    return 'completed';
}

export function isOnboardingCompleted(user: OnboardingUser | null | undefined) {
    return calculateOnboardingStep(user) === 'completed';
}
