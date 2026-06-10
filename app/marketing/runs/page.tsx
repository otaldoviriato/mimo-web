'use client';

import { Ban, ChevronDown, ChevronUp, FileUp, Play, RefreshCw } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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

interface Campaign { _id: string; name: string; status: string }
interface Seed { _id: string; username: string; status: string }
interface Settings { providerType: 'manual' | 'mock' | 'import' | 'external'; maxLeadsPerRun: number; maxSeedsPerRun: number }
interface Run {
    _id: string;
    campaignId?: { _id: string; name: string };
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    maxLeads: number;
    seedsUsed: string[];
    leadsFound: number;
    logs: string[];
    errorMessage?: string;
    createdAt: string;
}

function parseCsv(text: string) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const parseLine = (line: string) => {
        const values: string[] = [];
        let value = '';
        let quoted = false;
        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            if (char === '"' && line[index + 1] === '"') {
                value += '"';
                index += 1;
            } else if (char === '"') {
                quoted = !quoted;
            } else if (char === ',' && !quoted) {
                values.push(value.trim());
                value = '';
            } else {
                value += char;
            }
        }
        values.push(value.trim());
        return values;
    };
    const headers = parseLine(lines[0]).map(header => header.trim());
    return lines.slice(1).map(line => {
        const values = parseLine(line);
        return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
    });
}

function parseCandidates(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : Array.isArray(parsed.candidates) ? parsed.candidates : [parsed];
    }
    return parseCsv(trimmed);
}

const runTone = (status: Run['status']) => {
    if (status === 'completed') return 'green' as const;
    if (status === 'failed' || status === 'cancelled') return 'red' as const;
    if (status === 'running') return 'purple' as const;
    return 'amber' as const;
};

