'use client';

type Props = {
    professionalId: string;
    name: string;
    photoUrl: string;
    online: boolean;
    freeIntroEnabled: boolean;
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

export function ExploreProfessionalCard({ professionalId, name, photoUrl, online, freeIntroEnabled, trackExposure, onClick }: Props) {
    const formattedName = formatDisplayName(name);

    return (
        <button
            type="button"
            data-explore-professional-id={trackExposure ? professionalId : undefined}
            onClick={onClick}
            aria-label={`Abrir ${formattedName}`}
            className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.98] border border-slate-200/80 bg-slate-100 group text-left focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:outline-offset-2"
        >
            <img
                src={photoUrl}
                alt={formattedName}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute bottom-0 inset-x-0 h-[38%] bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

            {freeIntroEnabled && (
                <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white text-[10px] font-semibold tracking-wide shadow-xs pointer-events-auto">
                        Conheça grátis
                    </span>
                </div>
            )}

            <div className="absolute bottom-0 inset-x-0 p-3 text-white flex items-center gap-1.5 z-10 min-w-0">
                <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate drop-shadow-sm">
                    {formattedName}
                </h3>
                {online && (
                    <span className="relative flex h-2 w-2 shrink-0 ml-0.5" title="Online">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-1 ring-black/40 shadow-xs" />
                    </span>
                )}
            </div>
        </button>
    );
}
