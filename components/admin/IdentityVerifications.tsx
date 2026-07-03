'use client';

import { useAuth } from '@clerk/nextjs';
import {
    ChevronRight,
    ExternalLink,
    Loader2,
    MessageCircle,
    Search,
    UserRound,
    X,
    XCircle,
    Check,
    Undo2,
    ShieldCheck
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface UserVerificationData {
    _id: string;
    fullName: string;
    instagram: string;
    whatsapp: string;
    email: string;
    status: VerificationStatus;
    notes?: string;
    identityDocumentUrl?: string;
    identitySelfieUrl?: string;
    identityDocumentType?: string;
    createdAt: string;
    updatedAt: string;
}

const statusOptions: Array<{ value: VerificationStatus | ''; label: string }> = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'approved', label: 'Aprovados' },
    { value: 'rejected', label: 'Rejeitados' },
];

const statusLabels: Record<VerificationStatus, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
};

const statusClasses: Record<VerificationStatus, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function IdentityVerifications() {
    const { isLoaded, isSignedIn } = useAuth();
    const [applications, setApplications] = useState<UserVerificationData[]>([]);
    const [selected, setSelected] = useState<UserVerificationData | null>(null);
    const [status, setStatus] = useState<VerificationStatus | ''>('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const [authorized, setAuthorized] = useState(true);
    const [detailStatus, setDetailStatus] = useState<VerificationStatus>('pending');
    const [notes, setNotes] = useState('');

    const fetchVerifications = useCallback(async () => {
        if (!isSignedIn) return;
        setLoading(true);

        try {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            if (search.trim()) params.set('q', search.trim());

            const response = await fetch(`/api/backoffice/identity-verifications?${params.toString()}`);
            if (response.status === 401 || response.status === 403) {
                setAuthorized(false);
                return;
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao buscar verificações.');
            setApplications(data.applications || []);
            setAuthorized(true);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao buscar verificações.');
        } finally {
            setLoading(false);
        }
    }, [isSignedIn, search, status]);

    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
            setAuthorized(false);
            setLoading(false);
            return;
        }

        const timer = window.setTimeout(fetchVerifications, 250);
        return () => window.clearTimeout(timer);
    }, [fetchVerifications, isLoaded, isSignedIn]);

    async function openDetails(application: UserVerificationData) {
        setSelected(application);
        setDetailStatus(application.status);
        setLoadingDetails(true);

        try {
            const response = await fetch(`/api/backoffice/identity-verifications/${application._id}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao abrir detalhes.');
            setSelected(data.application);
            setDetailStatus(data.application.status);
            setNotes(data.application.notes || '');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao abrir detalhes.');
        } finally {
            setLoadingDetails(false);
        }
    }

    async function handleStatusChange(newStatus: VerificationStatus) {
        if (!selected) return;

        if (newStatus === 'approved') {
            const confirmed = window.confirm(`Deseja realmente aprovar a verificação de identidade de ${selected.fullName}? Esta ação concederá o selo de verificado no perfil.`);
            if (!confirmed) return;
        }

        setSaving(true);

        try {
            const response = await fetch(`/api/backoffice/identity-verifications/${selected._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, notes }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao atualizar status.');

            setSelected(data.application);
            setDetailStatus(data.application.status);
            setApplications(current => current.map(item => (
                item._id === data.application._id ? data.application : item
            )));
            toast.success(`Verificação ${statusLabels[newStatus].toLowerCase()} com sucesso!`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status.');
        } finally {
            setSaving(false);
        }
    }

    if (!isLoaded || (loading && !isSignedIn)) {
        return (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!authorized || !isSignedIn) {
        return (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-rose-600">Você precisa entrar com uma conta administradora para acessar esta área.</p>
            </div>
        );
    }

    return (
        <>
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Verificações de Selos</h2>
                        <p className="mt-1 text-xs text-slate-500">
                            {applications.length} {applications.length === 1 ? 'solicitação encontrada' : 'solicitações encontradas'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <label className="relative min-w-0 sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Nome, Username ou E-mail"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                            />
                        </label>
                        <select
                            value={status}
                            onChange={event => setStatus(event.target.value as VerificationStatus | '')}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-purple-400"
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
                </div>
            ) : applications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                    <UserRound className="mx-auto h-10 w-10 text-slate-300" />
                    <h3 className="mt-4 font-bold text-slate-700">Nenhuma solicitação encontrada</h3>
                    <p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou aguarde novas solicitações.</p>
                </div>
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-5 py-4">Perfil</th>
                                    <th className="px-5 py-4">E-mail</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4">Última atualização</th>
                                    <th className="w-12 px-4 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {applications.map(application => (
                                    <tr
                                        key={application._id}
                                        onClick={() => openDetails(application)}
                                        className="cursor-pointer transition hover:bg-purple-50/40"
                                    >
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-slate-800">{application.fullName}</p>
                                            <p className="mt-0.5 text-xs text-purple-600">@{application.instagram}</p>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{application.email}</td>
                                        <td className="px-5 py-4"><StatusBadge status={application.status} /></td>
                                        <td className="px-5 py-4 text-xs text-slate-500">{formatDate(application.updatedAt)}</td>
                                        <td className="px-4 py-4"><ChevronRight className="h-4 w-4 text-slate-400" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3 md:hidden">
                        {applications.map(application => (
                            <button
                                key={application._id}
                                type="button"
                                onClick={() => openDetails(application)}
                                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-900">{application.fullName}</p>
                                        <p className="mt-1 truncate text-xs font-semibold text-purple-600">@{application.instagram}</p>
                                    </div>
                                    <StatusBadge status={application.status} />
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                    <span className="truncate">{application.email}</span>
                                    <span className="text-right">{formatDate(application.updatedAt)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {selected && (
                <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/60 backdrop-blur-sm" onMouseDown={() => setSelected(null)}>
                    <aside
                        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
                        onMouseDown={event => event.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Detalhes da Verificação</p>
                                <h2 className="mt-1 text-lg font-black text-slate-900">{selected.fullName}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                                aria-label="Fechar detalhes"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="flex min-h-96 items-center justify-center">
                                <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
                            </div>
                        ) : (
                            <div className="space-y-6 p-5 sm:p-7">
                                <section className="rounded-2xl border border-slate-200 p-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados do Usuário</h3>
                                    <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                                        <Detail label="Nome de exibição" value={selected.fullName} />
                                        <Detail label="Username" value={`@${selected.instagram}`} />
                                        <Detail label="E-mail" value={selected.email || 'Não informado'} />
                                        <Detail label="Telefone" value={selected.whatsapp || 'Não informado'} />
                                        <Detail label="Enviado em" value={formatDateTime(selected.createdAt)} wide />
                                    </div>
                                </section>

                                {selected.identityDocumentUrl && (
                                    <section className="rounded-2xl border border-slate-200 p-5">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Documentos de Identidade</h3>
                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de Documento</dt>
                                                <dd className="mt-1 text-sm font-semibold text-slate-700 uppercase">{selected.identityDocumentType || 'Não informado'}</dd>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Foto do Documento</p>
                                                    <a 
                                                        href={selected.identityDocumentUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="block group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 hover:border-purple-300 transition-all bg-slate-50"
                                                    >
                                                        <img 
                                                            src={selected.identityDocumentUrl} 
                                                            alt="Foto do documento" 
                                                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200" 
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                                            <ExternalLink className="w-4 h-4" />
                                                            Ampliar Documento
                                                        </div>
                                                    </a>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Selfie com Documento</p>
                                                    <a 
                                                        href={selected.identitySelfieUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="block group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 hover:border-purple-300 transition-all bg-slate-50"
                                                    >
                                                        <img 
                                                            src={selected.identitySelfieUrl} 
                                                            alt="Selfie" 
                                                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200" 
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                                            <ExternalLink className="w-4 h-4" />
                                                            Ampliar Selfie
                                                        </div>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                <section className="rounded-2xl border border-slate-200 p-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Avaliação do Selo</h3>
                                    
                                    <div className="mt-4 mb-4">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                            Observações / Motivo de Recusa (Enviado por e-mail se recusado)
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Ex: Selfie muito borrada. O documento deve estar nítido ao lado do rosto."
                                            className="w-full h-20 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none font-medium text-slate-700"
                                        />
                                    </div>
                                    
                                    {detailStatus === 'pending' ? (
                                        <div className="mt-4 flex flex-col gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange('approved')}
                                                disabled={saving}
                                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-extrabold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer"
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                                Aprovar Selo de Verificado
                                            </button>
                                            
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange('rejected')}
                                                disabled={saving}
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl transition duration-150 disabled:opacity-60 cursor-pointer"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Rejeitar Verificação
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-4 space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Decisão Tomada</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <StatusBadge status={detailStatus} />
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange('pending')}
                                                    disabled={saving}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition duration-150 disabled:opacity-60 cursor-pointer"
                                                >
                                                    <Undo2 className="h-3.5 w-3.5" />
                                                    Reanalisar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </>
    );
}

function StatusBadge({ status }: { status: VerificationStatus }) {
    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClasses[status]}`}>
            {statusLabels[status]}
        </span>
    );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
    return (
        <div className={wide ? 'sm:col-span-2' : ''}>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700">{value}</dd>
        </div>
    );
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString('pt-BR');
}
