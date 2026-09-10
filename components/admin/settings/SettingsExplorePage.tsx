'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Clock, Compass, RefreshCw, Zap } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

interface PreviewUser {
    id: string;
    clerkId: string;
    username: string;
    name: string;
    photoUrl: string;
    isAvailable?: boolean;
    isOnline: boolean;
    lastSeen: string | null;
    lastAccessAt?: string | null;
}

type Props = Pick<UseSettingsReturn,
    | 'availabilityResponseTimeMinutes' | 'setAvailabilityResponseTimeMinutes'
    | 'availabilityDurationHours' | 'setAvailabilityDurationHours'
    | 'isDirtyExplore' | 'saving' | 'saveSettings'
>;

export function SettingsExplorePage({
    availabilityResponseTimeMinutes, setAvailabilityResponseTimeMinutes,
    availabilityDurationHours, setAvailabilityDurationHours,
    isDirtyExplore, saving, saveSettings,
}: Props) {
    const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState('');

    const inputCls = 'w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-sm';

    const fetchPreview = useCallback(async () => {
        setLoadingPreview(true);
        setPreviewError('');
        try {
            const response = await fetch('/api/admin/settings/explore-preview');
            if (!response.ok) throw new Error('preview_failed');
            const data = await response.json();
            setPreviewUsers(data.users || []);
        } catch {
            setPreviewError('Não foi possível carregar a prévia agora. Tente novamente.');
        } finally {
            setLoadingPreview(false);
        }
    }, []);

    useEffect(() => {
        void fetchPreview();
    }, [fetchPreview]);

    const formatLastSeen = (user: PreviewUser) => {
        if (user.isAvailable) {
            return `Disponível • Responde em até ${availabilityResponseTimeMinutes || 10} min`;
        }
        if (user.isOnline) return 'Online agora';
        const value = user.lastSeen || user.lastAccessAt;
        if (!value) return 'Nunca acessou';
        return `Último acesso ${new Date(value).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })}`;
    };

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyExplore} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 text-purple-600"><Compass size={22} /></div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">Ordem do Explorar & Disponibilidade</h2>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">Parâmetros de disponibilidade e regras transparentes de posicionamento na vitrine.</p>
                </div>
            </div>

            {/* Configurações de Disponibilidade */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
                <div>
                    <h3 className="text-base font-bold text-slate-800">Regras de Disponibilidade das Profissionais</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Ajuste o tempo de resposta prometido aos clientes e o prazo máximo de auto-expiração para a disponibilidade.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                            Tempo de Resposta Prometido (minutos)
                        </label>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Quando a profissional ativa o modo de disponibilidade, assume o compromisso público de responder em até este limite. Esse valor aparece no badge do card no Explorar e no perfil.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="number"
                                min={1}
                                max={120}
                                value={availabilityResponseTimeMinutes}
                                onChange={(e) => setAvailabilityResponseTimeMinutes(Math.max(1, Number(e.target.value)))}
                                className={inputCls}
                            />
                            <span className="text-xs font-bold text-slate-400">minutos</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                            Duração Máxima da Disponibilidade (horas)
                        </label>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Tempo máximo que a profissional permanece no status de disponível antes de expirar automaticamente. Evita perfis marcados como disponíveis indefinidamente.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="number"
                                min={1}
                                max={24}
                                value={availabilityDurationHours}
                                onChange={(e) => setAvailabilityDurationHours(Math.max(1, Number(e.target.value)))}
                                className={inputCls}
                            />
                            <span className="text-xs font-bold text-slate-400">horas</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
                <div className="space-y-3">
                    <Rule icon={Zap} title="1. Disponíveis primeiro" description="Profissionais que ativaram o modo de disponibilidade ficam no topo absoluto da vitrine." />
                    <Rule icon={Clock} title="2. Online / Acesso mais recente" description="Entre as demais, quem está online ou acessou mais recentemente aparece em seguida." />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium leading-relaxed text-slate-500">
                        No Explorar público, apenas profissionais disponíveis exibem indicador no card. Profissionais offline ou sem disponibilidade ativa não exibem nenhum badge de atividade.
                    </div>
                </div>

                <div className="flex min-h-[420px] flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                        <div><h3 className="text-sm font-bold text-slate-800">Prévia da ordem atual</h3><p className="mt-0.5 text-xs font-medium text-slate-500">Ordem em tempo real com base nas regras do Explorar.</p></div>
                        <button onClick={() => void fetchPreview()} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50" title="Atualizar prévia"><RefreshCw size={14} className={loadingPreview ? 'animate-spin' : ''} /></button>
                    </div>

                    {previewError ? (
                        <div className="my-auto flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4"><AlertCircle className="mt-0.5 shrink-0 text-rose-500" size={18} /><p className="text-xs font-medium text-rose-700">{previewError}</p></div>
                    ) : loadingPreview ? (
                        <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-400">Carregando prévia...</div>
                    ) : previewUsers.length ? (
                        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                            {previewUsers.map((user, index) => (
                                <div key={user.clerkId} className={`flex items-center gap-3 rounded-2xl border p-3 ${user.isAvailable ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-extrabold text-slate-500">{index + 1}º</div>
                                    <Image unoptimized width={44} height={44} src={user.photoUrl || '/Logo.svg'} alt={user.name || user.username} className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="truncate text-xs font-bold text-slate-800">{user.name || `@${user.username}`}</p>
                                            {user.isAvailable && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Disponível
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate text-[10px] font-semibold text-slate-400">@{user.username}</p>
                                    </div>
                                    <span className={user.isAvailable ? 'text-[10px] font-bold text-emerald-700' : user.isOnline ? 'text-[10px] font-bold text-emerald-600' : 'text-[10px] font-medium text-slate-400'}>
                                        {formatLastSeen(user)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="my-auto text-center text-xs font-medium text-slate-400">Nenhuma profissional aprovada e visível.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Rule({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-purple-50 p-2.5 text-purple-600"><Icon size={17} /></div><div><h3 className="text-sm font-bold text-slate-800">{title}</h3><p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{description}</p></div></div></div>;
}

