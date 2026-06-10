'use client';

import { ExternalLink, Save, Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    EmptyState,
    fieldClass,
    labelClass,
    LoadingState,
    PageIntro,
    Panel,
    primaryButtonClass,
    StatusBadge,
} from '@/components/marketing/MarketingUI';
import { marketingFetch } from '@/lib/marketing/client';

type ApplicationStatus = 'pending' | 'contacted' | 'approved' | 'rejected';
interface Application {
    _id: string;
    fullName: string;
    artisticName?: string;
    instagram: string;
    whatsapp: string;
    email?: string;
    age: number;
    cityState: string;
    hasOnlineExperience: 'yes' | 'no' | 'starting';
    howFoundMimo: string;
    reason: string;
    status: ApplicationStatus;
    notes?: string;
    createdAt: string;
}

const statuses: Array<{ value: ApplicationStatus | ''; label: string }> = [
    { value: '', label: 'Todas' },
    { value: 'pending', label: 'Pendente' },
    { value: 'contacted', label: 'Contatada' },
    { value: 'approved', label: 'Aprovada' },
    { value: 'rejected', label: 'Rejeitada' },
];

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<Application[] | null>(null);
    const [selected, setSelected] = useState<Application | null>(null);
    const [status, setStatus] = useState<ApplicationStatus | ''>('');
    const [search, setSearch] = useState('');
    const [detailStatus, setDetailStatus] = useState<ApplicationStatus>('pending');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            if (search.trim()) params.set('q', search.trim());
            const data = await marketingFetch<{ applications: Application[] }>(`/api/marketing/applications?${params}`);
            setApplications(data.applications);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao buscar inscrições.');
        }
    }, [search, status]);
    useEffect(() => {
        const timer = window.setTimeout(load, 250);
        return () => window.clearTimeout(timer);
    }, [load]);

    function open(application: Application) {
        setSelected(application);
        setDetailStatus(application.status);
        setNotes(application.notes || '');
    }

    async function save() {
        if (!selected) return;
        setSaving(true);
        try {
            const data = await marketingFetch<{ application: Application }>(`/api/marketing/applications/${selected._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: detailStatus, notes }),
            });
            setSelected(data.application);
            setApplications(current => current?.map(item => item._id === data.application._id ? data.application : item) || []);
            toast.success('Inscrição atualizada.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    if (!applications) return <LoadingState text="Carregando inscrições..." />;

    return (
        <div className="mx-auto max-w-7xl">
            <PageIntro
                title="Inscrições orgânicas"
                description="Candidaturas recebidas pela página /creators. Elas permanecem separadas das leads prospectadas."
            />
            <Panel className="mb-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className={`${fieldClass} pl-9`} placeholder="Nome ou Instagram" value={search} onChange={event => setSearch(event.target.value)} />
                    </label>
                    <select className={`${fieldClass} sm:w-48`} value={status} onChange={event => setStatus(event.target.value as ApplicationStatus | '')}>{statuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                </div>
            </Panel>
            {applications.length === 0 ? (
                <EmptyState title="Nenhuma inscrição encontrada" description="Ajuste os filtros ou aguarde novas candidaturas pela página /creators." />
            ) : (
                <Panel className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                                <tr><th className="px-5 py-4">Candidata</th><th className="px-5 py-4">Instagram</th><th className="px-5 py-4">Cidade</th><th className="px-5 py-4">Idade</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Data</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {applications.map(application => (
                                    <tr key={application._id} onClick={() => open(application)} className="cursor-pointer hover:bg-purple-50/50">
                                        <td className="px-5 py-4"><p className="font-black">{application.artisticName || application.fullName}</p><p className="text-xs text-slate-500">{application.fullName}</p></td>
                                        <td className="px-5 py-4">@{application.instagram}</td>
                                        <td className="px-5 py-4">{application.cityState}</td>
                                        <td className="px-5 py-4">{application.age}</td>
                                        <td className="px-5 py-4"><StatusBadge tone={application.status === 'approved' ? 'green' : application.status === 'rejected' ? 'red' : application.status === 'contacted' ? 'blue' : 'amber'}>{statuses.find(item => item.value === application.status)?.label}</StatusBadge></td>
                                        <td className="px-5 py-4 text-xs text-slate-500">{new Date(application.createdAt).toLocaleDateString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}

            {selected && (
                <>
                    <button className="fixed inset-0 z-40 bg-slate-950/40" onClick={() => setSelected(null)} aria-label="Fechar detalhes" />
                    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
                        <div className="sticky top-0 flex items-center border-b border-slate-200 bg-white px-5 py-4">
                            <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase text-purple-600">Inscrição orgânica</p><h2 className="truncate text-xl font-black">{selected.artisticName || selected.fullName}</h2></div>
                            <button className="rounded-xl bg-slate-100 p-2" onClick={() => setSelected(null)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-5 p-5">
                            <Panel className="p-4 text-sm leading-7">
                                <p><strong>Nome:</strong> {selected.fullName}</p>
                                <p><strong>Instagram:</strong> @{selected.instagram}</p>
                                <p><strong>WhatsApp:</strong> {selected.whatsapp}</p>
                                <p><strong>E-mail:</strong> {selected.email || 'Não informado'}</p>
                                <p><strong>Local:</strong> {selected.cityState}</p>
                                <p><strong>Experiência online:</strong> {selected.hasOnlineExperience}</p>
                                <a href={`https://instagram.com/${selected.instagram}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 font-bold text-purple-700"><ExternalLink className="h-4 w-4" />Abrir Instagram</a>
                            </Panel>
                            <Panel className="p-4"><p className="text-xs font-bold uppercase text-slate-400">Por que quer entrar</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.reason}</p></Panel>
                            <Panel className="p-4"><p className="text-xs font-bold uppercase text-slate-400">Como conheceu o Mimo</p><p className="mt-2 text-sm">{selected.howFoundMimo}</p></Panel>
                            <label><span className={labelClass}>Status</span><select className={fieldClass} value={detailStatus} onChange={event => setDetailStatus(event.target.value as ApplicationStatus)}>{statuses.filter(item => item.value).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                            <label><span className={labelClass}>Notas internas</span><textarea rows={5} className={fieldClass} value={notes} onChange={event => setNotes(event.target.value)} /></label>
                            <button disabled={saving} onClick={save} className={`${primaryButtonClass} w-full`}><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar inscrição'}</button>
                        </div>
                    </aside>
                </>
            )}
        </div>
    );
}
