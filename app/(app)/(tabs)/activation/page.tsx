'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
    Search, UserCheck, MessageSquare, CheckCircle2,
    Send, RefreshCw, X, Activity, Wallet, BanknoteArrowDown,
    CalendarDays, Radio, ExternalLink, Users, MousePointerClick, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyProfile } from '@/hooks/useQueries';

type FilterStatus = 'all' | 'unviewed' | 'pending' | 'contacted' | 'activated' | 'my_assigned';
type ActivationStatus = 'pending' | 'contacted' | 'activated' | 'not_interested';
type FunnelKey = 'registered' | 'share_attempted' | 'brought_user' | 'first_client' | 'frequent';
type ActivityKey = 'active' | 'recent' | 'absent';

type ProfessionalActivationItem = {
    clerkId: string;
    username?: string;
    name?: string;
    photoUrl?: string;
    createdAt: string;
    isOnline?: boolean;
    lastSeen?: string | null;
    isUnviewed?: boolean;
    activation?: {
        assignedTeamMemberId?: string | null;
        assignedTeamMemberName?: string | null;
        status?: ActivationStatus;
        stage?: string;
        notes?: string;
    };
    activationFunnel?: {
        key?: FunnelKey;
        label?: string;
        rank?: number;
    };
    activationMetrics?: {
        totalConversationsCount?: number;
        activeConversationsCount?: number;
        ownClientConversationsCount?: number;
        broughtUsersCount?: number;
        shareClickCount?: number;
        balance?: number;
        withdrawalsCount?: number;
        lastWithdrawalAmount?: number | null;
        lastWithdrawalStatus?: string | null;
        lastWithdrawalAt?: string | null;
    };
    activityStatus?: {
        key?: ActivityKey;
        label?: string;
    };
};

const QUICK_MESSAGES = [
    {
        id: 'activ_1',
        title: 'Mensagem de Boas-vindas Padrão',
        text: 'Oi, {nome}! Vi que você acabou de criar seu perfil no MimoChat. Posso te ajudar a deixar tudo pronto e começar sua primeira conversa?'
    },
    {
        id: 'activ_2',
        title: 'Suporte de Onboarding & Perfil',
        text: 'Olá, {nome}! Sou da Equipe Mimo. Tudo bem? Vi que seu perfil foi criado recentemente. Tem alguma dúvida sobre fotos, biografia ou como configurar suas taxas?'
    },
    {
        id: 'activ_3',
        title: 'Incentivo à Primeira Interação',
        text: 'Oi, {nome}! Que bom ter você no Mimo! Se precisar de dicas para atrair mais assinantes ou ajuda nas configurações, estou por aqui!'
    }
];

const FUNNEL_STEPS = [
    { key: 'registered', label: 'Cadastro' },
    { key: 'share_attempted', label: 'Compartilhou' },
    { key: 'brought_user', label: 'Trouxe usuario' },
    { key: 'first_client', label: '1o cliente' },
    { key: 'frequent', label: 'Frequente' },
];

