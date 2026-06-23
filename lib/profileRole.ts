export type ProfileRole = 'client' | 'professional';

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
    };
}
