'use client';

import { Eye, EyeOff, KeyRound, Save, TestTube2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    fieldClass,
    labelClass,
    LoadingState,
    PageIntro,
    Panel,
    primaryButtonClass,
    secondaryButtonClass,
} from '@/components/marketing/MarketingUI';
import { marketingFetch } from '@/lib/marketing/client';

interface Settings {
    openAiApiKeyMasked: string;
    hasOpenAiApiKey: boolean;
    openAiModel: string;
    maxLeadsPerRun: number;
    maxSeedsPerRun: number;
    minScoreToHighlight: number;
    minDelaySeconds: number;
    maxDelaySeconds: number;
    providerType: 'manual' | 'mock' | 'import' | 'external';
}

export default function MarketingSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        marketingFetch<{ settings: Settings }>('/api/marketing/settings')
            .then(data => setSettings(data.settings))
            .catch(error => toast.error(error.message));
    }, []);

    async function save(event: FormEvent) {
        event.preventDefault();
        if (!settings) return;
        setSaving(true);
        try {
            const data = await marketingFetch<{ settings: Settings }>('/api/marketing/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...settings, openAiApiKey: apiKey || undefined }),
            });
            setSettings(data.settings);
            setApiKey('');
            toast.success('Configurações salvas.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    async function testOpenAi() {
        if (!settings) return;
        setTesting(true);
        try {
            const data = await marketingFetch<{ message: string }>('/api/marketing/settings/test-openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ openAiApiKey: apiKey || undefined, openAiModel: settings.openAiModel }),
            });
            toast.success(data.message || 'Conexão validada.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Falha no teste.');
        } finally {
            setTesting(false);
        }
    }

    if (!settings) return <LoadingState text="Carregando configurações..." />;

    return (
        <div className="mx-auto max-w-5xl">
            <PageIntro
                title="Configurações do growth"
                description="Defina o provider, os limites operacionais e a conexão usada exclusivamente pelo backend."
            />
            <form onSubmit={save} className="space-y-5">
                <Panel className="p-5 md:p-6">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-xl bg-purple-100 p-2.5 text-purple-700"><KeyRound className="h-5 w-5" /></div>
                        <div><h3 className="font-black">OpenAI</h3><p className="text-xs text-slate-500">A chave é criptografada e nunca retorna completa.</p></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label>
                            <span className={labelClass}>OpenAI API Key</span>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={event => setApiKey(event.target.value)}
                                    placeholder={settings.openAiApiKeyMasked || 'sk-...'}
                                    autoComplete="new-password"
                                    className={`${fieldClass} pr-11`}
                                />
                                <button type="button" onClick={() => setShowKey(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </label>
                        <label>
                            <span className={labelClass}>Modelo</span>
                            <input className={fieldClass} value={settings.openAiModel} onChange={event => setSettings({ ...settings, openAiModel: event.target.value })} />
                        </label>
                    </div>
                    <button type="button" onClick={testOpenAi} disabled={testing || (!apiKey && !settings.hasOpenAiApiKey)} className={`${secondaryButtonClass} mt-4`}>
                        <TestTube2 className="h-4 w-4" /> {testing ? 'Testando...' : 'Testar OpenAI'}
                    </button>
                </Panel>

                <Panel className="p-5 md:p-6">
                    <h3 className="font-black">Operação das rodadas</h3>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <NumberField label="Leads por rodada" value={settings.maxLeadsPerRun} min={1} max={200} onChange={maxLeadsPerRun => setSettings({ ...settings, maxLeadsPerRun })} />
                        <NumberField label="Seeds por rodada" value={settings.maxSeedsPerRun} min={1} max={50} onChange={maxSeedsPerRun => setSettings({ ...settings, maxSeedsPerRun })} />
                        <NumberField label="Score mínimo de destaque" value={settings.minScoreToHighlight} min={0} max={100} onChange={minScoreToHighlight => setSettings({ ...settings, minScoreToHighlight })} />
                        <NumberField label="Delay mínimo (segundos)" value={settings.minDelaySeconds} min={0} max={300} onChange={minDelaySeconds => setSettings({ ...settings, minDelaySeconds })} />
                        <NumberField label="Delay máximo (segundos)" value={settings.maxDelaySeconds} min={0} max={600} onChange={maxDelaySeconds => setSettings({ ...settings, maxDelaySeconds })} />
                        <label>
                            <span className={labelClass}>Provider de dados</span>
                            <select className={fieldClass} value={settings.providerType} onChange={event => setSettings({ ...settings, providerType: event.target.value as Settings['providerType'] })}>
                                <option value="mock">Mock</option>
                                <option value="manual">Manual</option>
                                <option value="import">Importação CSV/JSON</option>
                                <option value="external">Externo autorizado</option>
                            </select>
                        </label>
                    </div>
                    {settings.providerType === 'external' && (
                        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                            Estrutura reservada para um serviço externo autorizado. Nenhum scraping ou sessão do Instagram é utilizado.
                        </p>
                    )}
                </Panel>

                <div className="flex justify-end">
                    <button disabled={saving} className={primaryButtonClass}>
                        <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar configurações'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function NumberField({ label, value, min, max, onChange }: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}) {
    return (
        <label>
            <span className={labelClass}>{label}</span>
            <input type="number" min={min} max={max} className={fieldClass} value={value} onChange={event => onChange(Number(event.target.value))} />
        </label>
    );
}