export default function ActivationPage() {
    const router = useRouter();
    const { data: myProfile } = useMyProfile();

    const [professionals, setProfessionals] = useState<ProfessionalActivationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('pending');
    const [unviewedCount, setUnviewedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

    // Modal de Iniciar Conversa com Mensagem Pronta
    const [chatTargetItem, setChatTargetItem] = useState<ProfessionalActivationItem | null>(null);
    const [customMessage, setCustomMessage] = useState('');
    const [startingChat, setStartingChat] = useState(false);

    const fetchActivationData = useCallback(async (query: string = '', filter: FilterStatus = 'pending') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/team/activation/professionals?q=${encodeURIComponent(query)}&status=${filter}`);
            if (res.ok) {
                const data: {
                    professionals?: ProfessionalActivationItem[];
                    unviewedCount?: number;
                    totalProfessionals?: number;
                } = await res.json();
                setProfessionals(data.professionals || []);
                setUnviewedCount(data.unviewedCount || 0);
                setTotalCount(data.totalProfessionals || 0);
            } else {
                toast.error('Erro ao carregar fila de ativação.');
            }
        } catch (err) {
            console.error('Erro ao carregar ativação:', err);
            toast.error('Falha de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Marcar como visto ao entrar na aba
    useEffect(() => {
        fetch('/api/team/activation/view', { method: 'POST' }).catch(console.error);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchActivationData(searchQuery, activeFilter);
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery, activeFilter, fetchActivationData]);

    // Ação: Iniciar Conversa com Mensagem Pronta
    const handleStartChat = async () => {
        if (!chatTargetItem) return;
        setStartingChat(true);
        try {
            const res = await fetch('/api/team/activation/start-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professionalId: chatTargetItem.clerkId,
                    initialMessage: customMessage,
                })
            });
            if (res.ok) {
                const data = await res.json();
                toast.success('Conversa iniciada com sucesso!');
                setChatTargetItem(null);
                router.push(`/chat/${data.professionalId || chatTargetItem.clerkId}`);
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao iniciar conversa.');
            }
        } catch (err) {
            console.error('Erro ao iniciar chat:', err);
            toast.error('Falha de conexão.');
        } finally {
            setStartingChat(false);
        }
    };

    const formatRelativeTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
            if (diffMin < 1) return 'Agora mesmo';
            if (diffMin < 60) return `há ${diffMin} min`;
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) return `há ${diffHours} h`;
            const diffDays = Math.floor(diffHours / 24);
            return `há ${diffDays} dias`;
        } catch {
            return 'N/A';
        }
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return 'Sem registro';
        try {
            return new Date(dateStr).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Sem registro';
        }
    };

    const formatCurrency = (amountInCents?: number | null) => {
        return ((amountInCents || 0) / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    };

    const getWithdrawalStatusLabel = (status?: string | null) => {
        if (status === 'concluido') return 'Pago';
        if (status === 'processando') return 'Processando';
        if (status === 'pendente') return 'Pendente';
        if (status === 'rejeitado') return 'Rejeitado';
        return 'Sem saque';
    };

    const getActivationStatusMeta = (status?: string) => {
        if (status === 'activated') {
            return { label: 'Ativada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
        }
        if (status === 'contacted') {
            return { label: 'Em ativacao', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
        }
        if (status === 'not_interested') {
            return { label: 'Sem interesse', className: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
        }
        return { label: '1o contato', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    };

    const getFunnelAccentClass = (stageKey?: string) => {
        if (stageKey === 'frequent') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        if (stageKey === 'first_client') return 'text-violet-700 bg-violet-50 border-violet-200';
        if (stageKey === 'brought_user') return 'text-blue-700 bg-blue-50 border-blue-200';
        if (stageKey === 'share_attempted') return 'text-amber-700 bg-amber-50 border-amber-200';
        return 'text-slate-700 bg-slate-50 border-slate-200';
    };

    const getFunnelBadgeClass = getFunnelAccentClass;

    const getActivityBadgeClass = (activityKey?: string) => {
        if (activityKey === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (activityKey === 'recent') return 'bg-sky-50 text-sky-700 border-sky-200';
        return 'bg-slate-50 text-slate-500 border-slate-200';
    };

    const getProfessionalDisplayName = (prof: ProfessionalActivationItem) => {
        return prof.name || prof.username || 'profissional';
    };

    const getLastAccessLabel = (prof: ProfessionalActivationItem) => {
        if (prof.isOnline) return 'Online agora';
        if (prof.lastSeen) return `Ultimo acesso ${formatRelativeTime(prof.lastSeen)}`;
        return `Criada ${formatRelativeTime(prof.createdAt)}`;
    };

    const toggleDetails = (clerkId: string) => {
        setExpandedDetails((current) => {
            const next = new Set(current);
            if (next.has(clerkId)) {
                next.delete(clerkId);
            } else {
                next.add(clerkId);
            }
            return next;
        });
    };

    const openChatModal = (prof: ProfessionalActivationItem) => {
        setChatTargetItem(prof);
        const defaultMsg = QUICK_MESSAGES[0].text.replace('{nome}', getProfessionalDisplayName(prof));
        setCustomMessage(defaultMsg);
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen pb-24 md:pb-10 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-4">
                
                {/* Header Principal */}
                <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-3 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-purple-100 text-purple-700 p-2 rounded-lg shrink-0">
                            <UserCheck size={18} />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">Fila de Ativação</h1>
                            <p className="hidden sm:block text-xs text-slate-500 font-medium truncate">
                                Acompanhe contatos e status das criadoras recentes.
                            </p>
                        </div>
                    </div>

                    {/* Botão de Atualização Manual */}
                    <button
                        onClick={() => fetchActivationData(searchQuery, activeFilter)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>

                {/* Filtros e Busca */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                activeFilter === 'all'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Todas Recentes ({totalCount})
                        </button>

                        <button
                            onClick={() => setActiveFilter('unviewed')}
                            className={`relative shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeFilter === 'unviewed'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Novas (Não Visualizadas)
                            {unviewedCount > 0 && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            )}
                        </button>

                        <button
                            onClick={() => setActiveFilter('pending')}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                activeFilter === 'pending'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Não Contatadas
                        </button>

                        <button
                            onClick={() => setActiveFilter('contacted')}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                activeFilter === 'contacted'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Em Ativação
                        </button>

                        <button
                            onClick={() => setActiveFilter('activated')}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                activeFilter === 'activated'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Ativadas ✓
                        </button>

                        <button
                            onClick={() => setActiveFilter('my_assigned')}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                activeFilter === 'my_assigned'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Meus Atendimentos
                        </button>
                    </div>

                    {/* Barra de Pesquisa */}
                    <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar profissional por nome, @username ou e-mail..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-800 placeholder-slate-400"
                        />
                    </div>
                </div>

                {/* Listagem de Profissionais */}
                {loading ? (
                    <div className="py-20 bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center gap-3">
                        <div className="animate-spin h-8 w-8 text-purple-600 rounded-full border-4 border-slate-200 border-t-purple-600" />
                        <span className="text-sm font-semibold text-slate-500">Carregando profissionais mais recentes...</span>
                    </div>
                ) : professionals.length === 0 ? (
                    <div className="py-16 bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <UserCheck className="w-12 h-12 text-slate-300" />
                        <h3 className="text-base font-bold text-slate-800">Nenhuma profissional encontrada</h3>
                        <p className="text-xs text-slate-400 max-w-md">
                            Não há profissionais cadastradas correspondentes aos filtros selecionados.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {professionals.map((prof) => {
                            const act = prof.activation || {};
                            const funnel = prof.activationFunnel || {};
                            const metrics = prof.activationMetrics || {};
                            const activity = prof.activityStatus || {};
                            const isAssignedToMe = act.assignedTeamMemberId === myProfile?.clerkId;
                            const statusMeta = getActivationStatusMeta(act.status);
                            const currentFunnelRank = Number(funnel.rank || 1);
                            const hasAssignedMember = Boolean(act.assignedTeamMemberId);
                            const isDetailsExpanded = expandedDetails.has(prof.clerkId);
                            
                            return (
                                <div 
                                    key={prof.clerkId}
                                    className={`bg-white border rounded-xl p-3.5 shadow-xs transition-all relative flex flex-col gap-3 ${
                                        prof.isUnviewed ? 'border-purple-300 ring-2 ring-purple-500/10' : 'border-slate-200/80 hover:border-purple-200'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <a
                                                    href={`/${prof.username}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="relative shrink-0 group"
                                                    title="Abrir perfil"
                                                >
                                                {prof.photoUrl ? (
                                                    <Image
                                                        src={prof.photoUrl}
                                                        alt={prof.name || prof.username || 'Profissional'}
                                                        width={48}
                                                        height={48}
                                                        unoptimized
                                                        className="w-12 h-12 rounded-lg object-cover border border-slate-100 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm border border-purple-200">
                                                        {prof.name ? prof.name.substring(0, 2).toUpperCase() : 'PR'}
                                                    </div>
                                                )}
                                                    {prof.isOnline && (
                                                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-100" />
                                                    )}
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-purple-600 border border-purple-100 flex items-center justify-center shadow-xs opacity-95 group-hover:bg-purple-50 transition-all">
                                                        <ExternalLink size={10} />
                                                    </span>
                                                </a>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-black text-slate-900 leading-tight flex items-center gap-1.5 min-w-0">
                                                        <span className="truncate">{getProfessionalDisplayName(prof)}</span>
                                                        {prof.isUnviewed && (
                                                            <span className="shrink-0 w-2 h-2 rounded-full bg-rose-500" title="Novo" />
                                                        )}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate">
                                                        {getLastAccessLabel(prof)}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    if (isAssignedToMe) {
                                                        router.push(`/chat/${prof.clerkId}`);
                                                        return;
                                                    }
                                                    if (!hasAssignedMember) {
                                                        openChatModal(prof);
                                                    }
                                                }}
                                                disabled={hasAssignedMember && !isAssignedToMe}
                                                className={`h-10 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all shrink-0 ${
                                                    hasAssignedMember && !isAssignedToMe
                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                                        : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                                                }`}
                                                title={isAssignedToMe ? 'Ver conversa' : hasAssignedMember ? `Em atendimento por ${act.assignedTeamMemberName || 'outro membro'}` : 'Enviar mensagem'}
                                            >
                                                <MessageSquare size={16} />
                                                <span className="max-w-[112px] truncate">
                                                    {isAssignedToMe ? 'Ver conversa' : hasAssignedMember ? (act.assignedTeamMemberName || 'Em atendimento') : 'Enviar mensagem'}
                                                </span>
                                            </button>
                                        </div>

                                        <div className="hidden">
                                            <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-[10px] font-black ${statusMeta.className}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                                                {statusMeta.label}
                                            </span>
                                            <span className={`inline-flex items-center h-6 px-2 rounded-md border text-[10px] font-bold truncate ${
                                                isAssignedToMe
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                            }`}>
                                                {act.assignedTeamMemberName || 'Sem responsavel'}
                                            </span>
                                            <span className={`ml-auto inline-flex items-center h-6 px-2 rounded-md border text-[10px] font-bold ${getActivityBadgeClass(activity.key)}`}>
                                                {activity.label || 'Ausente'}
                                            </span>
                                        </div>

                                        {/* Status & Responsável Badges */}
                                        <div className="hidden">
                                            {/* Badge de Status da Ativação */}
                                            {act.status === 'activated' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md">
                                                    <CheckCircle2 size={12} />
                                                    Ativada ✓
                                                </span>
                                            ) : act.status === 'contacted' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md">
                                                    Em Ativação
                                                </span>
                                            ) : act.status === 'not_interested' ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md">
                                                    Sem Interesse
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md">
                                                    Aguardando 1º Contato
                                                </span>
                                            )}

                                            {/* Badge de Responsável */}
                                            {act.assignedTeamMemberName ? (
                                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                                                    isAssignedToMe
                                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                    Responsável: {act.assignedTeamMemberName}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                                    Sem responsável
                                                </span>
                                            )}
                                        </div>

                                        {/* Observações & Estágio */}
                                        <div className="pt-1">
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <p className="text-sm font-black text-slate-900">{funnel.label || 'Profissional cadastrada'}</p>
                                                <span className="shrink-0 text-[11px] font-black text-purple-700 bg-purple-50 border border-purple-100 rounded-md px-2 py-1">
                                                    {currentFunnelRank}/5
                                                </span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {FUNNEL_STEPS.map((step, index) => {
                                                    const stepNumber = index + 1;
                                                    const isDone = currentFunnelRank >= stepNumber;
                                                    const isCurrent = currentFunnelRank === stepNumber;

                                                    return (
                                                        <div key={step.key} className="relative flex gap-2.5 min-h-[26px]">
                                                            {index < FUNNEL_STEPS.length - 1 && (
                                                                <span className={`absolute left-[6px] top-4 h-[calc(100%-8px)] w-0.5 ${currentFunnelRank > stepNumber ? 'bg-purple-500' : 'bg-slate-200'}`} />
                                                            )}
                                                            <span className={`relative mt-1 w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                                                                isDone
                                                                    ? 'bg-purple-600 border-purple-600'
                                                                    : 'bg-white border-slate-300'
                                                            } ${isCurrent ? 'ring-4 ring-purple-100' : ''}`} />
                                                            <span className={`text-[12px] leading-6 font-bold ${isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                                                                {step.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="hidden">
                                            <div className="px-3 py-2 bg-slate-50 flex items-center justify-between gap-2">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md border ${getFunnelBadgeClass(funnel.key)}`}>
                                                    <Activity size={12} />
                                                    {funnel.label || 'Profissional cadastrada'}
                                                </span>
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md border ${getActivityBadgeClass(activity.key)}`}>
                                                    {activity.label || 'Ausente'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-slate-100 bg-white">
                                                <div className="p-3 min-w-0">
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Conversas</p>
                                                    <p className="mt-1 flex items-center gap-1.5 text-sm font-black text-slate-800">
                                                        <MessageSquare size={13} className="text-emerald-500" />
                                                        {metrics.totalConversationsCount || 0}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{metrics.activeConversationsCount || 0} ativas · sem equipe</p>
                                                </div>
                                                <div className="p-3 min-w-0">
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Saldo</p>
                                                    <p className="mt-1 flex items-center gap-1.5 text-sm font-black text-slate-800">
                                                        <Wallet size={13} className="text-violet-500" />
                                                        {formatCurrency(metrics.balance)}
                                                    </p>
                                                </div>
                                                <div className="p-3 min-w-0">
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Saques</p>
                                                    <p className="mt-1 flex items-center gap-1.5 text-sm font-black text-slate-800">
                                                        <BanknoteArrowDown size={13} className="text-blue-500" />
                                                        {metrics.withdrawalsCount || 0}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{getWithdrawalStatusLabel(metrics.lastWithdrawalStatus)}</p>
                                                </div>
                                                <div className="p-3 min-w-0">
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Último saque</p>
                                                    <p className="mt-1 text-sm font-black text-slate-800">
                                                        {metrics.lastWithdrawalAmount != null ? formatCurrency(metrics.lastWithdrawalAmount) : 'Sem saque'}
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{formatDateTime(metrics.lastWithdrawalAt)}</p>
                                                </div>
                                                <div className="p-3 min-w-0">
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Cadastro</p>
                                                    <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                        <CalendarDays size={13} className="text-slate-400" />
                                                        {formatDateTime(prof.createdAt)}
                                                    </p>
                                                </div>
                                                <div className="p-3 min-w-0">
                                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">Última online</p>
                                                    <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                        <Radio size={13} className="text-slate-400" />
                                                        {prof.isOnline ? 'Online agora' : formatDateTime(prof.lastSeen)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                                                {metrics.ownClientConversationsCount || 0} clientes próprios com conversa · {metrics.broughtUsersCount || 0} usuários trazidos · {metrics.shareClickCount || 0} tentativas de compartilhar
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleDetails(prof.clerkId)}
                                            className="h-8 w-full flex items-center justify-center gap-1.5 text-[11px] font-black text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                                        >
                                            {isDetailsExpanded ? 'Ver menos' : 'Ver mais'}
                                            <ChevronDown size={14} className={`transition-transform ${isDetailsExpanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        <div className={`${isDetailsExpanded ? 'grid' : 'hidden'} grid-cols-4 gap-1.5 border-t border-slate-100 pt-2`}>
                                            <div className="min-w-0 rounded-lg bg-slate-50 border border-slate-100 p-2" title={`${metrics.activeConversationsCount || 0} conversas ativas`}>
                                                <MessageSquare size={13} className="text-emerald-500" />
                                                <p className="mt-1 text-sm font-black text-slate-900">{metrics.totalConversationsCount || 0}</p>
                                                <p className="text-[9px] font-bold text-slate-400 truncate">{metrics.activeConversationsCount || 0} ativas</p>
                                            </div>
                                            <div className="min-w-0 rounded-lg bg-slate-50 border border-slate-100 p-2" title="Saldo">
                                                <Wallet size={13} className="text-violet-500" />
                                                <p className="mt-1 text-[12px] font-black text-slate-900 truncate">{formatCurrency(metrics.balance)}</p>
                                                <p className="text-[9px] font-bold text-slate-400 truncate">saldo</p>
                                            </div>
                                            <div className="min-w-0 rounded-lg bg-slate-50 border border-slate-100 p-2" title={getWithdrawalStatusLabel(metrics.lastWithdrawalStatus)}>
                                                <BanknoteArrowDown size={13} className="text-blue-500" />
                                                <p className="mt-1 text-sm font-black text-slate-900">{metrics.withdrawalsCount || 0}</p>
                                                <p className="text-[9px] font-bold text-slate-400 truncate">
                                                    {metrics.lastWithdrawalAmount != null ? formatCurrency(metrics.lastWithdrawalAmount) : getWithdrawalStatusLabel(metrics.lastWithdrawalStatus)}
                                                </p>
                                            </div>
                                            <div className="min-w-0 rounded-lg bg-slate-50 border border-slate-100 p-2" title="Usuarios trazidos e compartilhamentos">
                                                <Users size={13} className="text-cyan-600" />
                                                <p className="mt-1 text-sm font-black text-slate-900">{metrics.broughtUsersCount || 0}</p>
                                                <p className="text-[9px] font-bold text-slate-400 truncate">{metrics.shareClickCount || 0} shares</p>
                                            </div>
                                        </div>

                                        <div className={`${isDetailsExpanded ? 'grid' : 'hidden'} grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-500`}>
                                            <div className="min-w-0 flex items-center gap-1.5 rounded-lg border border-slate-100 px-2 py-1.5">
                                                <CalendarDays size={12} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{formatDateTime(prof.createdAt)}</span>
                                            </div>
                                            <div className="min-w-0 flex items-center gap-1.5 rounded-lg border border-slate-100 px-2 py-1.5">
                                                <Radio size={12} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{prof.isOnline ? 'Online agora' : formatDateTime(prof.lastSeen)}</span>
                                            </div>
                                        </div>

                                        <div className={`${isDetailsExpanded ? 'flex' : 'hidden'} items-center gap-2 text-[10px] font-bold text-slate-500 min-w-0`}>
                                            <span className="inline-flex items-center gap-1 min-w-0">
                                                <MessageSquare size={11} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{metrics.ownClientConversationsCount || 0} clientes proprios</span>
                                            </span>
                                            <span className="inline-flex items-center gap-1 shrink-0">
                                                <MousePointerClick size={11} className="text-slate-400" />
                                                {metrics.shareClickCount || 0}
                                            </span>
                                            <span className="ml-auto shrink-0 text-slate-400" title="Ultimo saque">
                                                {metrics.lastWithdrawalAt ? formatDateTime(metrics.lastWithdrawalAt) : 'Sem saque'}
                                            </span>
                                        </div>

                                        {false && (act.stage || act.notes) && (
                                            <div className="min-h-[36px] bg-slate-50 border border-slate-100 px-2.5 py-2 rounded-lg space-y-0.5 text-[11px] text-slate-600">
                                                {act.stage && (
                                                    <p className="font-semibold text-slate-700">
                                                        📌 <span className="font-normal">{act.stage}</span>
                                                    </p>
                                                )}
                                                {act.notes && (
                                                    <p className="text-slate-500 italic truncate">
                                                        💬 &quot;{act.notes}&quot;
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Botões de Ação */}
                                    <div className="hidden">
                                        <a
                                            href={`/${prof.username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="min-w-0 h-11 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <ExternalLink size={14} />
                                            Ver perfil
                                        </a>

                                        <button
                                            onClick={() => openChatModal(prof)}
                                            className="min-w-0 h-11 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <MessageSquare size={15} />
                                            Conversar / ver conversa
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL: Iniciar Conversa com Mensagem Pronta */}
            {chatTargetItem && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative animate-fade-in-up">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                <MessageSquare size={18} className="text-purple-600" />
                                Iniciar Conversa Oficial
                            </h3>
                            <button onClick={() => setChatTargetItem(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500 font-medium">
                            Enviando mensagem para <strong className="text-slate-800">{getProfessionalDisplayName(chatTargetItem)}</strong> como <span className="text-purple-600 font-bold">Equipe Mimo ✓</span> (Atendimento Isento de Cobrança).
                        </p>

                        {/* Seletor de Mensagens Prontas */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">Selecione um modelo de mensagem pronta:</label>
                            <div className="grid grid-cols-1 gap-2">
                                {QUICK_MESSAGES.map(msg => (
                                    <button
                                        key={msg.id}
                                        onClick={() => setCustomMessage(msg.text.replace('{nome}', getProfessionalDisplayName(chatTargetItem)))}
                                        className="text-left p-3 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-xs text-slate-700 cursor-pointer space-y-1"
                                    >
                                        <p className="font-bold text-purple-700">{msg.title}</p>
                                        <p className="text-slate-500 line-clamp-2">{msg.text.replace('{nome}', getProfessionalDisplayName(chatTargetItem))}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Caixa de Texto Personalizável */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 block">Mensagem a enviar (personalizável):</label>
                            <textarea
                                rows={4}
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-800"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setChatTargetItem(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleStartChat}
                                disabled={startingChat || !customMessage.trim()}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                <Send size={14} />
                                {startingChat ? 'Iniciando...' : 'Enviar & Abrir Chat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
