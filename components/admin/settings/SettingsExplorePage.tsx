'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Clock, Compass, RefreshCw, Wifi } from 'lucide-react';
interface PreviewUser {
    id: string;
    clerkId: string;
    username: string;
    name: string;
    photoUrl: string;
    isOnline: boolean;
    lastSeen: string | null;
    lastAccessAt?: string | null;
}

export function SettingsExplorePage() {
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

    const formatLastSeen = (user: PreviewUser) => {
        if (user.isOnline) return 'Online agora';
        const value = user.lastSeen || user.lastAccessAt;
        if (!value) return 'Nunca acessou';
        return `Último acesso ${new Date(value).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 text-purple-600"><Compass size={22} /></div>
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">Ordem do Explorar</h2>
                    <p className="mt-0.5 text-sm font-medium text-slate-500">Uma regra simples e transparente baseada apenas em disponibilidade.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
                <div className="space-y-3">
                    <Rule icon={Wifi} title="1. Online primeiro" description="Profissionais conectadas aparecem antes das demais." />
                    <Rule icon={Clock} title="2. Acesso mais recente" description="Entre as demais, quem acessou mais recentemente aparece primeiro. Quem está há mais tempo sem acessar fica no fim." />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium leading-relaxed text-slate-500">
                        Atratividade, volume de mensagens, visitas, completude e desempenho de conversa não alteram a ordem. Perfis precisam estar aprovados, visíveis e sem suspensão.
                    </div>
                </div>

                <div className="flex min-h-[420px] flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                        <div><h3 className="text-sm font-bold text-slate-800">Prévia da ordem atual</h3><p className="mt-0.5 text-xs font-medium text-slate-500">Mesma regra usada na vitrine dos clientes.</p></div>
                        <button onClick={() => void fetchPreview()} className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50" title="Atualizar prévia"><RefreshCw size={14} className={loadingPreview ? 'animate-spin' : ''} /></button>
                    </div>

                    {previewError ? (
                        <div className="my-auto flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4"><AlertCircle className="mt-0.5 shrink-0 text-rose-500" size={18} /><p className="text-xs font-medium text-rose-700">{previewError}</p></div>
                    ) : loadingPreview ? (
                        <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-400">Carregando prévia...</div>
                    ) : previewUsers.length ? (
                        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                            {previewUsers.map((user, index) => (
                                <div key={user.clerkId} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-extrabold text-slate-500">{index + 1}º</div>
                                    <Image unoptimized width={44} height={44} src={user.photoUrl || '/Logo.svg'} alt={user.name || user.username} className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover" />
                                    <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{user.name || `@${user.username}`}</p><p className="truncate text-[10px] font-semibold text-slate-400">@{user.username}</p></div>
                                    <span className={user.isOnline ? 'text-[10px] font-bold text-emerald-600' : 'text-[10px] font-medium text-slate-400'}>{formatLastSeen(user)}</span>
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

function Rule({ icon: Icon, title, description }: { icon: typeof Wifi; title: string; description: string }) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-purple-50 p-2.5 text-purple-600"><Icon size={17} /></div><div><h3 className="text-sm font-bold text-slate-800">{title}</h3><p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{description}</p></div></div></div>;
}
