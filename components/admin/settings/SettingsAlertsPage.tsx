'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, UserPlus, UserCheck, Check, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export function SettingsAlertsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [email, setEmail] = useState('');
    const [newProfessionalAlert, setNewProfessionalAlert] = useState(true);
    const [newClientBroughtAlert, setNewClientBroughtAlert] = useState(true);
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);

    useEffect(() => {
        fetchAlertSettings();
    }, []);

    const fetchAlertSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/alert-settings');
            if (res.ok) {
                const data = await res.json();
                if (data.preference) {
                    setEmail(data.preference.email || '');
                    setNewProfessionalAlert(data.preference.newProfessionalAlert ?? true);
                    setNewClientBroughtAlert(data.preference.newClientBroughtAlert ?? true);
                    setPushEnabled(data.preference.pushEnabled ?? true);
                    setEmailEnabled(data.preference.emailEnabled ?? true);
                }
            } else {
                toast.error('Não foi possível carregar suas preferências de alerta.');
            }
        } catch (error) {
            console.error('Erro ao buscar preferências de alerta:', error);
            toast.error('Falha de conexão ao carregar alertas.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await fetch('/api/admin/alert-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    newProfessionalAlert,
                    newClientBroughtAlert,
                    pushEnabled,
                    emailEnabled,
                }),
            });

            if (res.ok) {
                toast.success('Preferências de alertas salvas com sucesso!');
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || 'Erro ao salvar preferências.');
            }
        } catch (error) {
            console.error('Erro ao salvar preferências de alertas:', error);
            toast.error('Erro de conexão ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                <span className="text-xs font-semibold text-slate-500">Carregando configurações de alertas...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 shrink-0">
                    <Bell size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Alertas & Notificações do Administrador</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Personalize quais alertas operacionais você deseja receber e configure canais redundantes (Push + E-mail).
                    </p>
                </div>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Coluna 1: Eventos Notificados */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <Bell size={18} className="text-purple-600" />
                            Eventos Operacionais
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Selecione os gatilhos do sistema para os quais você deseja ser notificado.
                        </p>
                    </div>

                    <div className="space-y-4 pt-2">
                        {/* Alerta 1: Nova Profissional */}
                        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                            <div className="space-y-1">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                    <UserCheck size={16} className="text-purple-600" />
                                    Nova Profissional Cadastrada
                                </span>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                    Notifica quando uma nova criadora conclui 100% o onboarding e o perfil no MimoChat.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setNewProfessionalAlert(!newProfessionalAlert)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    newProfessionalAlert ? 'bg-purple-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        newProfessionalAlert ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Alerta 2: Novo Cliente Trazido */}
                        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                            <div className="space-y-1">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                    <UserPlus size={16} className="text-emerald-600" />
                                    Novo Cliente Trazido por Profissional
                                </span>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                    Notifica quando uma profissional traz um novo cliente masculino para o marketplace (1ª conversa).
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setNewClientBroughtAlert(!newClientBroughtAlert)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    newClientBroughtAlert ? 'bg-emerald-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        newClientBroughtAlert ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Coluna 2: Canais de Notificação (Push & E-mail Redundante) */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <Smartphone size={18} className="text-blue-600" />
                            Canais Redundantes
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Defina por onde deseja receber cada alerta ativo.
                        </p>
                    </div>

                    <div className="space-y-4 pt-2">
                        {/* Canal Push */}
                        <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                            <div className="space-y-1">
                                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                    <Smartphone size={16} className="text-blue-600" />
                                    Notificação Push (PWA / Expo)
                                </span>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                    Envio imediato via Firebase Push para dispositivos com o MimoAdmin/App instalado.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPushEnabled(!pushEnabled)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    pushEnabled ? 'bg-blue-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        pushEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Canal E-mail Redundante */}
                        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                        <Mail size={16} className="text-purple-600" />
                                        Notificação Redundante por E-mail
                                    </span>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        Dispara uma cópia formatada em e-mail para garantir auditabilidade.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setEmailEnabled(!emailEnabled)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        emailEnabled ? 'bg-purple-600' : 'bg-slate-200'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            emailEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Campo de E-mail */}
                            {emailEnabled && (
                                <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-700 block">
                                        E-mail de Destino do Administrador
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="seu.email@mimochat.com.br"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Caixas Informativas */}
            <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 flex items-start gap-3 text-xs text-purple-900">
                <Info size={18} className="text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <span className="font-bold">Notificações Redundantes Ativas</span>
                    <p className="text-[11px] text-purple-700 leading-relaxed font-medium">
                        As configurações acima aplicam-se exclusivamente à sua conta de administrador logada. Cada administrador da equipe do MimoChat pode definir independentemente suas próprias preferências e e-mails de recebimento.
                    </p>
                </div>
            </div>

            {/* Ação de Salvar */}
            <div className="flex justify-end pt-2">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-purple-600/20 cursor-pointer"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Salvando preferências...</span>
                        </>
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            <span>Salvar Configurações de Alertas</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