export default function RunsPage() {
    const [runs, setRuns] = useState<Run[] | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [seeds, setSeeds] = useState<Seed[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [campaignId, setCampaignId] = useState('');
    const [seedIds, setSeedIds] = useState<string[]>([]);
    const [maxLeads, setMaxLeads] = useState(20);
    const [candidateText, setCandidateText] = useState('');
    const [starting, setStarting] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async (quiet = false) => {
        try {
            const [runsData, campaignsData, seedsData, settingsData] = await Promise.all([
                marketingFetch<{ runs: Run[] }>('/api/marketing/runs'),
                marketingFetch<{ campaigns: Campaign[] }>('/api/marketing/campaigns'),
                marketingFetch<{ seeds: Seed[] }>('/api/marketing/seeds'),
                marketingFetch<{ settings: Settings }>('/api/marketing/settings'),
            ]);
            setRuns(runsData.runs);
            setCampaigns(campaignsData.campaigns.filter(item => item.status === 'active'));
            setSeeds(seedsData.seeds.filter(item => item.status === 'active'));
            setSettings(settingsData.settings);
            setMaxLeads(current => current === 20 ? settingsData.settings.maxLeadsPerRun : current);
        } catch (error) {
            if (!quiet) toast.error(error instanceof Error ? error.message : 'Erro ao carregar rodadas.');
        }
    }, []);

    useEffect(() => {
        load();
        const timer = window.setInterval(() => load(true), 5000);
        return () => window.clearInterval(timer);
    }, [load]);

    const parsedCount = useMemo(() => {
        try { return parseCandidates(candidateText).length; } catch { return 0; }
    }, [candidateText]);

    async function start(event: FormEvent) {
        event.preventDefault();
        if (!settings) return;
        let candidates: unknown[] = [];
        if (settings.providerType === 'manual' || settings.providerType === 'import') {
            try {
                candidates = parseCandidates(candidateText);
            } catch {
                toast.error('O conteúdo não é um JSON ou CSV válido.');
                return;
            }
        }
        setStarting(true);
        try {
            await marketingFetch('/api/marketing/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId, seedIds, maxLeads, candidates }),
            });
            setCandidateText('');
            setSeedIds([]);
            toast.success('Rodada criada. O processamento começou em segundo plano.');
            load(true);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao iniciar rodada.');
        } finally {
            setStarting(false);
        }
    }

    async function cancel(id: string) {
        try {
            await marketingFetch(`/api/marketing/runs/${id}/cancel`, { method: 'POST' });
            toast.success('Cancelamento solicitado.');
            load(true);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao cancelar.');
        }
    }

    async function readFile(file?: File) {
        if (!file) return;
        if (file.size > 2_000_000) {
            toast.error('Use um arquivo de até 2 MB.');
            return;
        }
        setCandidateText(await file.text());
    }

    if (!runs || !settings) return <LoadingState text="Carregando rodadas..." />;

    return (
        <div className="mx-auto max-w-7xl">
            <PageIntro
                title="Rodadas de prospecção"
                description="Inicie e acompanhe a coleta autorizada, priorização, qualificação e geração de mensagens sugeridas."
                action={<button className={secondaryButtonClass} onClick={() => load()}><RefreshCw className="h-4 w-4" />Atualizar</button>}
            />
            <Panel className="mb-5 p-5 md:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="font-black">Começar rodada</h3>
                        <p className="mt-1 text-xs text-slate-500">Provider atual: <strong className="text-purple-700">{settings.providerType}</strong></p>
                    </div>
                    {settings.providerType === 'external' && <StatusBadge tone="amber">Integração ainda não configurada</StatusBadge>}
                </div>
                <form onSubmit={start}>
                    <div className="grid gap-4 md:grid-cols-3">
                        <label>
                            <span className={labelClass}>Campanha</span>
                            <select required className={fieldClass} value={campaignId} onChange={event => setCampaignId(event.target.value)}>
                                <option value="">Selecione...</option>
                                {campaigns.map(campaign => <option key={campaign._id} value={campaign._id}>{campaign.name}</option>)}
                            </select>
                        </label>
                        <label>
                            <span className={labelClass}>Limite de leads</span>
                            <input type="number" min={1} max={settings.maxLeadsPerRun} className={fieldClass} value={maxLeads} onChange={event => setMaxLeads(Number(event.target.value))} />
                        </label>
                        <div>
                            <span className={labelClass}>Perfis-semente ({seedIds.length}/{settings.maxSeedsPerRun})</span>
                            <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                                {seeds.length === 0 ? <p className="p-2 text-xs text-slate-400">Nenhum seed ativo.</p> : seeds.map(seed => (
                                    <label key={seed._id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-purple-50">
                                        <input
                                            type="checkbox"
                                            checked={seedIds.includes(seed._id)}
                                            disabled={!seedIds.includes(seed._id) && seedIds.length >= settings.maxSeedsPerRun}
                                            onChange={event => setSeedIds(current => event.target.checked ? [...current, seed._id] : current.filter(id => id !== seed._id))}
                                        />
                                        @{seed.username}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {(settings.providerType === 'manual' || settings.providerType === 'import') && (
                        <div className="mt-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={labelClass}>Candidatos em JSON ou CSV</span>
                                <label className={secondaryButtonClass}>
                                    <FileUp className="h-4 w-4" />Importar arquivo
                                    <input type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={event => readFile(event.target.files?.[0])} />
                                </label>
                            </div>
                            <textarea
                                rows={9}
                                className={`${fieldClass} font-mono text-xs`}
                                value={candidateText}
                                onChange={event => setCandidateText(event.target.value)}
                                placeholder={'username,displayName,bio,followersCount,externalLink,sourceContext\ncriadora_exemplo,Ana,Conteúdo de beleza,12500,https://...,Comentou no perfil semente'}
                            />
                            <p className="mt-2 text-xs text-slate-500">{parsedCount} candidato(s) reconhecido(s). Campos aceitos: username, bio, followersCount, link, contexto e comments.</p>
                        </div>
                    )}
                    <div className="mt-5 flex justify-end">
                        <button disabled={starting || settings.providerType === 'external'} className={primaryButtonClass}>
                            <Play className="h-4 w-4" />{starting ? 'Criando rodada...' : 'Começar rodada'}
                        </button>
                    </div>
                </form>
            </Panel>

            {runs.length === 0 ? (
                <EmptyState title="Nenhuma rodada" description="Configure a OpenAI, crie uma campanha e inicie a primeira rodada." />
            ) : (
                <div className="space-y-3">
                    {runs.map(run => {
                        const isExpanded = expanded === run._id;
                        return (
                            <Panel key={run._id}>
                                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-black">{run.campaignId?.name || 'Campanha indisponível'}</h3>
                                            <StatusBadge tone={runTone(run.status)}>{run.status}</StatusBadge>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {new Date(run.createdAt).toLocaleString('pt-BR')} · {run.leadsFound}/{run.maxLeads} leads · {run.seedsUsed.length} seeds
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {(run.status === 'queued' || run.status === 'running') && (
                                            <button className={secondaryButtonClass} onClick={() => cancel(run._id)}><Ban className="h-4 w-4" />Cancelar</button>
                                        )}
                                        <button className={secondaryButtonClass} onClick={() => setExpanded(isExpanded ? null : run._id)}>
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}Logs
                                        </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-950 px-5 py-4 font-mono text-xs leading-6 text-slate-300">
                                        {run.logs.length ? run.logs.map((log, index) => <p key={`${log}-${index}`}>{log}</p>) : <p>Sem logs.</p>}
                                        {run.errorMessage && <p className="mt-2 text-rose-300">Erro: {run.errorMessage}</p>}
                                    </div>
                                )}
                            </Panel>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
