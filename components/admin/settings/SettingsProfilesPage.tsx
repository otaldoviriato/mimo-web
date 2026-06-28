'use client';

import React from 'react';
import { Camera } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'minPublicPhotos' | 'setMinPublicPhotos'
    | 'maxPublicPhotos' | 'setMaxPublicPhotos'
    | 'minExclusivePhotos' | 'setMinExclusivePhotos'
    | 'maxExclusivePhotos' | 'setMaxExclusivePhotos'
    | 'newProfileDaysThreshold' | 'setNewProfileDaysThreshold'
    | 'isDirtyProfiles' | 'saving' | 'saveSettings'
>;

function SettingField({ title, description, unit, children }: { title: string; description: string | React.ReactNode; unit?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 py-6 border-b border-slate-100 last:border-0">
            <div className="md:w-1/2 space-y-1">
                <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                <div className="text-xs text-slate-500 font-medium leading-relaxed">{description}</div>
            </div>
            <div className="md:w-1/2 flex items-center gap-3">
                {children}
                {unit && <span className="text-sm font-bold text-slate-500 shrink-0">{unit}</span>}
            </div>
        </div>
    );
}

export function SettingsProfilesPage({
    minPublicPhotos, setMinPublicPhotos,
    maxPublicPhotos, setMaxPublicPhotos,
    minExclusivePhotos, setMinExclusivePhotos,
    maxExclusivePhotos, setMaxExclusivePhotos,
    newProfileDaysThreshold, setNewProfileDaysThreshold,
    isDirtyProfiles, saving, saveSettings,
}: Props) {
    const inputCls = 'w-full max-w-xs px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700 shadow-sm';

    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyProfiles} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl border border-pink-100">
                    <Camera size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Perfis & Galeria</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Regras de quantidade de mídia nos perfis dos profissionais e identificação de novos criadores.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
                <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Galeria Pública</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Fotos visíveis a todos os usuários, mesmo sem assinatura. Usadas como vitrine do perfil nos resultados de busca.
                    </p>
                </div>

                <SettingField
                    title="Quantidade Mínima de Fotos Públicas"
                    description="Número mínimo de fotos obrigatórias na galeria pública para que um perfil seja considerado completo e elegível para aparecer nos resultados de busca. Perfis com menos fotos que este limite ficam pendentes de aprovação e não são exibidos para os usuários. Garante que todos os perfis ativos tenham uma apresentação visual adequada."
                    unit="fotos"
                >
                    <input
                        type="number"
                        value={minPublicPhotos}
                        onChange={(e) => setMinPublicPhotos(Number(e.target.value))}
                        min={0}
                        max={maxPublicPhotos}
                        className={inputCls}
                    />
                </SettingField>

                <SettingField
                    title="Quantidade Máxima de Fotos Públicas"
                    description="Limite máximo de fotos que um profissional pode adicionar à sua galeria pública. Controla o tamanho do perfil, mantém uma experiência visual consistente e gerencia o uso de armazenamento por perfil. Profissionais não conseguem adicionar mais fotos do que este limite permite."
                    unit="fotos"
                >
                    <input
                        type="number"
                        value={maxPublicPhotos}
                        onChange={(e) => setMaxPublicPhotos(Number(e.target.value))}
                        min={minPublicPhotos}
                        className={inputCls}
                    />
                </SettingField>

                <div className="mt-6 mb-4 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Galeria Exclusiva para Assinantes</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                        Conteúdo premium acessível apenas para usuários com assinatura ativa daquele profissional.
                    </p>
                </div>

                <SettingField
                    title="Quantidade Mínima de Fotos Exclusivas"
                    description="Número mínimo de fotos no álbum exclusivo para que um profissional possa ativar a funcionalidade de assinatura de conteúdo. Se o profissional tiver menos fotos que este mínimo, o módulo de assinatura fica desativado. Garante que assinantes recebam uma quantidade mínima de conteúdo ao pagar a mensalidade."
                    unit="fotos"
                >
                    <input
                        type="number"
                        value={minExclusivePhotos}
                        onChange={(e) => setMinExclusivePhotos(Number(e.target.value))}
                        min={0}
                        max={maxExclusivePhotos}
                        className={inputCls}
                    />
                </SettingField>

                <SettingField
                    title="Quantidade Máxima de Fotos Exclusivas"
                    description="Teto de fotos no álbum exclusivo para assinantes. Mantém um limite razoável de armazenamento e garante consistência no volume de conteúdo premium oferecido. Profissionais que atingem este limite precisam remover fotos antigas antes de adicionar novas."
                    unit="fotos"
                >
                    <input
                        type="number"
                        value={maxExclusivePhotos}
                        onChange={(e) => setMaxExclusivePhotos(Number(e.target.value))}
                        min={minExclusivePhotos}
                        className={inputCls}
                    />
                </SettingField>

                <div className="mt-6 mb-4 pt-6 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identificação de Novos Criadores</h3>
                </div>

                <SettingField
                    title="Dias para Badge 'Novo' no Perfil"
                    description={
                        <span>
                            Define por quantos dias após o cadastro um perfil de profissional exibe a badge <strong className="text-slate-600">&quot;Novo&quot;</strong> nos cards de busca e exploração da plataforma. Esta badge destaca criadores recém-chegados, ajudando usuários a descobrirem novos perfis e incentivando a diversificação da base de criadores. Após este período, a badge desaparece automaticamente. Defina como <strong className="text-slate-600">0</strong> para desativar completamente a badge de novo perfil.
                        </span>
                    }
                    unit="dias"
                >
                    <div className="space-y-2">
                        <input
                            type="number"
                            value={newProfileDaysThreshold}
                            onChange={(e) => setNewProfileDaysThreshold(Number(e.target.value))}
                            min={0}
                            className={inputCls}
                        />
                        {newProfileDaysThreshold === 0 && (
                            <p className="text-[11px] text-amber-600 font-semibold">
                                Badge desativada. Nenhum perfil exibirá o indicador &quot;Novo&quot;.
                            </p>
                        )}
                    </div>
                </SettingField>
            </div>
        </div>
    );
}
