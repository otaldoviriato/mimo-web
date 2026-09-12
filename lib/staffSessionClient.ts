'use client';

const STAFF_SESSION_KEY = 'mimo_staff_session';

/**
 * Marca ou remove a flag de sessão de equipe/administrador nos storages do navegador.
 */
export function setStaffSession(isStaff: boolean) {
    if (typeof window === 'undefined') return;
    try {
        if (isStaff) {
            localStorage.setItem(STAFF_SESSION_KEY, 'true');
            sessionStorage.setItem(STAFF_SESSION_KEY, 'true');
        } else {
            localStorage.removeItem(STAFF_SESSION_KEY);
            sessionStorage.removeItem(STAFF_SESSION_KEY);
        }
    } catch {
        // Silencioso em caso de restrição do navegador
    }
}

/**
 * Verifica de forma síncrona no cliente se a sessão atual pertence a um membro da equipe ou admin.
 * Membros da equipe e administradores não geram métricas de nenhuma natureza.
 */
export function isStaffSession(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        if (sessionStorage.getItem(STAFF_SESSION_KEY) === 'true') return true;
        if (localStorage.getItem(STAFF_SESSION_KEY) === 'true') return true;

        const storedProfile = localStorage.getItem('mimo_profile');
        if (storedProfile) {
            const parsed = JSON.parse(storedProfile);
            if (parsed?.isAdmin || parsed?.isTeam) {
                setStaffSession(true);
                return true;
            }
        }
    } catch {
        // Silencioso
    }
    return false;
}
