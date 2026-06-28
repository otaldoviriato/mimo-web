'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'platformFee' | 'setPlatformFee'
    | 'uploadLimit' | 'setUploadLimit'
    | 'comparisonPeriod' | 'setComparisonPeriod'
    | 'isDirtyPlatform' | 'saving' | 'saveSettings'
>;

function SettingField({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 py-6 border-b border-slate-100 last:border-0">
            <div className="md:w-1/2 space-y-1">
                <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
            </div>
            <div className="md:w-1/2 flex items-center">
                {children}
            </div>
        </div>
    );
}

export function SettingsPlatformPage({
    platformFee, setPlatformFee,
    uploadLimit, setUploadLimit,
    comparisonPeriod, setComparisonPeriod,
    isDirtyPlatform, saving, saveSettings,
}: Props) {
    const inputCls = 'w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-sm';

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyPlatform} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                    <Globe size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Plataforma & Operação</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Parâmetros globais que definem as regras de funcionamento da plataforma MimoChat.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
                <SettingField
                    title="Taxa de Intermediação (%)"
                    description="Percentual retido pela plataforma sobre cada cobrança de mensagem paga. Por exemplo, com 20%, se o profissional cobra R$ 1,00 por mensagem, a plataforma retém R$ 0,20 e o profissional recebe R$ 0,80 no saldo. Esta taxa é aplicada no momento em que o sistema debita o saldo do cliente. Afeta diretamente a receita bruta da plataforma e o repasse líquido aos profissionais."
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            value={platformFee}
                            onChange={(e) => setPlatformFee(Number(e.target.value))}
                            min={0}
                            max={100}
                            step={0.5}
                            className={inputCls}
                        />
                        <span className="text-sm font-bold text-slate-500">%</span>
                    </div>
                </SettingField>

                <SettingField
                    title="Limite de Upload de Mídia (MB)"
                    description="Tamanho máximo em megabytes (MB) permitido para o envio de arquivos de mídia — fotos e vídeos — pelos usuários e profissionais. Arquivos que ultrapassem este limite são bloqueados automaticamente pelo servidor com uma mensagem de erro antes mesmo de iniciar o upload. Valores maiores permitem qualidade superior de mídia, mas aumentam o consumo de banda e o custo de armazenamento no servidor. Recomendado: entre 20 MB e 100 MB."
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            value={uploadLimit}
                            onChange={(e) => setUploadLimit(Number(e.target.value))}
                            min={1}
                            max={500}
                            className={inputCls}
                        />
                        <span className="text-sm font-bold text-slate-500">MB</span>
                    </div>
                </SettingField>

                <SettingField
                    title="Período Comparativo Padrão do Dashboard"
                    description='Define o intervalo de referência usado para calcular as variações percentuais (setas ↑↓) exibidas nos cards de métricas do dashboard administrativo. "Sem Comparação" oculta os indicadores de variação, exibindo apenas o valor absoluto atual. "Última Semana" compara os dados atuais com os 7 dias anteriores. "Último Mês" compara com os 30 dias anteriores. Esta configuração define o valor padrão ao carregar o painel — qualquer administrador pode mudar temporariamente usando o seletor no header.'
                >
                    <select
                        value={comparisonPeriod}
                        onChange={(e) => setComparisonPeriod(e.target.value as any)}
                        className={inputCls}
                    >
                        <option value="none">Sem Comparação (Ocultar Variação)</option>
                        <option value="week">Última Semana (7 dias)</option>
                        <option value="month">Último Mês (30 dias)</option>
                    </select>
                </SettingField>
            </div>
        </div>
    );
}
