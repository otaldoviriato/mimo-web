'use client';

import React, { useState, useEffect } from 'react';
import { 
    Compass, ChevronUp, ChevronDown, MessageSquare, 
    Mail, CheckCircle, Clock, Wifi, AlertCircle, RefreshCw 
} from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
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
    activeConversationsCount: number;
    messagesLastWeekCount: number;
    city: string;
    state: string;
}

const CRITERIA_META: Record<string, { label: string; desc: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
    activeConversations: {
        label: 'Conversas Ativas',
        desc: 'Quantidade de chats de atendimento ativos (que tiveram interação no período configurado de inatividade).',
        icon: MessageSquare,
        color: 'text-blue-600 border-blue-200',
        bg: 'bg-blue-50'
    },
    messagesLastWeek: {
        label: 'Mensagens na Última Semana',
        desc: 'Total de mensagens reais trocadas (enviadas ou recebidas) nos últimos 7 dias.',
        icon: Mail,
        color: 'text-emerald-600 border-emerald-200',
        bg: 'bg-emerald-50'
    },
    online: {
        label: 'Status Online Primeiro',
        desc: 'Dá prioridade imediata para profissionais que estão atualmente conectados no aplicativo.',
        icon: Wifi,
        color: 'text-violet-600 border-violet-200',
        bg: 'bg-violet-50'
    },
    recentAccess: {
        label: 'Acesso Mais Recente',
        desc: 'Ordena pela última vez em que o profissional esteve ativo (ou data de criação do perfil).',
        icon: Clock,
        color: 'text-amber-600 border-amber-200',
        bg: 'bg-amber-50'
    },
    completeness: {
        label: 'Completude do Perfil',
        desc: 'Completude calculada baseada no preenchimento de foto de perfil, capa, bio e fotos públicas (Z%).',
        icon: CheckCircle,
        color: 'text-pink-600 border-pink-200',
        bg: 'bg-pink-50'
    }
};

