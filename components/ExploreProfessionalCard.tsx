'use client';

import { MessageCircle, MessageCircleOff } from 'lucide-react';

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
    const ChatIcon = online ? MessageCircle : MessageCircleOff;

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

            <div className="absolute bottom-0 inset-x-0 z-10">
                <div className="px-2.5 sm:px-3 pb-2 pt-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                    <h3 className="text-sm sm:text-base text-white font-black tracking-tight leading-tight truncate drop-shadow-sm">
                        {formattedName}
                    </h3>
                </div>
                <div
                    aria-hidden="true"
                    className={`flex min-h-12 items-center justify-between gap-1.5 px-2.5 sm:px-3 py-2 ${
                        online ? 'bg-emerald-300 text-emerald-950' : 'bg-slate-900 text-slate-200'
                    }`}
                >
                    <div className="min-w-0">
                        <span className="block text-xs sm:text-sm font-bold leading-tight">
                            {online ? 'Online agora' : 'Offline'}
                        </span>
                        <span className={`block mt-0.5 text-[10px] sm:text-xs leading-tight ${online ? 'text-emerald-950' : 'text-slate-300'}`}>
                            {chatAvailability}
                        </span>
                    </div>
                    <ChatIcon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${online ? 'text-emerald-950' : 'text-slate-400'}`} />
                </div>
            </div>
        </button>
    );
}
