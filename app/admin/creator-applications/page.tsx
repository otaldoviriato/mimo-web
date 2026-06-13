'use client';

import { useAuth } from '@clerk/nextjs';
import {
    ChevronRight,
    ExternalLink,
    Loader2,
    MessageCircle,
    Save,
    Search,
    UserRound,
    X,
    CheckCircle2,
    XCircle,
    Archive,
    Sparkles,
    Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { InstagramIcon } from '@/components/InstagramIcon';
import { Sidebar } from '@/components/admin/Sidebar';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'archived';
type OnlineExperience = 'yes' | 'no' | 'starting';

interface CreatorApplicationData {
    _id: string;
    fullName: string;
    artisticName?: string;
    instagram: string;
    whatsapp: string;
    email?: string;
    age: number;
    cityState?: string;
    hasOnlineExperience?: OnlineExperience;
    howFoundMimo: string;
    reason: string;
    isAdultConfirmed: boolean;
    contactConsent: boolean;
    status: ApplicationStatus;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

const statusOptions: Array<{ value: ApplicationStatus | ''; label: string }> = [
    { value: '', label: 'Todas' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'approved', label: 'Aprovadas' },
    { value: 'rejected', label: 'Rejeitadas' },
    { value: 'archived', label: 'Arquivadas' },
];

const statusLabels: Record<ApplicationStatus, string> = {
    pending: 'Pendente',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
    archived: 'Arquivada',
};

const statusClasses: Record<ApplicationStatus, string> = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
    archived: 'border-slate-200 bg-slate-100 text-slate-700',
};

const experienceLabels: Record<OnlineExperience, string> = {
    yes: 'Sim',
    no: 'Não',
    starting: 'Está começando',
};

export default function CreatorApplicationsAdminPage() {
    const { isLoaded, isSignedIn } = useAuth();
    const [applications, setApplications] = useState<CreatorApplicationData[]>([]);
    const [selected, setSelected] = useState<CreatorApplicationData | null>(null);
    const [status, setStatus] = useState<ApplicationStatus | ''>('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);
    const [authorized, setAuthorized] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [detailStatus, setDetailStatus] = useState<ApplicationStatus>('pending');
    const [deleting, setDeleting] = useState(false);

    const fetchApplications = useCallback(async () => {
        if (!isSignedIn) return;
        setLoading(true);

        try {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            if (search.trim()) params.set('q', search.trim());

            const response = await fetch(`/api/backoffice/creator-applications?${params.toString()}`);
            if (response.status === 401 || response.status === 403) {
                setAuthorized(false);
                return;
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao buscar inscrições.');
            setApplications(data.applications || []);
            setAuthorized(true);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao buscar inscrições.');
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

        const timer = window.setTimeout(fetchApplications, 250);
        return () => window.clearTimeout(timer);
    }, [fetchApplications, isLoaded, isSignedIn]);

    async function openDetails(application: CreatorApplicationData) {
        setSelected(application);
        setNotes(application.notes || '');
        setDetailStatus(application.status);
        setLoadingDetails(true);

        try {
            const response = await fetch(`/api/backoffice/creator-applications/${application._id}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao abrir inscrição.');
            setSelected(data.application);
            setNotes(data.application.notes || '');
            setDetailStatus(data.application.status);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao abrir inscrição.');
        } finally {
            setLoadingDetails(false);
        }
    }

    async function saveDetails() {
        if (!selected) return;
        setSaving(true);

        try {
            const response = await fetch(`/api/backoffice/creator-applications/${selected._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: detailStatus, notes }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao salvar alterações.');

            setSelected(data.application);
            setApplications(current => current.map(item => (
                item._id === data.application._id ? data.application : item
            )));
            toast.success('Observações salvas.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao salvar alterações.');
        } finally {
            setSaving(false);
        }
    }

    async function handleQuickStatusChange(newStatus: ApplicationStatus) {
        if (!selected) return;
        setSaving(true);

        try {
            const response = await fetch(`/api/backoffice/creator-applications/${selected._id}`, {
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
            toast.success(`Inscrição ${statusLabels[newStatus].toLowerCase()} com sucesso!`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!selected) return;
        if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente a inscrição e a conta Clerk da criadora "${selected.fullName}"? Esta ação deleta o registro no MongoDB e a conta do Clerk, permitindo que ela faça uma nova inscrição do zero.`)) {
            return;
        }
        setDeleting(true);

        try {
            const response = await fetch(`/api/backoffice/creator-applications/${selected._id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao excluir inscrição.');

            setApplications(current => current.filter(item => item._id !== selected._id));
            setSelected(null);
            toast.success('Inscrição e conta Clerk excluídas com sucesso.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao excluir inscrição.');
        } finally {
            setDeleting(false);
        }
    }

    if (!isLoaded || loading && !isSignedIn) {
        return <CenteredState icon={<Loader2 className="h-8 w-8 animate-spin text-purple-600" />} text="Carregando backoffice..." />;
    }

    if (!authorized || !isSignedIn) {
        return (
            <CenteredState
                icon={<UserRound className="h-9 w-9 text-rose-600" />}
                text="Você precisa entrar com uma conta administradora para acessar esta área."
            />
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar
                activeTab="creator-applications"
                setActiveTab={(tab) => {
                    window.location.href = `/admin?tab=${tab}`;
                }}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="min-w-0 flex-1">
                <DashboardHeader
                    title="Inscrições de Criadoras"
                    onMenuToggle={() => setSidebarOpen(true)}
                />

                <main className="p-4 md:p-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Candidaturas recebidas</h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {applications.length} {applications.length === 1 ? 'inscrição encontrada' : 'inscrições encontradas'}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <label className="relative min-w-0 sm:w-72">
                                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={search}
                                            onChange={event => setSearch(event.target.value)}
                                            placeholder="Nome, Instagram ou WhatsApp"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                                        />
                                    </label>
                                    <select
                                        value={status}
                                        onChange={event => setStatus(event.target.value as ApplicationStatus | '')}
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
                                <h3 className="mt-4 font-bold text-slate-700">Nenhuma inscrição encontrada</h3>
                                <p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou aguarde novas candidaturas.</p>
                            </div>
                        ) : (
                            <>
                                <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            <tr>
                                                <th className="px-5 py-4">Criadora</th>
                                                <th className="px-5 py-4">Contato</th>
                                                <th className="px-5 py-4">E-mail</th>
                                                <th className="px-5 py-4">Status</th>
                                                <th className="px-5 py-4">Enviada em</th>
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
                                                    <td className="px-5 py-4 text-xs font-medium text-slate-600">{formatWhatsapp(application.whatsapp)}</td>
                                                    <td className="px-5 py-4 text-xs font-semibold text-slate-600">{application.email}</td>
                                                    <td className="px-5 py-4"><StatusBadge status={application.status} /></td>
                                                    <td className="px-5 py-4 text-xs text-slate-500">{formatDate(application.createdAt)}</td>
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
                                                <span className="text-right">{formatDate(application.createdAt)}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>

            {selected && (
                <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/60 backdrop-blur-sm" onMouseDown={() => setSelected(null)}>
                    <aside
                        className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"
                        onMouseDown={event => event.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Detalhes da inscrição</p>
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
                                {selected.whatsapp && selected.whatsapp !== 'Não informado' && (
                                    <div className="grid gap-3 sm:grid-cols-1">
                                        <ContactLink
                                            href={`https://wa.me/${whatsappForLink(selected.whatsapp)}`}
                                            icon={<MessageCircle className="h-5 w-5" />}
                                            label="Conversar no WhatsApp"
                                            value={formatWhatsapp(selected.whatsapp)}
                                            tone="green"
                                        />
                                    </div>
                                )}

                                <section className="rounded-2xl border border-slate-200 p-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados de Cadastro</h3>
                                    <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                                        <Detail label="Nome de exibição" value={selected.fullName} />
                                        <Detail label="Username" value={`@${selected.instagram}`} />
                                        <Detail label="E-mail" value={selected.email || 'Não informado'} />
                                        <Detail label="Telefone" value={selected.whatsapp || 'Não informado'} />
                                        <Detail label="Data de Cadastro" value={formatDateTime(selected.createdAt)} wide />
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-slate-200 p-5">
                                    <label className="block text-sm font-bold text-slate-800">
                                        Notas internas
                                        <textarea
                                            rows={4}
                                            value={notes}
                                            onChange={event => setNotes(event.target.value)}
                                            placeholder="Registre observações para a equipe..."
                                            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={saveDetails}
                                        disabled={saving}
                                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition disabled:opacity-60 cursor-pointer"
                                    >
                                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                        Salvar observações
                                    </button>
                                </section>

                                <section className="rounded-2xl border border-slate-200 p-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Avaliação do Perfil</h3>
                                    
                                    {detailStatus === 'pending' ? (
                                        <div className="mt-4 flex flex-col gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleQuickStatusChange('approved')}
                                                disabled={saving}
                                                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 cursor-pointer"
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                Aprovar Criadora
                                            </button>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickStatusChange('rejected')}
                                                    disabled={saving}
                                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl transition duration-150 disabled:opacity-60 cursor-pointer"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    Rejeitar
                                                </button>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickStatusChange('archived')}
                                                    disabled={saving}
                                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl transition duration-150 disabled:opacity-60 cursor-pointer"
                                                >
                                                    <Archive className="h-4 w-4" />
                                                    Arquivar
                                                </button>
                                            </div>
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
                                                    onClick={() => handleQuickStatusChange('pending')}
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

                                <section className="rounded-2xl border border-rose-200 bg-rose-50/20 p-5">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600">Zona de Perigo</h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Excluir permanentemente o registro e a conta do Clerk. A criadora poderá realizar uma nova inscrição do zero se desejar.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 transition disabled:opacity-60 cursor-pointer"
                                    >
                                        {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Excluir Inscrição permanentemente
                                    </button>
                                </section>
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClasses[status]}`}>
            {statusLabels[status]}
        </span>
    );
}

function ContactLink({
    href,
    icon,
    label,
    value,
    tone,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: 'purple' | 'green';
}) {
    const colors = tone === 'purple'
        ? 'border-purple-200 bg-purple-50 text-purple-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700';

    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${colors}`}>
            <div className="flex items-center justify-between">
                {icon}
                <ExternalLink className="h-4 w-4 opacity-60" />
            </div>
            <p className="mt-3 text-xs font-bold">{label}</p>
            <p className="mt-1 truncate text-sm font-black">{value}</p>
        </a>
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

function CenteredState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">{icon}</div>
                <p className="mt-5 text-sm font-semibold leading-relaxed text-slate-600">{text}</p>
                <Link href="/login" className="mt-5 inline-flex rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white">
                    Ir para o login
                </Link>
            </div>
        </div>
    );
}

function whatsappForLink(value: string) {
    const digits = value.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
}

function formatWhatsapp(value: string) {
    const digits = value.replace(/\D/g, '');
    const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
    if (local.length === 11) {
        return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    return value;
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString('pt-BR');
}
