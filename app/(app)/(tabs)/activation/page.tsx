'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
    ExternalLink, 
    MessageCircle, 
    Search, 
    UserCheck, 
    X, 
    CheckCircle, 
    Clock, 
    Send,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

type FilterStatus = 'pending_approval' | 'unviewed' | 'pending' | 'contacted' | 'my_assigned';

type ProfessionalActivationItem = {
    clerkId: string;
    username?: string;
    name?: string;
    photoUrl?: string;
    createdAt: string;
    professionalStatus?: 'pending' | 'approved' | 'rejected' | null;
    applicantCompletedAt?: string | null;
    applicantEnrollment?: boolean;
    bio?: string;
    isUnviewed?: boolean;
    activation?: {
        assignedTeamMemberId?: string | null;
        assignedTeamMemberName?: string | null;
        status?: 'pending' | 'contacted' | 'activated' | 'not_interested';
        contactedAt?: string | null;
    };
};

const FILTERS: Array<{ key: FilterStatus; label: string }> = [
    { key: 'pending_approval', label: 'Em análise' },
    { key: 'unviewed', label: 'Novas' },
    { key: 'pending', label: 'Sem contato' },
    { key: 'contacted', label: 'Com contato' },
    { key: 'my_assigned', label: 'Minhas' },
];

