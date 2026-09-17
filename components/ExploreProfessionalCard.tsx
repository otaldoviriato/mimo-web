'use client';

type Props = {
    professionalId: string;
    name: string;
    photoUrl: string;
    online: boolean;
    trackExposure?: boolean;
    onClick: () => void;
};

function formatDisplayName(raw: string) {
    if (!raw) return '';
    const parts = raw.split(',');
    const namePart = (parts[0] || '').trim().split(/\s+/)[0];
    if (parts.length > 1) {
        const agePart = parts.slice(1).join(',').trim();
        return `${namePart}, ${agePart}`;
    }
    return namePart;
}

export function ExploreProfessionalCard({ professionalId, name, photoUrl, online, trackExposure, onClick }: Props) {
    const formattedName = formatDisplayName(name);
    const chatAvailability = online ? 'Chat disponível' : 'Chat indisponível';

    return (
        <button
            type="button"
            data-explore-professional-id={trackExposure ? professionalId : undefined}
            onClick={onClick}
            aria-label={`Abrir perfil de ${formattedName}. ${online ? 'Online' : 'Offline'}. ${chatAvailability}.`}
            className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-shadow duration-300 cursor-pointer motion-safe:active:scale-[0.98] bg-slate-100 group text-left focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:outline-offset-4"
        >
            <img
                src={photoUrl}
                alt={formattedName}
                loading="lazy"
                className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
            />

            {!online && (
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-black/40 pointer-events-none"
                />
            )}

            <div aria-hidden="true" className="absolute bottom-0 inset-x-0 h-[38%] bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

            <span
                aria-hidden="true"
                className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] sm:text-xs font-bold leading-none backdrop-blur-md ${
                    online ? 'bg-emerald-400/90 text-emerald-950 shadow-sm' : 'bg-black/25 text-white/90'
                }`}
            >
                {online && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-950" />}
                {online ? 'Online' : 'Offline'}
            </span>

            <div className="absolute bottom-0 inset-x-0 p-3 min-w-0">
                <h3 className="text-sm sm:text-base text-white font-black tracking-tight leading-tight truncate drop-shadow-sm">
                    {formattedName}
                </h3>
            </div>
        </button>
    );
}
