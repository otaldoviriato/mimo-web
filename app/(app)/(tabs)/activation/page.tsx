'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, UserCheck, MessageSquare, CheckCircle2, Clock, 
    ArrowRightLeft, Edit3, Send, RefreshCw, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMyProfile } from '@/hooks/useQueries';

type FilterStatus = 'all' | 'unviewed' | 'pending' | 'contacted' | 'activated' | 'my_assigned';

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

export default function ActivationPage() {
    const router = useRouter();
    const { data: myProfile } = useMyProfile();

    const [professionals, setProfessionals] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('pending');
    const [unviewedCount, setUnviewedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // Modal de Notas & Estágio
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editStage, setEditStage] = useState('');
    const [editStatus, setEditStatus] = useState<'pending' | 'contacted' | 'activated' | 'not_interested'>('pending');
    const [editNotes, setEditNotes] = useState('');
    const [editNextSteps, setEditNextSteps] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // Modal de Transferência
    const [transferringItem, setTransferringItem] = useState<any | null>(null);
    const [selectedTargetMember, setSelectedTargetMember] = useState('');
    const [savingTransfer, setSavingTransfer] = useState(false);

    // Modal de Iniciar Conversa com Mensagem Pronta
    const [chatTargetItem, setChatTargetItem] = useState<any | null>(null);
    const [customMessage, setCustomMessage] = useState('');
    const [startingChat, setStartingChat] = useState(false);

    const fetchActivationData = async (query: string = '', filter: FilterStatus = activeFilter) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/team/activation/professionals?q=${encodeURIComponent(query)}&status=${filter}`);
            if (res.ok) {
                const data = await res.json();
                setProfessionals(data.professionals || []);
                setUnviewedCount(data.unviewedCount || 0);
                setTotalCount(data.totalProfessionals || 0);
                setTeamMembers(data.teamMembers || []);
            } else {
                toast.error('Erro ao carregar fila de ativação.');
            }
        } catch (err) {
            console.error('Erro ao carregar ativação:', err);
            toast.error('Falha de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    // Marcar como visto ao entrar na aba
    useEffect(() => {
        fetch('/api/team/activation/view', { method: 'POST' }).catch(console.error);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchActivationData(searchQuery, activeFilter);
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery, activeFilter]);

    // Ação: Salvar Transferência
    const handleSaveTransfer = async () => {
        if (!transferringItem) return;
        setSavingTransfer(true);
        try {
            const res = await fetch(`/api/team/activation/professionals/${transferringItem.clerkId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignedTeamMemberId: selectedTargetMember || null,
                })
            });
            if (res.ok) {
                toast.success('Atendimento transferido com sucesso!');
                setTransferringItem(null);
                fetchActivationData(searchQuery, activeFilter);
            } else {
                toast.error('Erro ao transferir atendimento.');
            }
        } catch (err) {
            console.error('Erro:', err);
            toast.error('Erro de conexão.');
        } finally {
            setSavingTransfer(false);
        }
    };

    // Ação: Salvar Notas & Estágio
    const handleSaveEdit = async () => {
        if (!editingItem) return;
        setSavingEdit(true);
        try {
            const res = await fetch(`/api/team/activation/professionals/${editingItem.clerkId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: editStatus,
                    stage: editStage,
                    notes: editNotes,
                    nextSteps: editNextSteps,
                })
            });
            if (res.ok) {
                toast.success('Notas e estágio atualizados!');
                setEditingItem(null);
                fetchActivationData(searchQuery, activeFilter);
            } else {
                toast.error('Erro ao atualizar notas.');
            }
        } catch (err) {
            console.error('Erro:', err);
            toast.error('Erro de conexão.');
        } finally {
            setSavingEdit(false);
        }
    };

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
        } catch (e) {
            return 'N/A';
        }
    };

    const openChatModal = (prof: any) => {
        setChatTargetItem(prof);
        const defaultMsg = QUICK_MESSAGES[0].text.replace('{nome}', prof.name || prof.username);
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
                            const isAssignedToMe = act.assignedTeamMemberId === myProfile?.clerkId;
                            
                            return (
                                <div 
                                    key={prof.clerkId}
                                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all relative flex flex-col justify-between ${
                                        prof.isUnviewed ? 'border-purple-300 ring-2 ring-purple-500/10' : 'border-slate-200/80 hover:border-purple-200'
                                    }`}
                                >
                                    {/* Topo do Card */}
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                {prof.photoUrl ? (
                                                    <img src={prof.photoUrl} alt={prof.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm border border-purple-200">
                                                        {prof.name ? prof.name.substring(0, 2).toUpperCase() : 'PR'}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                                                        {prof.name || prof.username}
                                                        {prof.isUnviewed && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                                                                Novo
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                        @{prof.username}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                <Clock size={12} />
                                                {formatRelativeTime(prof.createdAt)}
                                            </span>
                                        </div>

                                        {/* Status & Responsável Badges */}
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
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
                                        {(act.stage || act.notes) && (
                                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1 text-xs text-slate-600">
                                                {act.stage && (
                                                    <p className="font-semibold text-slate-700">
                                                        📌 <span className="font-normal">{act.stage}</span>
                                                    </p>
                                                )}
                                                {act.notes && (
                                                    <p className="text-slate-500 italic truncate">
                                                        💬 "{act.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Botões de Ação */}
                                    <div className="pt-4 border-t border-slate-100 mt-4 grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => {
                                                    setTransferringItem(prof);
                                                    setSelectedTargetMember(act.assignedTeamMemberId || '');
                                                }}
                                                className="min-w-0 px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                title="Transferir para outro membro"
                                            >
                                                <ArrowRightLeft size={13} />
                                                Transferir
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setEditingItem(prof);
                                                    setEditStatus(act.status || 'pending');
                                                    setEditStage(act.stage || 'Aguardando 1º contato');
                                                    setEditNotes(act.notes || '');
                                                    setEditNextSteps(act.nextSteps || '');
                                                }}
                                                className="min-w-0 px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                title="Editar notas e estágio"
                                            >
                                                <Edit3 size={13} />
                                                Notas
                                            </button>

                                        <button
                                            onClick={() => openChatModal(prof)}
                                            className="min-w-0 px-2 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <MessageSquare size={13} />
                                            Conversar
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
                            Enviando mensagem para <strong className="text-slate-800">{chatTargetItem.name || '@' + chatTargetItem.username}</strong> como <span className="text-purple-600 font-bold">Equipe Mimo ✓</span> (Atendimento Isento de Cobrança).
                        </p>

                        {/* Seletor de Mensagens Prontas */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">Selecione um modelo de mensagem pronta:</label>
                            <div className="grid grid-cols-1 gap-2">
                                {QUICK_MESSAGES.map(msg => (
                                    <button
                                        key={msg.id}
                                        onClick={() => setCustomMessage(msg.text.replace('{nome}', chatTargetItem.name || chatTargetItem.username))}
                                        className="text-left p-3 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-xs text-slate-700 cursor-pointer space-y-1"
                                    >
                                        <p className="font-bold text-purple-700">{msg.title}</p>
                                        <p className="text-slate-500 line-clamp-2">{msg.text.replace('{nome}', chatTargetItem.name || chatTargetItem.username)}</p>
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

            {/* MODAL: Editar Estágio & Notas */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-fade-in-up">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-base">Registrar Notas & Estágio</h3>
                            <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Status da Ativação:</label>
                                <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value as any)}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800"
                                >
                                    <option value="pending">Aguardando 1º Contato</option>
                                    <option value="contacted">Em Ativação (Em Contato)</option>
                                    <option value="activated">Ativada (Concluída ✓)</option>
                                    <option value="not_interested">Sem Interesse / Inativa</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Estágio Atual:</label>
                                <input
                                    type="text"
                                    value={editStage}
                                    onChange={(e) => setEditStage(e.target.value)}
                                    placeholder="Ex: Em onboarding, foto enviada..."
                                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Observações Internas:</label>
                                <textarea
                                    rows={3}
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Notas da equipe sobre esta profissional..."
                                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Próximos Passos:</label>
                                <input
                                    type="text"
                                    value={editNextSteps}
                                    onChange={(e) => setEditNextSteps(e.target.value)}
                                    placeholder="Ex: Checar envio de documento amanhã..."
                                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Transferir Atendimento */}
            {transferringItem && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-fade-in-up">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-base">Transferir Responsável</h3>
                            <button onClick={() => setTransferringItem(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-slate-500">
                            Selecione o membro da equipe que assumirá o atendimento de <strong className="text-slate-800">{transferringItem.name || '@' + transferringItem.username}</strong>:
                        </p>

                        <select
                            value={selectedTargetMember}
                            onChange={(e) => setSelectedTargetMember(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 bg-slate-50"
                        >
                            <option value="">Nenhum (Deixar sem responsável)</option>
                            {teamMembers.map(tm => (
                                <option key={tm.clerkId} value={tm.clerkId}>
                                    {tm.name || tm.username} ({tm.teamTitle})
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setTransferringItem(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveTransfer}
                                disabled={savingTransfer}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                {savingTransfer ? 'Transferindo...' : 'Confirmar Transferência'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
