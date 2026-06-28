'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { UnsavedChangesBanner } from './UnsavedChangesBanner';
import { AdminsManager } from '@/components/admin/AdminsManager';
import type { UseSettingsReturn } from '@/hooks/admin/useSettings';

type Props = Pick<UseSettingsReturn,
    | 'adminListRich'
    | 'adminSearch' | 'setAdminSearch'
    | 'adminSearchResults'
    | 'showAdminDropdown' | 'setShowAdminDropdown'
    | 'searchingAdmin'
    | 'handleSelectAdmin' | 'handleRemoveAdmin'
    | 'isDirtyAdmins' | 'saving' | 'saveSettings'
> & { userId: string | null | undefined };

function getInitials(name: string) {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

export function SettingsAdminsPage({
    adminListRich,
    adminSearch, setAdminSearch,
    adminSearchResults,
    showAdminDropdown, setShowAdminDropdown,
    searchingAdmin,
    handleSelectAdmin, handleRemoveAdmin,
    isDirtyAdmins, saving, saveSettings,
    userId,
}: Props) {
    return (
        <div className="space-y-6">
            <UnsavedChangesBanner isDirty={isDirtyAdmins} saving={saving} onSave={() => saveSettings()} />

            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                    <ShieldCheck size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Administradores do Sistema</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Gerencie quais contas possuem acesso completo ao painel administrativo do MimoChat.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Explicação */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">O que é um Administrador?</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Administradores são contas com <strong className="text-slate-600">acesso irrestrito</strong> ao painel de controle do MimoChat. Eles conseguem visualizar e modificar todas as configurações do sistema, acessar dados de usuários, gerenciar saques, tickets de ajuda, cupons, e-mails institucionais e muito mais.
                    </p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        O controle de acesso é feito via <strong className="text-slate-600">Clerk ID</strong> — o identificador único atribuído a cada conta pelo sistema de autenticação. Ao adicionar um usuário como administrador, você está concedendo a ele o mesmo nível de acesso que você possui.
                    </p>

                    <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mt-2">
                        <p className="text-xs font-bold text-rose-800 mb-1">⚠️ Atenção: Ação Sensível</p>
                        <p className="text-[11px] text-rose-700 leading-relaxed">
                            Adicionar ou remover administradores afeta diretamente a segurança da plataforma. Conceda acesso apenas a pessoas de total confiança. Um administrador tem poder para alterar qualquer configuração do sistema, inclusive remover outros administradores.
                        </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                        <p className="text-xs font-bold text-slate-700 mb-1">Como adicionar um administrador</p>
                        <ol className="text-[11px] text-slate-500 font-medium space-y-1.5 list-decimal list-inside">
                            <li>Use o campo de busca ao lado para encontrar o usuário pelo nome ou e-mail</li>
                            <li>Clique no nome do usuário nos resultados para adicioná-lo à lista</li>
                            <li>Clique em <strong>&quot;Salvar alterações&quot;</strong> no banner amarelo para confirmar no banco de dados</li>
                        </ol>
                        <p className="text-[11px] text-amber-600 font-semibold mt-2">
                            As alterações na lista só são aplicadas após salvar — enquanto não salvar, as mudanças são temporárias.
                        </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                        <p className="text-[11px] text-slate-400 font-medium">
                            Total de administradores ativos: <strong className="text-slate-600">{adminListRich.length}</strong>
                        </p>
                    </div>
                </div>

                {/* Gerenciamento */}
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
        </div>
    );
}
