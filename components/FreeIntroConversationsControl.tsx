'use client';

import type { FreeIntroState } from '@/hooks/useFreeIntro';

type Props = {
    division: 'clients' | 'free';
    onDivisionChange: (division: 'clients' | 'free') => void;
    clientsUnread: number;
    freeUnread: number;
    state?: FreeIntroState;
    saving: boolean;
    connected: boolean;
    onToggle: () => void;
};

export function FreeIntroConversationsControl({ division, onDivisionChange, clientsUnread, freeUnread, state, saving, connected, onToggle }: Props) {
    return <div className="shrink-0 space-y-3 border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex rounded-xl bg-gray-100 p-1" aria-label="Tipos de conversa">
            {(['clients', 'free'] as const).map(value => {
                const unread = value === 'clients' ? clientsUnread : freeUnread;
                const isSelected = division === value;
                const displayUnread = unread > 99 ? '99+' : unread;

                return (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onDivisionChange(value)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold transition-all cursor-pointer ${
                            isSelected ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span>{value === 'clients' ? 'Clientes' : 'Grátis'}</span>
                        {!isSelected && unread > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-purple-600 text-white text-[11px] font-black leading-none shadow-xs">
                                {displayUnread}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
        {division === 'free' && <div className="rounded-xl bg-purple-50 p-3">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-purple-900">Conheça grátis</span>
                <button role="switch" aria-checked={state?.enabled ?? false} aria-label="Conheça grátis" disabled={saving || !connected || !state} onClick={onToggle} className="rounded-full bg-purple-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{state?.enabled ? 'Desativar' : 'Ativar'}</button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-purple-800">Ofereça as primeiras {state?.limit ?? '…'} respostas de texto grátis. Depois, ele paga para ler suas mensagens. Pausar preserva as respostas já concedidas.</p>
            {!state?.enabled && state?.pausedAt && <p className="mt-2 text-xs text-purple-800">Conheça grátis foi pausado por falta de resposta. Você pode ativar novamente aqui.</p>}
        </div>}
    </div>;
}
