'use client';

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Zap, Flame, Award, AlertCircle } from 'lucide-react';

export interface QualificationProgressInfo {
    attemptId?: string;
    conversationId?: string;
    status: 'attempt_active' | 'attempt_qualified' | 'conversation_open' | 'settlement_pending' | 'settled' | 'none';
    progressPercent: number;
    equivalentChars: number;
    targetChars?: number;
    deadlineAt?: string | Date;
    closesAt?: string | Date;
    professionalResponded?: boolean;
    unlockedBonuses?: string[];
}

interface Props {
    progress?: QualificationProgressInfo | null;
    isProfessional?: boolean;
}

function formatCountdown(targetDateStr?: string | Date): string {
    if (!targetDateStr) return '';
    const target = new Date(targetDateStr).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) return 'Expirado';

    const totalSecs = Math.floor(diff / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
}

export function QualificationProgressBar({ progress, isProfessional }: Props) {
    const [timeLeftStr, setTimeLeftStr] = useState<string>('');

    const targetDate = progress?.status === 'conversation_open' || progress?.status === 'settlement_pending'
        ? progress?.closesAt
        : progress?.deadlineAt;

    useEffect(() => {
        if (!targetDate) {
            setTimeLeftStr('');
            return;
        }

        const updateTimer = () => {
            setTimeLeftStr(formatCountdown(targetDate));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (!progress || progress.status === 'none') {
        return null;
    }

    const isQualified = progress.status === 'conversation_open'
        || progress.status === 'attempt_qualified'
        || progress.status === 'settlement_pending'
        || progress.status === 'settled';

    const target = progress.targetChars || 500;
    const currentChars = Math.min(target, progress.equivalentChars || 0);
    const percent = isQualified ? 100 : Math.min(100, Math.round((currentChars / target) * 100));

    // Determina o texto de status
    let statusBadgeText = '';
    if (isQualified) {
        statusBadgeText = 'Conversa Qualificada';
    } else if (percent >= 100 && !progress.professionalResponded) {
        statusBadgeText = isProfessional
            ? '100% atingido — Responda a conversa antes do prazo'
            : '100% atingido — Aguardando resposta da profissional';
    } else if (!progress.professionalResponded) {
        statusBadgeText = isProfessional
            ? 'Responda a mensagem para qualificar'
            : 'Aguardando resposta da profissional';
    } else {
        statusBadgeText = 'Qualificação em andamento';
    }

    // Mapeamento dos bônus ativos
    const bonusMap: Record<string, { label: string; icon: React.ComponentType<any> }> = {
        quickReply: { label: '+10% Agilidade', icon: Zap },
        engagement: { label: '+15% Engajamento', icon: Flame },
        deepConversation: { label: '+15% Conversa Profunda', icon: Award },
    };

    return (
        <div className="w-full bg-gradient-to-r from-purple-50/90 via-white to-purple-50/90 border-b border-purple-100/80 px-4 py-2.5 flex flex-col gap-2 shadow-xs">
            {/* Top Bar: Icon + Badge + Timer */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {isQualified ? (
                        <span className="flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {statusBadgeText}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-purple-700 bg-purple-100/80 border border-purple-200/80 px-2.5 py-0.5 rounded-full shrink-0 truncate">
                            <AlertCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span className="truncate">{statusBadgeText}</span>
                        </span>
                    )}

                    {!isQualified && (
                        <span className="text-[11px] font-bold text-slate-600 hidden sm:inline">
                            {currentChars} / {target} equiv. ({percent}%)
                        </span>
                    )}
                </div>

                {timeLeftStr && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-white/90 border border-slate-200/70 px-2 py-0.5 rounded-lg shrink-0">
                        <Clock className="w-3 h-3 text-purple-600" />
                        <span>{isQualified ? 'Fecha em' : 'Prazo:'} {timeLeftStr}</span>
                    </div>
                )}
            </div>

            {/* Barra de Progresso visual se não qualificado */}
            {!isQualified && (
                <div className="w-full flex flex-col gap-1">
                    <div className="w-full bg-purple-100/60 rounded-full h-2 overflow-hidden border border-purple-200/40">
                        <div
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full transition-all duration-500 rounded-full"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold px-0.5">
                        <span>Meta de Qualificação: 500 caracteres equivalentes</span>
                        <span className="sm:hidden">{currentChars}/500 ({percent}%)</span>
                    </div>
                </div>
            )}

            {/* Bônus Desbloqueados */}
            {isQualified && progress.unlockedBonuses && progress.unlockedBonuses.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Bônus ativos:
                    </span>
                    {progress.unlockedBonuses.map((bonusKey) => {
                        const bonus = bonusMap[bonusKey] || { label: bonusKey, icon: Award };
                        const IconComponent = bonus.icon;
                        return (
                            <span
                                key={bonusKey}
                                className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md"
                            >
                                <IconComponent className="w-3 h-3 text-purple-600" />
                                {bonus.label}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
