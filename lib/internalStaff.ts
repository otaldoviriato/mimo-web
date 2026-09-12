import { connectToDatabase } from '@/lib/db';
import { AppSettings } from '@/models/AppSettings';
import { User } from '@/models/User';

export const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

/**
 * Verifica se um determinado userId pertence a um administrador ou membro da equipe (isTeam).
 * Administradores e membros da equipe devem ser completamente desconsiderados de métricas
 * como exibições, cliques, visitas a perfis e telemetria de jornadas.
 */
export async function isStaffOrAdmin(userId?: string | null): Promise<boolean> {
    if (!userId || typeof userId !== 'string') return false;

    const trimmedId = userId.trim();
    if (!trimmedId) return false;

    if (trimmedId === FALLBACK_ADMIN) return true;

    try {
        await connectToDatabase();

        const [settings, user] = await Promise.all([
            AppSettings.findOne({ key: 'global' }).select('adminClerkIds').lean(),
            User.findOne({ clerkId: trimmedId }).select('isTeam isProfessional').lean(),
        ]);

        if (settings?.adminClerkIds && Array.isArray(settings.adminClerkIds) && settings.adminClerkIds.includes(trimmedId)) {
            return true;
        }

        if (user?.isTeam) {
            return true;
        }

        return false;
    } catch (err) {
        console.error('[isStaffOrAdmin] Falha ao consultar privilégios de staff/admin:', err);
        return false;
    }
}
