'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ExternalLink, MessageCircle, Search, UserCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';

type FilterStatus = 'all' | 'unviewed' | 'pending' | 'contacted' | 'my_assigned';

type ProfessionalActivationItem = {
    clerkId: string;
    username?: string;
    name?: string;
    photoUrl?: string;
    createdAt: string;
    isUnviewed?: boolean;
    activation?: {
        assignedTeamMemberId?: string | null;
        assignedTeamMemberName?: string | null;
        status?: 'pending' | 'contacted' | 'activated' | 'not_interested';
        contactedAt?: string | null;
    };
};

const FILTERS: Array<{ key: FilterStatus; label: string }> = [
    { key: 'all', label: 'Todas' },
    { key: 'unviewed', label: 'Novas' },
    { key: 'pending', label: 'Sem mensagem' },
    { key: 'contacted', label: 'Com mensagem' },
    { key: 'my_assigned', label: 'Minhas' },
];

export default function ActivationPage() {
    const router = useRouter();

    const [professionals, setProfessionals] = useState<ProfessionalActivationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
    const [unviewedCount, setUnviewedCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [showSearch, setShowSearch] = useState(false);

    const fetchActivationData = useCallback(async (query: string = '', filter: FilterStatus = 'all') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/team/activation/professionals?q=${encodeURIComponent(query)}&status=${filter}`);
            if (!res.ok) {
                toast.error('Erro ao carregar lista.');
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
            console.error('Erro ao carregar ativacao:', err);
            toast.error('Falha de conexao com o servidor.');
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
        return prof.name || prof.username || 'profissional';
    };

    const formatCreatedAt = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch {
            return 'Data indisponivel';
        }
    };

    const hasTeamContact = (prof: ProfessionalActivationItem) => {
        const status = prof.activation?.status;
        return status === 'contacted' || status === 'activated' || Boolean(prof.activation?.contactedAt);
    };

    return (
        <div className="flex-1 min-h-screen bg-slate-50 pb-24 md:pb-10 p-4 md:p-8">
            <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-black text-slate-900">Ativacao</h1>
                            <p className="text-xs font-medium text-slate-500">
                                {totalCount} profissionais por ordem de cadastro
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
                                {filter.key === 'all' ? ` (${totalCount})` : ''}
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
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
                        <span className="text-sm font-semibold text-slate-500">Carregando profissionais...</span>
                    </div>
                ) : professionals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-slate-200/80 bg-white p-6 py-16 text-center">
                        <UserCheck className="h-12 w-12 text-slate-300" />
                        <h3 className="text-base font-bold text-slate-800">Nenhuma profissional encontrada</h3>
                        <p className="max-w-md text-xs text-slate-400">Nao ha profissionais correspondentes ao filtro selecionado.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                        {professionals.map((prof) => {
                            const contacted = hasTeamContact(prof);

                            return (
                                <article
                                    key={prof.clerkId}
                                    className={`flex items-center gap-3 p-3.5 transition-colors hover:bg-slate-50 ${
                                        prof.isUnviewed ? 'bg-rose-50/40' : 'bg-white'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => prof.username && router.push(`/${prof.username}`)}
                                        className="relative shrink-0 cursor-pointer"
                                        title="Abrir perfil"
                                    >
                                        <AvatarImage prof={prof} />
                                        {prof.isUnviewed && (
                                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => prof.username && router.push(`/${prof.username}`)}
                                        className="min-w-0 flex-1 text-left cursor-pointer"
                                    >
                                        <h2 className="truncate text-sm font-black leading-tight text-slate-900">
                                            {getProfessionalDisplayName(prof)}
                                        </h2>
                                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                                            @{prof.username || 'sem-username'} - Cadastro em {formatCreatedAt(prof.createdAt)}
                                        </p>
                                    </button>

                                    <span className={`hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold sm:inline-flex ${
                                        contacted
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-500'
                                    }`}>
                                        <MessageCircle size={12} />
                                        {contacted ? 'Com mensagem' : 'Sem mensagem'}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => prof.username && router.push(`/${prof.username}`)}
                                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white hover:text-slate-800"
                                        title="Abrir perfil"
                                    >
                                        <ExternalLink size={15} />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function AvatarImage({ prof }: { prof: ProfessionalActivationItem }) {
    const className = 'h-12 w-12 rounded-lg object-cover border border-slate-100';

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
        <div className={`${className} flex items-center justify-center bg-slate-100 text-xs font-bold text-slate-500`}>
            {prof.name ? prof.name.substring(0, 2).toUpperCase() : 'PR'}
        </div>
    );
}