export function SettingsExplorePage({
    exploreSortingCriteria, setExploreSortingCriteria,
    isDirtyExplore, saving, saveSettings,
}: Props) {
    const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [previewError, setPreviewError] = useState('');

    const fetchPreview = async (criteriaList: string[]) => {
        setLoadingPreview(true);
        setPreviewError('');
        try {
            const criteriaQuery = criteriaList.join(',');
            const res = await fetch(`/api/admin/settings/explore-preview?criteria=${criteriaQuery}`);
            if (res.ok) {
                const data = await res.json();
                setPreviewUsers(data.users || []);
            } else {
                setPreviewError('Erro ao carregar simulação de ordenação.');
            }
        } catch (err) {
            setPreviewError('Falha na conexão para buscar simulação.');
        } finally {
            setLoadingPreview(false);
        }
    };

    useEffect(() => {
        if (exploreSortingCriteria && exploreSortingCriteria.length > 0) {
            fetchPreview(exploreSortingCriteria);
        }
    }, [exploreSortingCriteria]);

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newCriteria = [...exploreSortingCriteria];
        const temp = newCriteria[index];
        newCriteria[index] = newCriteria[index - 1];
        newCriteria[index - 1] = temp;
        setExploreSortingCriteria(newCriteria);
    };

    const moveDown = (index: number) => {
        if (index === exploreSortingCriteria.length - 1) return;
        const newCriteria = [...exploreSortingCriteria];
        const temp = newCriteria[index];
        newCriteria[index] = newCriteria[index + 1];
        newCriteria[index + 1] = temp;
        setExploreSortingCriteria(newCriteria);
    };

    const formatLastSeen = (dateStr: string | null, isOnline: boolean) => {
        if (isOnline) return 'Online agora';
        if (!dateStr) return 'Nunca';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Formato inválido';
        }
    };

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyExplore} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                    <Compass size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">Explorar & Desempate</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5 font-sans">
                        Configure a prioridade de ordenação dinâmica dos perfis profissionais na aba de Explorar.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Painel de Reordenação */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 font-sans">Definição de Regras de Prioridade</h3>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1 font-sans">
                                Ordene os critérios abaixo do mais prioritário para o menos prioritário. O primeiro critério será testado; se houver empate entre profissionais, o segundo critério será usado para desempate, e assim sucessivamente.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {exploreSortingCriteria.map((criterion, idx) => {
                                const meta = CRITERIA_META[criterion];
                                if (!meta) return null;
                                const Icon = meta.icon;

                                return (
                                    <div 
                                        key={criterion}
                                        className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition-all"
                                    >
                                        <div className={`p-2.5 rounded-lg border ${meta.color} ${meta.bg} shrink-0 mt-0.5`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-slate-800 font-sans">{meta.label}</h4>
                                            <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5 font-sans">{meta.desc}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 shrink-0 ml-1">
                                            <button
                                                onClick={() => moveUp(idx)}
                                                disabled={idx === 0}
                                                className={`p-1 rounded-md transition-colors ${
                                                    idx === 0 
                                                        ? 'text-slate-300 cursor-not-allowed' 
                                                        : 'text-slate-500 hover:bg-slate-200/60 active:bg-slate-200'
                                                }`}
                                                title="Subir prioridade"
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => moveDown(idx)}
                                                disabled={idx === exploreSortingCriteria.length - 1}
                                                className={`p-1 rounded-md transition-colors ${
                                                    idx === exploreSortingCriteria.length - 1 
                                                        ? 'text-slate-300 cursor-not-allowed' 
                                                        : 'text-slate-500 hover:bg-slate-200/60 active:bg-slate-200'
                                                }`}
                                                title="Descer prioridade"
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                            <p className="text-[11px] text-purple-700 font-semibold leading-relaxed font-sans">
                                💡 Dica: Arraste ou use as setas para colocar os critérios mais determinantes no topo. A regra padrão prioriza <strong>Conversas Ativas</strong>, usando <strong>Mensagens</strong> como desempate primário.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Visualização de Preview */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col min-h-[480px]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 font-sans">Simulação da Ordem Real (Preview)</h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5 font-sans">
                                    Veja abaixo como a ordem dos perfis reais no Explorar se reflete imediatamente com as regras atuais.
                                </p>
                            </div>
                            <button 
                                onClick={() => fetchPreview(exploreSortingCriteria)}
                                className="p-2 hover:bg-slate-50 active:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center text-slate-500 hover:text-slate-700"
                                title="Atualizar preview"
                            >
                                <RefreshCw size={14} className={loadingPreview ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {previewError && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3 my-auto">
                                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <h4 className="text-xs font-bold text-rose-800 font-sans">Falha na Simulação</h4>
                                    <p className="text-xs text-rose-600 font-medium leading-relaxed mt-0.5 font-sans">{previewError}</p>
                                </div>
                            </div>
                        )}

                        {loadingPreview ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20">
                                <div className="animate-spin h-8 w-8 text-purple-600 rounded-full border-4 border-slate-100 border-t-purple-600 mb-2" />
                                <span className="text-xs font-bold text-slate-400 font-sans">Processando regras de ordenação...</span>
                            </div>
                        ) : previewUsers.length > 0 ? (
                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1.5">
                                {previewUsers.map((user, idx) => {
                                    const rank = idx + 1;
                                    const mainPhoto = user.photoUrl || '/Logo.svg';

                                    return (
                                        <div 
                                            key={user.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-all gap-4 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Rank Badge */}
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold font-sans shrink-0 border ${
                                                    rank === 1 
                                                        ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm'
                                                        : rank === 2 
                                                            ? 'bg-slate-100 border-slate-300 text-slate-650'
                                                            : rank === 3 
                                                                ? 'bg-orange-50 border-orange-200 text-orange-600'
                                                                : 'bg-slate-50 border-slate-100 text-slate-400'
                                                }`}>
                                                    {rank}º
                                                </div>

                                                {/* Foto */}
                                                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                                    <img 
                                                        src={mainPhoto} 
                                                        alt={user.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                {/* Informações básicas */}
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-slate-800 truncate max-w-[140px] font-sans">
                                                            {user.name || `@${user.username}`}
                                                        </span>
                                                        {user.isOnline ? (
                                                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                            </span>
                                                        ) : (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-semibold font-sans">@{user.username}</span>
                                                    <span className="text-[9px] text-slate-400 font-medium font-sans">
                                                        {user.city && user.state ? `${user.city}, ${user.state}` : 'Brasil'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Métricas explicativas */}
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 shrink-0 sm:ml-auto">
                                                {/* Métricas */}
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-left shrink-0 w-full sm:w-auto">
                                                    <div className="flex items-center gap-1.5">
                                                        <MessageSquare size={11} className="text-blue-500" />
                                                        <span className="text-[10px] text-slate-500 font-medium font-sans">
                                                            <strong className="text-slate-800">{user.activeConversationsCount}</strong> ativas
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail size={11} className="text-emerald-500" />
                                                        <span className="text-[10px] text-slate-500 font-medium font-sans">
                                                            <strong className="text-slate-800">{user.messagesLastWeekCount}</strong> msgs/sem
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle size={11} className="text-pink-500" />
                                                        <span className="text-[10px] text-slate-500 font-medium font-sans">
                                                            <strong className="text-slate-800">{user.completeness}%</strong> perfil
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={11} className="text-amber-500" />
                                                        <span className="text-[10px] text-slate-400 font-semibold font-sans truncate max-w-[80px]" title={formatLastSeen(user.lastSeen, user.isOnline)}>
                                                            {formatLastSeen(user.lastSeen, user.isOnline)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center my-auto">
                                <Compass className="text-slate-300 mb-2" size={32} />
                                <h4 className="text-xs font-bold text-slate-700 font-sans">Nenhum criador elegível</h4>
                                <p className="text-xs text-slate-400 font-medium max-w-xs mt-0.5 leading-relaxed font-sans">
                                    Não foram encontrados profissionais qualificados e ativos na base de dados para serem exibidos no explorar.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
