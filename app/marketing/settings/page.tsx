'use client';

import { Eye, EyeOff, KeyRound, Save, SlidersHorizontal, TestTube2 } from 'lucide-react';
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

interface ScoringCriteria {
    targetDescription: string;
    minFollowers: number;
    idealFollowers: number;
    maxFollowers: number;
    positiveSignals: string[];
    negativeSignals: string[];
    weights: {
        realPerson: number;
        personalIdentity: number;
        profileActivity: number;
        ownAudience: number;
        profileQuality: number;
        externalLink: number;
        followerInteraction: number;
        creatorFit: number;
        adultContentFit: number;
    };
    penalties: {
        brandOrCompany: number;
        fakeOrBot: number;
        possibleMinor: number;
        possibleMale: number;
        privateOrInsufficient: number;
        spamOrScam: number;
        inactiveProfile: number;
    };
}

interface Settings {
    openAiApiKeyMasked: string;
    hasOpenAiApiKey: boolean;
    openAiModel: string;
    minScoreToHighlight: number;
    scoringCriteria: ScoringCriteria;
}

const weightLabels: Array<[keyof ScoringCriteria['weights'], string]> = [
    ['realPerson', 'Pessoa real'],
    ['personalIdentity', 'Nome e username pessoais'],
    ['profileActivity', 'Atividade do perfil'],
    ['ownAudience', 'Audiência própria'],
    ['profileQuality', 'Qualidade da bio e perfil'],
    ['externalLink', 'Link externo'],
    ['followerInteraction', 'Interação com seguidores'],
    ['creatorFit', 'Compatibilidade com criadora digital'],
    ['adultContentFit', 'Indícios de venda de conteúdo adulto na bio'],
];

const penaltyLabels: Array<[keyof ScoringCriteria['penalties'], string]> = [
    ['brandOrCompany', 'Marca ou empresa'],
    ['fakeOrBot', 'Fake ou bot'],
    ['possibleMinor', 'Possível menor de idade'],
    ['possibleMale', 'Possível perfil masculino'],
    ['privateOrInsufficient', 'Privado ou dados insuficientes'],
    ['spamOrScam', 'Spam ou golpe'],
    ['inactiveProfile', 'Perfil inativo'],
];

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

    function updateCriteria(patch: Partial<ScoringCriteria>) {
        if (!settings) return;
        setSettings({
            ...settings,
            scoringCriteria: { ...settings.scoringCriteria, ...patch },
        });
    }

    if (!settings) return <LoadingState text="Carregando configurações..." />;

    return (
        <div className="mx-auto max-w-6xl">
            <PageIntro
                title="Configurações do Mimo Growth"
                description="Configure a conexão com a OpenAI e tudo que deve aumentar ou reduzir a nota dos perfis."
            />
            <form onSubmit={save} className="space-y-5">
                <Panel className="p-5 md:p-6">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-xl bg-purple-100 p-2.5 text-purple-700"><KeyRound className="h-5 w-5" /></div>
                        <div><h3 className="font-black">OpenAI</h3><p className="text-xs text-slate-500">A chave permanece criptografada no backend.</p></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="md:col-span-2">
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
                    <div className="mb-5 flex items-center gap-3">
                        <div className="rounded-xl bg-purple-100 p-2.5 text-purple-700"><SlidersHorizontal className="h-5 w-5" /></div>
                        <div><h3 className="font-black">Perfil desejado</h3><p className="text-xs text-slate-500">Estas regras são enviadas à IA em toda análise e priorização.</p></div>
                    </div>
                    <label>
                        <span className={labelClass}>Descrição do lead ideal</span>
                        <textarea
                            rows={4}
                            className={fieldClass}
                            value={settings.scoringCriteria.targetDescription}
                            onChange={event => updateCriteria({ targetDescription: event.target.value })}
                        />
                    </label>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <NumberField label="Seguidores mínimos" value={settings.scoringCriteria.minFollowers} max={1000000000} onChange={minFollowers => updateCriteria({ minFollowers })} />
                        <NumberField label="Faixa ideal" value={settings.scoringCriteria.idealFollowers} max={1000000000} onChange={idealFollowers => updateCriteria({ idealFollowers })} />
                        <NumberField label="Seguidores máximos" value={settings.scoringCriteria.maxFollowers} max={1000000000} onChange={maxFollowers => updateCriteria({ maxFollowers })} />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <SignalField
                            label="Sinais positivos"
                            value={settings.scoringCriteria.positiveSignals}
                            onChange={positiveSignals => updateCriteria({ positiveSignals })}
                        />
                        <SignalField
                            label="Sinais negativos"
                            value={settings.scoringCriteria.negativeSignals}
                            onChange={negativeSignals => updateCriteria({ negativeSignals })}
                        />
                    </div>
                </Panel>

                <div className="grid gap-5 lg:grid-cols-2">
                    <Panel className="p-5 md:p-6">
                        <h3 className="font-black">Pesos positivos</h3>
                        <p className="mt-1 text-xs text-slate-500">Quanto cada evidência pode influenciar positivamente a nota.</p>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            {weightLabels.map(([key, label]) => (
                                <NumberField
                                    key={key}
                                    label={label}
                                    value={settings.scoringCriteria.weights[key]}
                                    max={100}
                                    onChange={value => updateCriteria({
                                        weights: { ...settings.scoringCriteria.weights, [key]: value },
                                    })}
                                />
                            ))}
                        </div>
                    </Panel>
                    <Panel className="p-5 md:p-6">
                        <h3 className="font-black">Penalidades</h3>
                        <p className="mt-1 text-xs text-slate-500">Quanto cada risco deve reduzir a compatibilidade do perfil.</p>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            {penaltyLabels.map(([key, label]) => (
                                <NumberField
                                    key={key}
                                    label={label}
                                    value={settings.scoringCriteria.penalties[key]}
                                    max={100}
                                    onChange={value => updateCriteria({
                                        penalties: { ...settings.scoringCriteria.penalties, [key]: value },
                                    })}
                                />
                            ))}
                        </div>
                    </Panel>
                </div>

                <div className="flex justify-end">
                    <button disabled={saving} className={primaryButtonClass}>
                        <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar configurações'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function NumberField({ label, value, max, onChange }: {
    label: string;
    value: number;
    max: number;
    onChange: (value: number) => void;
}) {
    return (
        <label>
            <span className={labelClass}>{label}</span>
            <input type="number" min={0} max={max} className={fieldClass} value={value} onChange={event => onChange(Number(event.target.value))} />
        </label>
    );
}

function SignalField({ label, value, onChange }: {
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
}) {
    return (
        <label>
            <span className={labelClass}>{label}</span>
            <textarea
                rows={7}
                className={fieldClass}
                value={value.join('\n')}
                onChange={event => onChange(event.target.value.split('\n').map(item => item.trim()).filter(Boolean))}
                placeholder="Um sinal por linha"
            />
        </label>
    );
}
