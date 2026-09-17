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
            className={`relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-shadow duration-300 cursor-pointer motion-safe:active:scale-[0.98] border bg-slate-100 group text-left focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:outline-offset-4 ${
                online ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200/80'
            }`}
        >
            <img
                src={photoUrl}
                alt={formattedName}
                loading="lazy"
                className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
            />

            <span
                aria-hidden="true"
                className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] sm:text-xs font-bold leading-none shadow-sm ${
                    online ? 'bg-emerald-700 text-white' : 'bg-slate-900/85 text-white'
                }`}
            >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${online ? 'bg-emerald-200' : 'border border-slate-300'}`} />
                {online ? 'Online' : 'Offline'}
            </span>

            <div className="absolute bottom-0 inset-x-0 h-[55%] bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none" />

            <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 text-white flex flex-col gap-1.5 z-10 min-w-0">
                <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate drop-shadow-sm">
                    {formattedName}
                </h3>
                <span aria-hidden="true" className={`flex items-center gap-1 text-[10px] sm:text-xs leading-snug font-medium ${online ? 'text-emerald-200' : 'text-slate-200'}`}>
                    <ChatIcon className="h-3 w-3 shrink-0" />
                    {chatAvailability}
                </span>
            </div>
        </button>
    );
}
