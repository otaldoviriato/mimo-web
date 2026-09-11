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

export function ExploreProfessionalCard({ professionalId, name, photoUrl, online, freeIntroEnabled, trackExposure, onClick }: Props) {
    return (
        <button
            type="button"
            data-explore-professional-id={trackExposure ? professionalId : undefined}
            onClick={onClick}
            aria-label={`Abrir ${name}`}
            className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.98] border border-slate-200/80 bg-slate-100 group text-left focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:outline-offset-2"
        >
            <img
                src={photoUrl}
                alt={name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Badges superiores em linha horizontal garantindo espaçamento e sem sobreposição */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none z-20">
                {freeIntroEnabled ? (
                    <span className="bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap pointer-events-auto">
                        Conheça grátis
                    </span>
                ) : <span />}

                {online && (
                    <span className="bg-white text-emerald-600 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap shrink-0 pointer-events-auto">
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Online
                    </span>
                )}
            </div>

            <div className="absolute bottom-0 inset-x-0 p-3 text-white flex flex-col gap-0.5 z-10">
                <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate drop-shadow-sm">
                    {name}
                </h3>
            </div>
        </button>
    );
}
