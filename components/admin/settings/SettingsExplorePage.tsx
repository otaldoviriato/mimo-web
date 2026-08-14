'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Compass, Eye, MessageSquare, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'exploreSortingCriteria' | 'setExploreSortingCriteria'
    | 'isDirtyExplore' | 'saving' | 'saveSettings'
>;

interface PreviewUser {
    id: string;
    clerkId: string;
    username: string;
    name: string;
    photoUrl: string;
    isOnline: boolean;
    lastSeen: string | null;
    completeness: number;
    exploreImpressionsCount: number;
    exploreProfileViewsCount: number;
    qualifiedConversationsCount: number;
    city: string;
    state: string;
}

const RULES = [
    {
        title: 'Dar uma chance para quem apareceu pouco',
        description: 'Oito das 30 vagas ficam reservadas para perfis com menos de 100 aparições no Explorar.',
        icon: Sparkles,
        style: 'bg-purple-50 border-purple-100 text-purple-600',
    },
    {
        title: 'Destacar quem rende boas conversas',
        description: 'As outras vagas priorizam quem acumulou mais conversas pagas com mensagens dos dois lados.',
        icon: Trophy,
        style: 'bg-amber-50 border-amber-100 text-amber-600',
    },
    {
        title: 'Usar sinais simples no desempate',
        description: 'Estar online, receber visitas, entrar recentemente e ter um perfil bem preenchido ajudam no desempate.',
        icon: CheckCircle,
        style: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    },
];

export function SettingsExplorePage(props: Props) {
    void props;
    const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState('');

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

    const formatLastSeen = (dateString: string | null, isOnline: boolean) => {
        if (isOnline) return 'Online agora';
        if (!dateString) return 'Sem acesso recente';
        return new Date(dateString).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 text-purple-600">
                    <Compass size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">Como o Explorar escolhe os perfis</h2>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">
                        A vitrine mistura novas descobertas com quem já mostrou que sabe manter uma boa conversa.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-1">
                    {RULES.map(({ title, description, icon: Icon, style }, index) => (
                        <div key={title} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className={`shrink-0 rounded-xl border p-2.5 ${style}`}><Icon size={17} /></div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passo {index + 1}</p>
                                    <h3 className="mt-0.5 text-sm font-bold text-slate-800">{title}</h3>
                                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6 lg:col-span-2">
                    <div className="flex min-h-[480px] flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Como a vitrine está ficando</h3>
                                <p className="mt-0.5 text-xs font-medium text-slate-500">Prévia com os números reais de cada perfil.</p>
                            </div>
                            <button onClick={() => void fetchPreview()} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50" title="Atualizar prévia">
                                <RefreshCw size={14} className={loadingPreview ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {previewError ? (
                            <div className="my-auto flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                                <AlertCircle className="mt-0.5 shrink-0 text-rose-500" size={18} />
                                <p className="text-xs font-medium text-rose-700">{previewError}</p>
                            </div>
                        ) : loadingPreview ? (
                            <div className="flex flex-1 flex-col items-center justify-center py-20">
                                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-slate-100 border-t-purple-600" />
                                <span className="text-xs font-bold text-slate-400">Montando a vitrine...</span>
                            </div>
                        ) : previewUsers.length ? (
                            <div className="max-h-[520px] flex-1 space-y-3 overflow-y-auto pr-1.5">
                                {previewUsers.map((user, index) => (
                                    <div key={user.clerkId} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-500">{index + 1}º</div>
                                            <Image unoptimized width={44} height={44} src={user.photoUrl || '/Logo.svg'} alt={user.name || user.username} className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover" />
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold text-slate-800">{user.name || `@${user.username}`}</p>
                                                <p className="truncate text-[10px] font-semibold text-slate-400">@{user.username}</p>
                                                <p className="text-[9px] font-medium text-slate-400">{user.city && user.state ? `${user.city}, ${user.state}` : 'Brasil'}</p>
                                            </div>
                                        </div>
                                        <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:ml-auto sm:w-auto">
                                            <Metric icon={Trophy} value={user.qualifiedConversationsCount} label="boas conversas" />
                                            <Metric icon={Sparkles} value={user.exploreImpressionsCount} label="aparições" />
                                            <Metric icon={Eye} value={user.exploreProfileViewsCount} label="visitas" />
                                            <Metric icon={Clock} value={formatLastSeen(user.lastSeen, user.isOnline)} label="" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="my-auto flex flex-1 flex-col items-center justify-center py-20 text-center">
                                <Compass className="mb-2 text-slate-300" size={32} />
                                <h4 className="text-xs font-bold text-slate-700">Nenhum perfil disponível agora</h4>
                                <p className="mt-0.5 max-w-xs text-xs font-medium text-slate-400">A prévia aparecerá quando houver profissionais aprovadas e ativas.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Metric({ icon: Icon, value, label }: { icon: typeof MessageSquare; value: string | number; label: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <Icon size={11} className="shrink-0 text-purple-500" />
            <span className="truncate text-[10px] font-medium text-slate-500"><strong className="text-slate-800">{value}</strong>{label ? ` ${label}` : ''}</span>
        </div>
    );
}
