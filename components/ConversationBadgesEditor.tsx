'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMyProfile, useUpdateProfile, QueryKeys } from '@/hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function ConversationBadgesEditor() {
    const queryClient = useQueryClient();
    const { data: userData } = useMyProfile();
    const updateProfileMutation = useUpdateProfile();

    const availableBadges: string[] = userData?.availableConversationBadges || [
        'Troca de fotos',
        'Troca de vídeos',
        'Sexting',
        'Conversas sensuais',
        'Chamada de áudio',
        'Fetiches'
    ];

    const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
    const [savedBadges, setSavedBadges] = useState<string[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const hasPopulated = useRef(false);

    useEffect(() => {
        if (userData && !hasPopulated.current) {
            const current = Array.isArray(userData.conversationBadges) ? userData.conversationBadges : [];
            setSelectedBadges(current);
            setSavedBadges(current);
            hasPopulated.current = true;
        }
    }, [userData]);

    const saveBadgesOptimistic = useCallback(async (newBadges: string[]) => {
        const previousBadges = savedBadges;
        setSavedBadges(newBadges);
        setSaveStatus('saving');

        try {
            await updateProfileMutation.mutateAsync({ conversationBadges: newBadges });
            setSaveStatus('saved');
            queryClient.invalidateQueries({ queryKey: QueryKeys.me });
            setTimeout(() => {
                setSaveStatus(prev => (prev === 'saved' ? 'idle' : prev));
            }, 2500);
        } catch {
            setSelectedBadges(previousBadges);
            setSavedBadges(previousBadges);
            setSaveStatus('idle');
            toast.error('Erro ao salvar características da conversa. Alteração desfeita.');
        }
    }, [savedBadges, updateProfileMutation, queryClient]);

    const handleToggleBadge = (badge: string) => {
        let updated: string[];
        if (selectedBadges.includes(badge)) {
            updated = selectedBadges.filter(b => b !== badge);
        } else {
            updated = [...selectedBadges, badge];
        }
        setSelectedBadges(updated);
        saveBadgesOptimistic(updated);
    };

    return (
        <section aria-label="Características da conversa" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Características da conversa</h2>
                    {saveStatus === 'saving' && (
                        <span className="text-[11px] font-medium text-purple-600 flex items-center gap-1 animate-in fade-in duration-200">
                            <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                        </span>
                    )}
                    {saveStatus === 'saved' && (
                        <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 animate-in fade-in duration-200">
                            <Check className="w-3 h-3" /> Salvo
                        </span>
                    )}
                </div>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                    {selectedBadges.length} selecionada{selectedBadges.length === 1 ? '' : 's'}
                </span>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Selecione as opções que fazem sentido para a sua conversa e o que os clientes podem esperar ao interagir com você:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
                {availableBadges.map((badge) => {
                    const isSelected = selectedBadges.includes(badge);
                    return (
                        <button
                            key={badge}
                            type="button"
                            onClick={() => handleToggleBadge(badge)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                isSelected
                                    ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                        >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            <span>{badge}</span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
