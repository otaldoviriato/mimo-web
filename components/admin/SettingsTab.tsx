'use client';

import React from 'react';
import {
    Sliders, Clock, Smartphone, Coins, Camera, CreditCard, Zap, AlertCircle
} from 'lucide-react';
import { SettingsSectionCard } from './SettingsSectionCard';
import { AdminsManager } from './AdminsManager';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

interface SettingsTabProps extends UseSettingsReturn {
    userId: string | null | undefined;
}

export function SettingsTab({
    platformFee, setPlatformFee,
    uploadLimit, setUploadLimit,
    comparisonPeriod, setComparisonPeriod,
    chatSessionTimeoutMinutes, setChatSessionTimeoutMinutes,
    pwaShowAgainIntervalDays, setPwaShowAgainIntervalDays,
    maxPricePerChar, setMaxPricePerChar,
    defaultPricePerCharNonSubscribers, setDefaultPricePerCharNonSubscribers,
    defaultPricePerCharSubscribers, setDefaultPricePerCharSubscribers,
    minSubscriptionPrice, setMinSubscriptionPrice,
    maxSubscriptionPrice, setMaxSubscriptionPrice,
    subscriberDiscountPercentage, setSubscriberDiscountPercentage,
    minPublicPhotos, setMinPublicPhotos,
    maxPublicPhotos, setMaxPublicPhotos,
    minExclusivePhotos, setMinExclusivePhotos,
    maxExclusivePhotos, setMaxExclusivePhotos,
    newProfileDaysThreshold, setNewProfileDaysThreshold,
    pixEnabled, setPixEnabled,
    creditCardEnabled, setCreditCardEnabled,
    couponsEnabled, setCouponsEnabled,
    saving,
    adminListRich,
    adminSearch, setAdminSearch,
    adminSearchResults,
    showAdminDropdown, setShowAdminDropdown,
    searchingAdmin,
    saveSettings,
    handleSelectAdmin,
    handleRemoveAdmin,
    userId,
}: SettingsTabProps) {
    const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 font-medium text-slate-700';
    const labelCls = 'text-xs font-bold text-slate-600 uppercase block';

    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna principal com os 6 tópicos */}
            <div className="lg:col-span-2 space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Sliders size={20} className="text-purple-600" />
                        Parâmetros Operacionais
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        Ajuste os valores cadastrados diretamente no banco de dados MongoDB.
                    </p>
                </div>

                <form onSubmit={saveSettings} className="space-y-4">

                    {/* Tópico 1 — Plataforma & Operação */}
                    <SettingsSectionCard title="Plataforma & Operação" icon={<Sliders size={16} />} storageKey="platform-op">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-2">
                                <label className={labelCls}>Taxa de Intermediação (%)</label>
                                <input type="number" value={platformFee} onChange={(e) => setPlatformFee(Number(e.target.value))} min={0} max={100} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Limite de Upload (MB)</label>
                                <input type="number" value={uploadLimit} onChange={(e) => setUploadLimit(Number(e.target.value))} min={1} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Período Comparativo Padrão</label>
                                <select value={comparisonPeriod} onChange={(e) => setComparisonPeriod(e.target.value as any)} className={inputCls}>
                                    <option value="none">Sem Relação (Ocultar Variação)</option>
                                    <option value="week">Uma Semana</option>
                                    <option value="month">Um Mês</option>
                                </select>
                            </div>
                        </div>
                    </SettingsSectionCard>

                    {/* Tópico 2 — Chat & Sessões */}
                    <SettingsSectionCard title="Chat & Sessões" icon={<Clock size={16} />} storageKey="chat-sessions">
                        <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-2">
                                <label className={`${labelCls} flex items-center gap-1.5`}>
                                    <Clock size={12} className="text-purple-500" />
                                    Tempo de Sessão de Chat (minutos)
                                </label>
                                <input type="number" value={chatSessionTimeoutMinutes} onChange={(e) => setChatSessionTimeoutMinutes(Number(e.target.value))} min={1} max={1440} className={inputCls} />
                            </div>
                            <div className="flex-[2] bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-6">
                                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                                    <AlertCircle size={11} /> Como funciona
                                </p>
                                <p className="text-[11px] text-amber-700 leading-relaxed">
                                    Se o intervalo entre a última mensagem e a próxima for maior ou igual a <strong>{chatSessionTimeoutMinutes} min</strong>, o sistema considera que uma nova conversa foi iniciada. Isso é usado para disparar notificações por e-mail ao profissional.
                                </p>
                            </div>
                        </div>
                    </SettingsSectionCard>

                    {/* Tópico 3 — Precificação & Assinaturas */}
                    <SettingsSectionCard title="Precificação & Assinaturas" icon={<Coins size={16} />} storageKey="pricing">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-2">
                                <label className={labelCls}>Preço Máximo por Caractere (R$)</label>
                                <input type="number" step="0.001" value={maxPricePerChar} onChange={(e) => setMaxPricePerChar(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Preço Padrão por Char (Não-Assinantes) (R$)</label>
                                <input type="number" step="0.0001" value={defaultPricePerCharNonSubscribers} onChange={(e) => setDefaultPricePerCharNonSubscribers(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Preço Padrão por Char (Assinantes) (R$)</label>
                                <input type="number" step="0.0001" value={defaultPricePerCharSubscribers} onChange={(e) => setDefaultPricePerCharSubscribers(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Preço Mínimo da Assinatura (R$)</label>
                                <input type="number" step="0.01" value={minSubscriptionPrice} onChange={(e) => setMinSubscriptionPrice(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Preço Máximo da Assinatura (R$)</label>
                                <input type="number" step="0.01" value={maxSubscriptionPrice} onChange={(e) => setMaxSubscriptionPrice(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Desconto p/ Assinantes (%)</label>
                                <input type="number" value={subscriberDiscountPercentage} onChange={(e) => setSubscriberDiscountPercentage(Number(e.target.value))} min={0} max={100} className={inputCls} />
                            </div>
                        </div>
                    </SettingsSectionCard>

                    {/* Tópico 4 — Perfis & Galeria */}
                    <SettingsSectionCard title="Perfis & Galeria" icon={<Camera size={16} />} storageKey="profiles-gallery">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <div className="space-y-2">
                                <label className={labelCls}>Mín. Fotos Públicas</label>
                                <input type="number" value={minPublicPhotos} onChange={(e) => setMinPublicPhotos(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Máx. Fotos Públicas</label>
                                <input type="number" value={maxPublicPhotos} onChange={(e) => setMaxPublicPhotos(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Mín. Exclusivas Assinante</label>
                                <input type="number" value={minExclusivePhotos} onChange={(e) => setMinExclusivePhotos(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelCls}>Máx. Exclusivas Assinante</label>
                                <input type="number" value={maxExclusivePhotos} onChange={(e) => setMaxExclusivePhotos(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-start gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className={labelCls}>Dias para Perfil ser considerado Novo</label>
                                    <input type="number" value={newProfileDaysThreshold} onChange={(e) => setNewProfileDaysThreshold(Number(e.target.value))} min={0} className={inputCls} />
                                </div>
                                <div className="flex-[2] bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mt-6">
                                    <p className="text-xs font-semibold text-purple-800 flex items-center gap-1.5 mb-1">
                                        <AlertCircle size={11} /> Como funciona
                                    </p>
                                    <p className="text-[11px] text-purple-700 leading-relaxed">
                                        Define quantos dias após o cadastro o usuário exibirá a badge "Novo" nos cards de busca. Defina como 0 para desativar a badge.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </SettingsSectionCard>

                    {/* Tópico 5 — Meios de Pagamento */}
                    <SettingsSectionCard title="Meios de Pagamento" icon={<CreditCard size={16} />} storageKey="payment-methods">
                        <p className="text-xs text-slate-500 font-medium -mt-1">
                            Desabilite temporariamente um meio de pagamento. Usuários verão uma mensagem de indisponibilidade.
                        </p>
                        <div className="space-y-4 mt-2">
                            {[
                                { checked: pixEnabled, onChange: setPixEnabled, label: 'Pagamento via Pix habilitado', desc: 'Quando desmarcado, o Pix aparecerá como "Indisponível temporariamente" para os usuários.' },
                                { checked: creditCardEnabled, onChange: setCreditCardEnabled, label: 'Pagamento via Cartão de Crédito habilitado', desc: 'Quando desmarcado, o cartão de crédito aparecerá como "Indisponível temporariamente" para os usuários.' },
                                { checked: couponsEnabled, onChange: setCouponsEnabled, label: 'Resgate de Cupons habilitado', desc: 'Quando desmarcado, a opção de resgatar cupom fica oculta no modal de recarga.' },
                            ].map(({ checked, onChange, label, desc }) => (
                                <label key={label} className="flex items-start gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 accent-purple-600 rounded cursor-pointer w-4 h-4" />
                                    <div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-purple-600 transition-colors block">{label}</span>
                                        <span className="text-xs text-slate-400 font-medium">{desc}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </SettingsSectionCard>

                    {/* Tópico 6 — App & Experiência */}
                    <SettingsSectionCard title="App & Experiência" icon={<Zap size={16} />} storageKey="app-experience">
                        <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-2">
                                <label className={`${labelCls} flex items-center gap-1.5`}>
                                    <Smartphone size={12} className="text-purple-500" />
                                    Intervalo de Reexibição do Modal PWA (dias)
                                </label>
                                <input type="number" value={pwaShowAgainIntervalDays} onChange={(e) => setPwaShowAgainIntervalDays(Number(e.target.value))} min={0} className={inputCls} />
                            </div>
                            <div className="flex-[2] bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mt-6">
                                <p className="text-xs font-semibold text-purple-800 flex items-center gap-1.5 mb-1">
                                    <AlertCircle size={11} /> Como funciona
                                </p>
                                <p className="text-[11px] text-purple-700 leading-relaxed">
                                    Define o tempo de espera (em dias) para mostrar novamente o modal de instalação do app depois que o usuário clicar em "Fechar" ou "Continuar no navegador". Defina como 0 para não ter intervalo.
                                </p>
                            </div>
                        </div>
                    </SettingsSectionCard>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-600/10 cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Sidebar de Administradores */}
            <AdminsManager
                adminListRich={adminListRich}
                adminSearch={adminSearch}
                adminSearchResults={adminSearchResults}
                showAdminDropdown={showAdminDropdown}
                searchingAdmin={searchingAdmin}
                userId={userId}
                onAdminSearch={setAdminSearch}
                onDropdownClose={() => setShowAdminDropdown(false)}
                onSelectAdmin={handleSelectAdmin}
                onRemoveAdmin={handleRemoveAdmin}
                getInitials={getInitials}
            />
        </div>
    );
}
