'use client';

import React from 'react';

export type TeamExploreUser = {
    id: string;
    clerkId: string;
    username: string;
    name: string;
    email?: string;
    photoUrl?: string | null;
    birthDate?: string | Date | null;
    city?: string;
    state?: string;
    isProfessional?: boolean;
    isOnline?: boolean;
    lastSeen?: string | Date | null;
    accessCount: number;
    totalBilledCents: number;
    totalRooms: number;
};

type Props = {
    user: TeamExploreUser;
    onClick: () => void;
};

const calculateAge = (birthDateString?: string | Date | null) => {
    if (!birthDateString) return null;
    try {
        const birthDateObj = new Date(birthDateString);
        if (isNaN(birthDateObj.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }
        return age;
    } catch {
        return null;
    }
};

function formatLastSeenTeam(isOnline?: boolean, lastSeen?: string | Date | null): string {
    if (isOnline) return 'Online';
    if (!lastSeen) return 'Offline';
    try {
        const date = new Date(lastSeen);
        const now = Date.now();
        const diffMs = now - date.getTime();
        if (diffMs < 0 || isNaN(diffMs)) return 'Offline';
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Visto agora';
        if (diffMins < 60) return `Visto há ${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Visto há ${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Visto ontem';
        if (diffDays < 7) return `Visto há ${diffDays}d`;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
        return 'Offline';
    }
}

export function TeamExploreCard({ user, onClick }: Props) {
    const age = calculateAge(user.birthDate);
    const photo = user.photoUrl || '/Logo.svg';
    const rawName = (user.name || '').trim();
    const firstName = rawName ? rawName.split(/\s+/)[0] : `@${user.username}`;
    const displayName = age !== null ? `${firstName}, ${age}` : firstName;
    const formattedBilled = (user.totalBilledCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Abrir perfil de ${displayName}`}
            className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-[0.98] border border-slate-200/80 bg-slate-100 group text-left focus-visible:outline-2 focus-visible:outline-purple-600 focus-visible:outline-offset-2 flex flex-col justify-between"
        >
            <img
                src={photo}
                alt={displayName}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 inset-x-0 h-[60%] bg-gradient-to-t from-black/95 via-black/65 to-transparent pointer-events-none z-10" />

            <div className="relative z-20 p-2.5 flex items-center justify-between gap-1 w-full pointer-events-none">
                <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs backdrop-blur-md ${
                        user.isOnline
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-black/55 text-white/90 border border-white/10'
                    }`}
                >
                    {user.isOnline && (
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                    )}
                    {formatLastSeenTeam(user.isOnline, user.lastSeen)}
                </span>

                {user.isProfessional && (
                    <span className="bg-purple-600/90 backdrop-blur-md text-white border border-white/10 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                        Criadora
                    </span>
                )}
            </div>

            <div className="relative z-20 p-3 text-white flex flex-col gap-1.5 w-full">
                <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight truncate drop-shadow-sm">
                        {displayName}
                    </h3>
                    <p className="text-[11px] text-white/75 truncate leading-tight font-medium">
                        @{user.username} {user.email ? `• ${user.email}` : ''}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/15 text-[10px] leading-none">
                    <div className="bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/30 rounded-md px-1.5 py-1 text-emerald-300 font-bold truncate">
                        💰 {formattedBilled}
                    </div>
                    <div className="bg-purple-500/20 backdrop-blur-xs border border-purple-400/30 rounded-md px-1.5 py-1 text-purple-200 font-semibold truncate">
                        💬 {user.totalRooms} {user.totalRooms === 1 ? 'conversa' : 'conversas'}
                    </div>
                    <div className="col-span-2 bg-white/10 backdrop-blur-xs border border-white/15 rounded-md px-1.5 py-1 text-white/90 font-medium truncate flex items-center justify-between">
                        <span>Total de acessos</span>
                        <span className="font-bold text-white">{user.accessCount}</span>
                    </div>
                </div>
            </div>
        </button>
    );
}