export default function ActivationPage() {
    const router = useRouter();

    const [professionals, setProfessionals] = useState<ProfessionalActivationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('pending_approval');
    const [unviewedCount, setUnviewedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [showSearch, setShowSearch] = useState(false);

    // Modal de mensagem para entrar em contato
    const [contactModalUser, setContactModalUser] = useState<ProfessionalActivationItem | null>(null);
    const [initialMessage, setInitialMessage] = useState('Olá! Sou da equipe Mimo. Vi que seu perfil está em análise e gostaria de te dar as boas-vindas.');
    const [sendingContact, setSendingContact] = useState(false);

    // Estado para aprovação em andamento
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const fetchActivationData = useCallback(async (query: string = '', filter: FilterStatus = 'pending_approval') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/team/activation/professionals?q=${encodeURIComponent(query)}&status=${filter}`);
            if (!res.ok) {
                toast.error('Erro ao carregar lista de profissionais.');
                return;
            }

            const data: {
                professionals?: ProfessionalActivationItem[];
                unviewedCount?: number;
                totalProfessionals?: number;
            } = await res.json();

            setProfessionals(data.professionals || []);
            setUnviewedCount(data.unviewedCount || 0);
            setTotalCount(data.totalProfessionals || 0);
        } catch (err) {
            console.error('Erro ao carregar ativação:', err);
            toast.error('Falha de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch('/api/team/activation/view', { method: 'POST' }).catch(console.error);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchActivationData(searchQuery, activeFilter);
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery, activeFilter, fetchActivationData]);

    useEffect(() => {
        const toggleSearch = () => setShowSearch(current => !current);
        window.addEventListener('mimo:activation-toggle-search', toggleSearch);
        return () => window.removeEventListener('mimo:activation-toggle-search', toggleSearch);
    }, []);

    const getProfessionalDisplayName = (prof: ProfessionalActivationItem) => {
        return prof.name || prof.username || 'Profissional';
    };

    const formatCreatedAt = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return 'Data indisponível';
        }
    };

    const hasTeamContact = (prof: ProfessionalActivationItem) => {
        const status = prof.activation?.status;
        return status === 'contacted' || status === 'activated' || Boolean(prof.activation?.contactedAt);
    };

    // Ação: Entrar em contato via Chat
    const handleStartChat = async () => {
        if (!contactModalUser) return;
        setSendingContact(true);
        try {
            const res = await fetch('/api/team/activation/start-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    professionalId: contactModalUser.clerkId,
                    initialMessage: initialMessage.trim() || undefined,
                })
            });

            if (res.ok) {
                toast.success('Conversa iniciada com sucesso!');
                setContactModalUser(null);
                // Redireciona para o chat com a profissional
                router.push(`/chat/${contactModalUser.username || contactModalUser.clerkId}`);
            } else {
                const errData = await res.json().catch(() => null);
                toast.error(errData?.error || 'Não foi possível iniciar o chat.');
            }
        } catch (err) {
            console.error('Erro ao iniciar chat:', err);
            toast.error('Erro de conexão ao iniciar chat.');
        } finally {
            setSendingContact(false);
        }
    };

    // Ação: Aprovar Perfil
    const handleApproveProfile = async (prof: ProfessionalActivationItem) => {
        const displayName = getProfessionalDisplayName(prof);
        if (!confirm(`Deseja aprovar o perfil de ${displayName}?\nIsso liberará a conta para receber mensagens comerciais e publicações.`)) {
            return;
        }

        setApprovingId(prof.clerkId);
        try {
            const res = await fetch(`/api/team/activation/professionals/${prof.clerkId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approveProfile: true,
                    action: 'Perfil aprovado diretamente pela equipe de ativação',
                })
            });

            if (res.ok) {
                toast.success(`Perfil de ${displayName} aprovado com sucesso!`);
                // Remove da lista ou atualiza estado
                setProfessionals(prev => prev.filter(p => p.clerkId !== prof.clerkId));
                setTotalCount(prev => Math.max(0, prev - 1));
            } else {
                const errData = await res.json().catch(() => null);
                toast.error(errData?.error || 'Erro ao aprovar perfil.');
            }
        } catch (err) {
            console.error('Erro ao aprovar:', err);
            toast.error('Erro de conexão ao aprovar perfil.');
        } finally {
            setApprovingId(null);
        }
    };

    return (
        <div className="flex-1 min-h-screen bg-slate-50 pb-24 md:pb-10 p-4 md:p-8">
            <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black text-slate-900">Ativação de Profissionais</h1>
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                    <Clock size={12} />
                                    Em análise
                                </span>
                            </div>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                                {totalCount} profissionais aguardando contato e aprovação
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {FILTERS.map(filter => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                                    activeFilter === filter.key
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {filter.label}
                                {filter.key === 'unviewed' && unviewedCount > 0 ? ` (${unviewedCount})` : ''}
                                {filter.key === 'pending_approval' ? ` (${totalCount})` : ''}
                            </button>
                        ))}
                    </div>

                    {showSearch && (
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar por nome, @username ou e-mail..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                                    title="Limpar busca"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200/80 bg-white py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
                        <span className="text-sm font-semibold text-slate-500">Buscando profissionais em análise...</span>
                    </div>
                ) : professionals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-slate-200/80 bg-white p-6 py-16 text-center">
                        <CheckCircle className="h-12 w-12 text-emerald-400" />
                        <h3 className="text-base font-bold text-slate-800">Tudo em dia!</h3>
                        <p className="max-w-md text-xs text-slate-400">Não há profissionais pendentes de análise correspondentes ao filtro.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
                        {professionals.map((prof) => {
                            const contacted = hasTeamContact(prof);
                            const isApproving = approvingId === prof.clerkId;

                            return (
                                <article
                                    key={prof.clerkId}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors hover:bg-slate-50/70 ${
                                        prof.isUnviewed ? 'bg-amber-50/30' : 'bg-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <button
                                            type="button"
                                            onClick={() => prof.username && router.push(`/${prof.username}`)}
                                            className="relative shrink-0 cursor-pointer"
                                            title="Abrir perfil público"
                                        >
                                            <AvatarImage prof={prof} />
                                            {prof.isUnviewed && (
                                                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                                            )}
                                        </button>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => prof.username && router.push(`/${prof.username}`)}
                                                    className="truncate text-sm font-black leading-tight text-slate-900 hover:text-purple-600 transition-colors cursor-pointer text-left"
                                                >
                                                    {getProfessionalDisplayName(prof)}
                                                </button>
                                                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    Em análise
                                                </span>
                                            </div>

                                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                                                @{prof.username || 'sem-username'} • Cadastro em {formatCreatedAt(prof.createdAt)}
                                            </p>

                                            {prof.bio && (
                                                <p className="mt-1 text-xs text-slate-600 line-clamp-1 italic">
                                                    &ldquo;{prof.bio}&rdquo;
                                                </p>
                                            )}

                                            <div className="mt-1.5 flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                                    contacted
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 bg-slate-50 text-slate-500'
                                                }`}>
                                                    <MessageCircle size={10} />
                                                    {contacted ? 'Com contato' : 'Sem contato'}
                                                </span>
                                                {prof.activation?.assignedTeamMemberName && (
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        Resp: {prof.activation.assignedTeamMemberName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ações da Equipe */}
                                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setContactModalUser(prof)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
                                            title="Entrar em contato via chat"
                                        >
                                            <MessageCircle size={14} className="text-purple-600" />
                                            <span>Entrar em contato</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleApproveProfile(prof)}
                                            disabled={isApproving}
                                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                                            title="Aprovar perfil monetizado"
                                        >
                                            {isApproving ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <UserCheck size={14} />
                                            )}
                                            <span>Aprovar</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => prof.username && router.push(`/${prof.username}`)}
                                            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                                            title="Ver perfil completo"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Entrar em Contato */}
            {contactModalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-black text-slate-900">Entrar em Contato</h3>
                                <p className="text-xs text-slate-500">
                                    Inicie uma conversa oficial com @{contactModalUser.username}
                                </p>
                            </div>
                            <button
                                onClick={() => setContactModalUser(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Mensagem inicial (opcional)
                                </label>
                                <textarea
                                    rows={4}
                                    value={initialMessage}
                                    onChange={(e) => setInitialMessage(e.target.value)}
                                    placeholder="Digite a mensagem de apresentação da equipe..."
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                                />
                            </div>

                            <p className="text-[11px] text-slate-400">
                                Ao enviar, a sala de chat será criada e você será redirecionado para a conversa.
                            </p>
                        </div>

                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setContactModalUser(null)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleStartChat}
                                disabled={sendingContact}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                            >
                                {sendingContact ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Send size={13} />
                                )}
                                <span>Iniciar Conversa</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AvatarImage({ prof }: { prof: ProfessionalActivationItem }) {
    const className = 'h-12 w-12 rounded-xl object-cover border border-slate-100 shadow-xs';

    if (prof.photoUrl) {
        return (
            <Image
                src={prof.photoUrl}
                alt={prof.name || prof.username || 'Profissional'}
                width={48}
                height={48}
                unoptimized
                className={className}
            />
        );
    }

    return (
        <div className={`${className} flex items-center justify-center bg-purple-50 text-xs font-bold text-purple-600 border border-purple-100`}>
            {prof.name ? prof.name.substring(0, 2).toUpperCase() : 'PR'}
        </div>
    );
}

