'use client';

import { ExternalLink, Pause, Play, Plus, Save, Trash2, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    EmptyState,
    fieldClass,
    labelClass,
    LoadingState,
    PageIntro,
    Panel,
    primaryButtonClass,
    secondaryButtonClass,
    StatusBadge,
} from '@/components/marketing/MarketingUI';
import { marketingFetch } from '@/lib/marketing/client';

interface Seed {
    _id: string;
    platform: string;
    username: string;
    profileUrl: string;
    notes: string;
    status: 'active' | 'paused' | 'archived';
    lastUsedAt?: string;
}

export default function SeedsPage() {
    const [seeds, setSeeds] = useState<Seed[] | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ username: '', profileUrl: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        marketingFetch<{ seeds: Seed[] }>('/api/marketing/seeds')
            .then(data => setSeeds(data.seeds))
            .catch(error => toast.error(error.message));
    }, []);
    useEffect(load, [load]);

    async function create(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        try {
            await marketingFetch('/api/marketing/seeds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, platform: 'instagram' }),
            });
            setForm({ username: '', profileUrl: '', notes: '' });
            setShowForm(false);
            load();
            toast.success('Perfil-semente cadastrado.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar.');
        } finally {
            setSaving(false);
        }
    }

    async function update(seed: Seed, changes: Partial<Seed>) {
        try {
            const data = await marketingFetch<{ seed: Seed }>(`/api/marketing/seeds/${seed._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes),
            });
            setSeeds(current => current?.map(item => item._id === seed._id ? data.seed : item) || []);
            toast.success('Perfil atualizado.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao atualizar.');
        }
    }

    async function remove(seed: Seed) {
        if (!window.confirm(`Excluir @${seed.username}?`)) return;
        try {
            await marketingFetch(`/api/marketing/seeds/${seed._id}`, { method: 'DELETE' });
            setSeeds(current => current?.filter(item => item._id !== seed._id) || []);
            toast.success('Perfil removido.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao remover.');
        }
    }

    if (!seeds) return <LoadingState text="Carregando perfis-semente..." />;

    return (
        <div className="mx-auto max-w-7xl">
            <PageIntro
                title="Perfis-semente"
                description="Organize referências públicas usadas pelos providers. Nenhuma sessão, cookie ou token de Instagram é solicitado."
                action={<button className={primaryButtonClass} onClick={() => setShowForm(value => !value)}>{showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showForm ? 'Fechar' : 'Adicionar perfil'}</button>}
            />
            {showForm && (
                <Panel className="mb-5 p-5">
                    <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
                        <label><span className={labelClass}>Username</span><input required className={fieldClass} placeholder="@criadora" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /></label>
                        <label><span className={labelClass}>URL pública do perfil (opcional)</span><input className={fieldClass} placeholder="https://instagram.com/..." value={form.profileUrl} onChange={event => setForm({ ...form, profileUrl: event.target.value })} /></label>
                        <label className="md:col-span-2"><span className={labelClass}>Notas</span><textarea rows={3} className={fieldClass} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>
                        <div className="md:col-span-2 flex justify-end"><button disabled={saving} className={primaryButtonClass}><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Cadastrar perfil'}</button></div>
                    </form>
                </Panel>
            )}
            {seeds.length === 0 ? (
                <EmptyState title="Nenhum perfil-semente" description="Cadastre referências para usar no provider mock ou em integrações autorizadas futuras." />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {seeds.map(seed => (
                        <Panel key={seed._id} className="p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-lg font-black text-purple-700">@</div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-black">@{seed.username}</p>
                                    <p className="text-xs capitalize text-slate-500">{seed.platform}</p>
                                </div>
                                <StatusBadge tone={seed.status === 'active' ? 'green' : 'amber'}>{seed.status}</StatusBadge>
                            </div>
                            <textarea
                                className={`${fieldClass} mt-4 min-h-24`}
                                defaultValue={seed.notes}
                                onBlur={event => {
                                    if (event.target.value !== seed.notes) update(seed, { notes: event.target.value });
                                }}
                                placeholder="Notas internas..."
                            />
                            <p className="mt-3 text-xs text-slate-400">
                                {seed.lastUsedAt ? `Usado em ${new Date(seed.lastUsedAt).toLocaleString('pt-BR')}` : 'Ainda não utilizado'}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <a href={seed.profileUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}><ExternalLink className="h-4 w-4" />Abrir</a>
                                <button className={secondaryButtonClass} onClick={() => update(seed, { status: seed.status === 'active' ? 'paused' : 'active' })}>
                                    {seed.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{seed.status === 'active' ? 'Pausar' : 'Ativar'}
                                </button>
                                <button className={secondaryButtonClass} onClick={() => remove(seed)}><Trash2 className="h-4 w-4 text-rose-600" /></button>
                            </div>
                        </Panel>
                    ))}
                </div>
            )}
        </div>
    );
}
