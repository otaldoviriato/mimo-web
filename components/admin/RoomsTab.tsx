'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    X,
    Eye,
    MessageSquare
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface ReviewItem {
    id: string;
    roomId: string;
    status: 'pending_review' | 'confirmed_violation' | 'dismissed';
    matchedRules: string[];
    excerpts: string[];
    priority: 'normal' | 'high';
    reviewedAt?: string;
    decisionReason?: string;
    createdAt: string;
    targetMessage?: {
        id: string;
        content: string;
        timestamp: string;
        senderId: string;
    } | null;
    sender?: {
        name?: string;
        username?: string;
        photoUrl?: string;
        isProfessional?: boolean;
        clerkId?: string;
    } | null;
    receiver?: {
        name?: string;
        username?: string;
        photoUrl?: string;
        isProfessional?: boolean;
        clerkId?: string;
    } | null;
}

interface ContextMessage {
    id: string;
    content: string;
    timestamp: string;
    cost: number;
    isSuspect: boolean;
    sender: {
        name?: string;
        username?: string;
        photoUrl?: string;
        isProfessional?: boolean;
        clerkId: string;
    };
}

const RULE_LABELS: Record<string, { label: string; badgeClass: string }> = {
    telegram_keyword: { label: 'Telegram', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
    pix_contact: { label: 'Chave Pix', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    phone_sequence: { label: 'Telefone', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
    whatsapp_keyword: { label: 'WhatsApp', badgeClass: 'bg-green-50 text-green-700 border-green-200' },
    instagram_keyword: { label: 'Instagram', badgeClass: 'bg-pink-50 text-pink-700 border-pink-200' },
    contact_phrase: { label: 'Contato Externo', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    email: { label: 'E-mail', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
    social_handle: { label: 'Arroba / Perfil', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    url: { label: 'Link Externo', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export function RoomsTab() {
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [counts, setCounts] = useState({ pending: 0, violation: 0, dismissed: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'pending_review' | 'confirmed_violation' | 'dismissed' | ''>('pending_review');
    const [searchQuery, setSearchQuery] = useState('');
    const [scanning, setScanning] = useState(false);

    // Modal de Contexto (5 antes + 5 depois)
    const [activeReview, setActiveReview] = useState<ReviewItem | null>(null);
    const [contextMessages, setContextMessages] = useState<ContextMessage[]>([]);
    const [loadingContext, setLoadingContext] = useState(false);
    const [decisionNote, setDecisionNote] = useState('');
    const [savingDecision, setSavingDecision] = useState(false);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        try {
            const url = new URL('/api/admin/moderation-reviews', window.location.origin);
            if (statusFilter) url.searchParams.set('status', statusFilter);
            if (searchQuery) url.searchParams.set('q', searchQuery);

            const res = await fetch(url.toString());
            if (res.ok) {
                const data = await res.json();
                setReviews(data.reviews || []);
                if (data.counts) setCounts(data.counts);
            } else {
                toast.error('Erro ao carregar auditorias de conversas.');
            }
        } catch {
            toast.error('Erro de conexão ao carregar registros.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleRunScan = async () => {
        setScanning(true);
        try {
            const res = await fetch('/api/admin/moderation-reviews', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                toast.success(`Varredura concluída! ${data.flagged} novas suspeitas encontradas em ${data.scanned} mensagens.`);
                fetchReviews();
            } else {
                toast.error('Erro ao executar varredura.');
            }
        } catch {
            toast.error('Falha de comunicação ao escanear.');
        } finally {
            setScanning(false);
        }
    };

    const handleOpenContext = async (review: ReviewItem) => {
        setActiveReview(review);
        setDecisionNote(review.decisionReason || '');
        setLoadingContext(true);
        try {
            const res = await fetch(`/api/admin/moderation-reviews/${review.id}`);
            if (res.ok) {
                const data = await res.json();
                setContextMessages(data.messages || []);
            } else {
                toast.error('Erro ao carregar contexto das mensagens.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingContext(false);
        }
    };

    const handleRegisterDecision = async (decision: 'confirmed_violation' | 'dismissed') => {
        if (!activeReview) return;
        setSavingDecision(true);
        try {
            const res = await fetch(`/api/admin/moderation-reviews/${activeReview.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: decision,
                    decisionReason: decisionNote,
                }),
            });

            if (res.ok) {
                const label = decision === 'confirmed_violation' ? 'Violação confirmada' : 'Marcado como sem violação';
                toast.success(`${label} registrada com sucesso.`);
                
                setReviews(prev => prev.map(r => r.id === activeReview.id ? { ...r, status: decision, decisionReason: decisionNote } : r));
                setActiveReview(prev => prev ? { ...prev, status: decision, decisionReason: decisionNote } : null);
                fetchReviews();
            } else {
                toast.error('Erro ao registrar decisão de auditoria.');
            }
        } catch {
            toast.error('Falha ao salvar decisão.');
        } finally {
            setSavingDecision(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header & Resumo */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="text-purple-600" size={24} />
                        Auditoria de Conversas
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Detecção automática de suspeitas de vazamento de contatos, chaves Pix, Telegram, WhatsApp e telefones.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleRunScan}
                        disabled={scanning || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 active:bg-purple-200 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                        title="Executa varredura profunda no banco buscando palavras-chave e números"
                    >
                        <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                        {scanning ? 'Escaneando mensagens...' : 'Escanear Conversas'}
                    </button>
                    <button
                        onClick={fetchReviews}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => setStatusFilter('pending_review')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        statusFilter === 'pending_review'
                            ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                            : 'bg-white border-slate-200 hover:border-amber-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-700">Aguardando Ação</span>
                        <AlertTriangle size={18} className="text-amber-600" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900">{counts.pending}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Trechos suspeitos não revisados</p>
                </div>

                <div
                    onClick={() => setStatusFilter('confirmed_violation')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        statusFilter === 'confirmed_violation'
                            ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/20'
                            : 'bg-white border-slate-200 hover:border-rose-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-700">Violações Confirmadas</span>
                        <XCircle size={18} className="text-rose-600" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900">{counts.violation}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Vazamentos confirmados pela equipe</p>
                </div>

                <div
                    onClick={() => setStatusFilter('dismissed')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        statusFilter === 'dismissed'
                            ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20'
                            : 'bg-white border-slate-200 hover:border-emerald-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700">Não Houve Violação</span>
                        <CheckCircle2 size={18} className="text-emerald-600" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900">{counts.dismissed}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Falsos positivos descartados</p>
                </div>

                <div
                    onClick={() => setStatusFilter('')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        statusFilter === ''
                            ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-400/20'
                            : 'bg-white border-slate-200 hover:border-purple-200'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-700">Total de Trechos</span>
                        <ShieldAlert size={18} className="text-purple-600" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900">{counts.total}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">Todas as ocorrências registradas</p>
                </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => setStatusFilter('pending_review')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'pending_review'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Pendentes ({counts.pending})
                    </button>
                    <button
                        onClick={() => setStatusFilter('confirmed_violation')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'confirmed_violation'
                                ? 'bg-rose-100 text-rose-900'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Houve Violação ({counts.violation})
                    </button>
                    <button
                        onClick={() => setStatusFilter('dismissed')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'dismissed'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Não Houve Violação ({counts.dismissed})
                    </button>
                    <button
                        onClick={() => setStatusFilter('')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === ''
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Todos ({counts.total})
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, @user ou texto..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-700 placeholder-slate-400"
                    />
                </div>
            </div>

            {/* Lista de Trechos Identificados */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {loading ? (
                    <div className="py-20 text-center text-sm font-semibold text-slate-400 flex flex-col items-center gap-2">
                        <div className="animate-spin h-6 w-6 rounded-full border-2 border-slate-200 border-t-purple-600" />
                        <span>Carregando ocorrências de auditoria...</span>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                            <ShieldCheck size={24} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-700">Nenhum trecho de violação encontrado</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {statusFilter === 'pending_review'
                                    ? 'Não há conversas pendentes de análise no momento.'
                                    : 'Nenhum registro corresponde aos filtros selecionados.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                    <th className="py-3.5 px-5">Data / Hora</th>
                                    <th className="py-3.5 px-5">Participantes</th>
                                    <th className="py-3.5 px-5">Regras Violadas</th>
                                    <th className="py-3.5 px-5">Trecho Detectado</th>
                                    <th className="py-3.5 px-5">Status da Auditoria</th>
                                    <th className="py-3.5 px-5 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reviews.map(item => {
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-4 px-5 text-slate-500 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 font-medium text-[11px]">
                                                    <Clock size={12} className="text-slate-400 shrink-0" />
                                                    {formatDate(item.createdAt)}
                                                </div>
                                            </td>

                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold overflow-hidden shrink-0">
                                                        {item.sender?.photoUrl ? (
                                                            <Image src={item.sender.photoUrl} alt="" width={32} height={32} className="w-full h-full object-cover" />
                                                        ) : (
                                                            item.sender?.name?.charAt(0) || 'U'
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-slate-800 truncate text-xs">
                                                            {item.sender?.name || item.sender?.username || 'Usuário'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 truncate">
                                                            @{item.sender?.username || '-'}
                                                            {item.receiver && ` ➔ @${item.receiver.username}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                                    {item.matchedRules.map((ruleKey, rIdx) => {
                                                        const conf = RULE_LABELS[ruleKey] || { label: ruleKey, badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
                                                        return (
                                                            <span
                                                                key={rIdx}
                                                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${conf.badgeClass}`}
                                                            >
                                                                {conf.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            <td className="py-4 px-5 max-w-md">
                                                <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200/70 text-slate-800 text-xs font-medium line-clamp-2">
                                                    "{item.excerpts[0] || item.targetMessage?.content || '—'}"
                                                </div>
                                            </td>

                                            <td className="py-4 px-5 whitespace-nowrap">
                                                {item.status === 'confirmed_violation' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <XCircle size={12} />
                                                        Violação Confirmada
                                                    </span>
                                                )}
                                                {item.status === 'dismissed' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 size={12} />
                                                        Não Houve Violação
                                                    </span>
                                                )}
                                                {item.status === 'pending_review' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <AlertTriangle size={12} />
                                                        Aguardando Revisão
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-4 px-5 text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => handleOpenContext(item)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                                                >
                                                    <Eye size={13} />
                                                    Auditar Trecho
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Contexto */}
            {activeReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                    <ShieldAlert className="text-purple-600" size={18} />
                                    Auditoria de Contexto da Conversa
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Visualizando as 5 mensagens anteriores e 5 posteriores à suspeita de violação.
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveReview(null)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-200/60 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-amber-800">Regras disparadas:</span>
                                {activeReview.matchedRules.map((rule, idx) => {
                                    const conf = RULE_LABELS[rule] || { label: rule, badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };
                                    return (
                                        <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${conf.badgeClass}`}>
                                            {conf.label}
                                        </span>
                                    );
                                })}
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Sala: <code className="text-purple-600 font-bold">{activeReview.roomId}</code>
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30">
                            {loadingContext ? (
                                <div className="py-20 text-center text-sm font-semibold text-slate-400 flex flex-col items-center gap-2">
                                    <div className="animate-spin h-6 w-6 rounded-full border-2 border-slate-200 border-t-purple-600" />
                                    <span>Carregando contexto de mensagens da sala...</span>
                                </div>
                            ) : contextMessages.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                                    Nenhuma mensagem contextual localizada para esta conversa.
                                </div>
                            ) : (
                                contextMessages.map((msg, index) => {
                                    const isTarget = msg.isSuspect;
                                    return (
                                        <div
                                            key={msg.id || index}
                                            className={`p-4 rounded-2xl transition-all border ${
                                                isTarget
                                                    ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30 shadow-sm'
                                                    : 'bg-white border-slate-200/80 shadow-xs'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 overflow-hidden">
                                                        {msg.sender?.photoUrl ? (
                                                            <Image src={msg.sender.photoUrl} alt="" width={24} height={24} className="w-full h-full object-cover" />
                                                        ) : (
                                                            msg.sender?.name?.charAt(0) || 'U'
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-xs text-slate-800">
                                                        {msg.sender?.name || msg.sender?.username}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        @{msg.sender?.username}
                                                    </span>
                                                    {msg.sender?.isProfessional && (
                                                        <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-bold border border-purple-100">
                                                            Profissional
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {isTarget && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white tracking-wide uppercase">
                                                            Ponto da Suspeita
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {formatDate(msg.timestamp)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-800 leading-relaxed font-medium pl-8 whitespace-pre-wrap break-words">
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Anotação da Decisão (Opcional):
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Usuário passou telefone no trecho / Apenas compartilhou código sem infração..."
                                    value={decisionNote}
                                    onChange={e => setDecisionNote(e.target.value)}
                                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-800 placeholder-slate-400"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                                <div className="text-xs font-semibold text-slate-500">
                                    Status atual:{' '}
                                    <strong className="text-slate-800">
                                        {activeReview.status === 'confirmed_violation'
                                            ? 'Violação Confirmada'
                                            : activeReview.status === 'dismissed'
                                            ? 'Não Houve Violação'
                                            : 'Pendente'}
                                    </strong>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={savingDecision}
                                        onClick={() => handleRegisterDecision('dismissed')}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={15} />
                                        Não Houve Violação
                                    </button>

                                    <button
                                        type="button"
                                        disabled={savingDecision}
                                        onClick={() => handleRegisterDecision('confirmed_violation')}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                    >
                                        <XCircle size={15} />
                                        Houve Violação
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
