'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    CheckCircle2,
    Clock,
    Compass,
    DollarSign,
    Eye,
    GripVertical,
    RefreshCw,
    RotateCcw,
    Sliders,
    TrendingUp,
    Wifi,
} from 'lucide-react';

type RankingMode = 'algorithm' | 'revenue' | 'recent_visits' | 'last_seen' | 'attractiveness' | 'manual';

interface PreviewUser {
    id: string;
    clerkId: string;
    username: string;
    name: string;
    photoUrl: string;
    isOnline: boolean;
    lastSeen: string | null;
    lastAccessAt?: string | null;
    totalEarningsCents?: number;
    accessCount?: number;
    impressionsCount?: number;
    clicksCount?: number;
    attractivenessRate?: number;
}

export function SettingsExplorePage() {
    const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);
    const [rankingMode, setRankingMode] = useState<RankingMode>('algorithm');
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
    const [previewError, setPreviewError] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const fetchPreview = useCallback(async () => {
        setLoadingPreview(true);
        setPreviewError('');
        try {
            const response = await fetch('/api/admin/settings/explore-preview');
            if (!response.ok) throw new Error('preview_failed');
            const data = await response.json();
            setPreviewUsers(data.users || []);
            if (data.rankingMode) {
                setRankingMode(data.rankingMode as RankingMode);
            }
        } catch {
            setPreviewError('Não foi possível carregar a prévia agora. Tente novamente.');
        } finally {
            setLoadingPreview(false);
        }
    }, []);

    useEffect(() => {
        void fetchPreview();
    }, [fetchPreview]);

    const saveSettings = async (newMode: RankingMode, newOrder?: string[]) => {
        setIsSaving(true);
        setSaveSuccessMessage('');
        try {
            const body: { rankingMode: RankingMode; manualOrder?: string[] } = { rankingMode: newMode };
            if (newOrder) {
                body.manualOrder = newOrder;
            }
            const response = await fetch('/api/admin/settings/explore-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error('save_failed');
            const data = await response.json();
            setRankingMode(data.rankingMode);
            setSaveSuccessMessage(
                newMode === 'manual'
                    ? 'Ordem manual salva e ativada com sucesso!'
                    : 'Modo automático ativado com sucesso!'
            );
            setTimeout(() => setSaveSuccessMessage(''), 4000);

            // Se for modo automático ou reset, recarrega a lista ordenada pelo novo critério
            if (newMode !== 'manual') {
                void fetchPreview();
            }
        } catch {
            setPreviewError('Erro ao salvar as configurações de ordenação. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSelectMode = (mode: RankingMode) => {
        if (mode === rankingMode && mode !== 'algorithm') return;
        void saveSettings(mode);
    };

    const handleResetToAlgorithm = () => {
        void saveSettings('algorithm');
    };

    // Reordenação local e envio
    const applyNewOrder = (reordered: PreviewUser[]) => {
        setPreviewUsers(reordered);
        setRankingMode('manual');
        const userIds = reordered.map((u) => u.clerkId || u.id);
        void saveSettings('manual', userIds);
    };

    // Drag and Drop
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const updated = [...previewUsers];
        const [movedItem] = updated.splice(draggedIndex, 1);
        updated.splice(index, 0, movedItem);
        setDraggedIndex(index);
        setPreviewUsers(updated);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        applyNewOrder(previewUsers);
    };

    // Mover com botões para cima/baixo
    const moveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= previewUsers.length) return;

        const updated = [...previewUsers];
        const [movedItem] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, movedItem);
        applyNewOrder(updated);
    };

    const formatLastSeen = (user: PreviewUser) => {
        if (user.isOnline) return 'Online agora';
        const value = user.lastSeen || user.lastAccessAt;
        if (!value) return 'Nunca acessou';
        return `Último acesso ${new Date(value).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })}`;
    };

    const formatCurrency = (cents?: number) => {
        const val = (cents || 0) / 100;
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3 text-purple-600">
                        <Compass size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-800">Ordem do Explorar</h2>
                        <p className="mt-0.5 text-sm font-medium text-slate-500">
                            Configure o critério de exibição das profissionais na vitrine ou reordene manualmente.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleResetToAlgorithm}
                        disabled={isSaving || loadingPreview}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                        title="Restaurar o ranking automático padrão"
                    >
                        <RotateCcw size={14} className={isSaving && rankingMode === 'algorithm' ? 'animate-spin' : ''} />
                        Resetar com o algoritmo
                    </button>
                    <button
                        onClick={() => void fetchPreview()}
                        disabled={loadingPreview}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                        title="Recarregar prévia"
                    >
                        <RefreshCw size={14} className={loadingPreview ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Seletor de Modo de Ranqueamento */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Modo de Ranqueamento</h3>
                        <p className="text-xs font-medium text-slate-500">
                            Escolha uma das opções automáticas ou arraste as profissionais abaixo para ativar o modo manual.
                        </p>
                    </div>
                    <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            rankingMode === 'manual'
                                ? 'border border-amber-200 bg-amber-50 text-amber-800'
                                : 'border border-purple-200 bg-purple-50 text-purple-700'
                        }`}
                    >
                        {rankingMode === 'manual' ? 'Modo Manual Ativo' : 'Modo Automático Ativo'}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <button
                        type="button"
                        onClick={() => handleSelectMode('algorithm')}
                        disabled={isSaving}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                            rankingMode === 'algorithm'
                                ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex w-full items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <Sliders size={14} className="text-purple-600" />
                                Algoritmo atual
                            </span>
                            {rankingMode === 'algorithm' && (
                                <CheckCircle2 size={15} className="text-purple-600" />
                            )}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                            Regra padrão: primeiro quem está online, depois quem acessou mais recentemente.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelectMode('attractiveness')}
                        disabled={isSaving}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                            rankingMode === 'attractiveness'
                                ? 'border-pink-600 bg-pink-50/50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex w-full items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <TrendingUp size={14} className="text-pink-600" />
                                Mais atraentes
                            </span>
                            {rankingMode === 'attractiveness' && (
                                <CheckCircle2 size={15} className="text-pink-600" />
                            )}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                            Maior taxa de conversão: proporção de cliques recebidos sobre exibições na vitrine.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelectMode('revenue')}
                        disabled={isSaving}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                            rankingMode === 'revenue'
                                ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex w-full items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <DollarSign size={14} className="text-emerald-600" />
                                Mais faturaram
                            </span>
                            {rankingMode === 'revenue' && (
                                <CheckCircle2 size={15} className="text-emerald-600" />
                            )}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                            Ranqueia no topo as profissionais com maior volume financeiro faturado.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelectMode('recent_visits')}
                        disabled={isSaving}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                            rankingMode === 'recent_visits'
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex w-full items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <Eye size={14} className="text-blue-600" />
                                Acessadas recente
                            </span>
                            {rankingMode === 'recent_visits' && (
                                <CheckCircle2 size={15} className="text-blue-600" />
                            )}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                            Ordena por clientes que visitaram o perfil da profissional recentemente.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSelectMode('last_seen')}
                        disabled={isSaving}
                        className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition ${
                            rankingMode === 'last_seen'
                                ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex w-full items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <Clock size={14} className="text-indigo-600" />
                                Último acesso
                            </span>
                            {rankingMode === 'last_seen' && (
                                <CheckCircle2 size={15} className="text-indigo-600" />
                            )}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-slate-500">
                            Prioriza quem fez login ou teve atividade na plataforma mais recentemente.
                        </p>
                    </button>
                </div>

                {saveSuccessMessage && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        {saveSuccessMessage}
                    </div>
                )}
            </div>

            {/* Painel Principal */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
                {/* Instruções e Regras */}
                <div className="space-y-3">
                    <Rule
                        icon={GripVertical}
                        title="Ordenação Manual"
                        description="Arraste e solte os cards na lista ao lado para posicionar qualquer profissional onde desejar. Ao mover, a ordenação manual será ativada automaticamente."
                    />
                    <Rule
                        icon={Wifi}
                        title="Online em Destaque"
                        description="Nos modos automáticos, profissionais online continuam tendo prioridade visual para os clientes."
                    />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium leading-relaxed text-slate-500">
                        Apenas perfis aprovados, visíveis e não suspensos são listados no Explorar. Novas profissionais criadas após um ranqueamento manual serão posicionadas logo após a ordem definida.
                    </div>
                </div>

                {/* Lista com Drag and Drop */}
                <div className="flex min-h-[460px] flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Ordem de Exibição das Profissionais</h3>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">
                                {rankingMode === 'manual'
                                    ? 'Modo manual ativo: arraste ou use as setas para ajustar a posição exata.'
                                    : 'Exibindo ordem calculada automaticamente. Arraste qualquer profissional para mudar para manual.'}
                            </p>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                            {previewUsers.length} {previewUsers.length === 1 ? 'perfil' : 'perfis'}
                        </span>
                    </div>

                    {previewError ? (
                        <div className="my-auto flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                            <AlertCircle className="mt-0.5 shrink-0 text-rose-500" size={18} />
                            <p className="text-xs font-medium text-rose-700">{previewError}</p>
                        </div>
                    ) : loadingPreview ? (
                        <div className="flex flex-1 items-center justify-center text-xs font-bold text-slate-400">
                            Carregando profissionais...
                        </div>
                    ) : previewUsers.length ? (
                        <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1">
                            {previewUsers.map((user, index) => {
                                const isBeingDragged = draggedIndex === index;
                                return (
                                    <div
                                        key={user.clerkId || user.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`group flex items-center gap-3 rounded-2xl border p-3 transition ${
                                            isBeingDragged
                                                ? 'border-purple-300 bg-purple-50/70 shadow-md'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                        }`}
                                    >
                                        {/* Grip Handle */}
                                        <div
                                            className="flex cursor-grab items-center justify-center p-1 text-slate-300 transition hover:text-slate-600 active:cursor-grabbing"
                                            title="Clique e arraste para reordenar"
                                        >
                                            <GripVertical size={18} />
                                        </div>

                                        {/* Posição */}
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-extrabold text-slate-600">
                                            {index + 1}º
                                        </div>

                                        {/* Foto */}
                                        <Image
                                            unoptimized
                                            width={44}
                                            height={44}
                                            src={user.photoUrl || '/Logo.svg'}
                                            alt={user.name || user.username}
                                            className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover"
                                        />

                                        {/* Informações do usuário */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-xs font-bold text-slate-800">
                                                    {user.name || `@${user.username}`}
                                                </p>
                                                {user.isOnline && (
                                                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Online agora" />
                                                )}
                                            </div>
                                            <p className="truncate text-[11px] font-semibold text-slate-400">
                                                @{user.username}
                                            </p>
                                        </div>

                                        {/* Métricas e status */}
                                        <div className="hidden flex-col items-end text-right sm:flex">
                                            <span
                                                className={
                                                    user.isOnline
                                                        ? 'text-[11px] font-bold text-emerald-600'
                                                        : 'text-[11px] font-medium text-slate-400'
                                                }
                                            >
                                                {formatLastSeen(user)}
                                            </span>
                                            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                                                <span>Atratividade: <strong className="font-bold text-pink-600">{user.attractivenessRate ?? 0}%</strong> ({user.clicksCount ?? 0} cliques / {user.impressionsCount ?? 0} exibições)</span>
                                                <span>• Faturamento: <strong className="text-slate-600">{formatCurrency(user.totalEarningsCents)}</strong></span>
                                            </div>
                                        </div>

                                        {/* Ações de subir / descer */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => moveItem(index, 'up')}
                                                disabled={index === 0 || isSaving}
                                                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
                                                title="Mover para cima"
                                            >
                                                <ArrowUp size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveItem(index, 'down')}
                                                disabled={index === previewUsers.length - 1 || isSaving}
                                                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-30"
                                                title="Mover para baixo"
                                            >
                                                <ArrowDown size={13} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="my-auto text-center text-xs font-medium text-slate-400">
                            Nenhuma profissional aprovada e visível.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Rule({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Wifi;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
                    <Icon size={17} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{description}</p>
                </div>
            </div>
        </div>
    );
}
