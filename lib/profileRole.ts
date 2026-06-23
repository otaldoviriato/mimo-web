export type ProfileRole = 'client' | 'professional';
export type ProfileRoleSource = 'profile_selection' | 'creator_landing';

export function getExplicitProfileRole(unsafeMetadata: unknown): ProfileRole | undefined {
    if (!unsafeMetadata || typeof unsafeMetadata !== 'object') {
        return undefined;
    }

    const metadata = unsafeMetadata as Record<string, unknown>;
    const role = metadata.role;
    const selectedAt = metadata.profileSelectedAt;

    if (
        (role === 'client' || role === 'professional') &&
        typeof selectedAt === 'string' &&
        selectedAt.trim().length > 0
    ) {
        return role;
    }

    return undefined;
}

export function buildProfileRoleMetadata(role: ProfileRole) {
    return {
        role,
        profileSelectedAt: new Date().toISOString(),
        profileRoleSource: 'profile_selection' satisfies ProfileRoleSource,
    };
}

export function getCreatorLandingProfileRole(unsafeMetadata: unknown): ProfileRole | undefined {
    if (!unsafeMetadata || typeof unsafeMetadata !== 'object') {
        return undefined;
    }

    const metadata = unsafeMetadata as Record<string, unknown>;
    if (metadata.profileRoleSource !== 'creator_landing') {
        return undefined;
    }

    return getExplicitProfileRole(unsafeMetadata);
}
