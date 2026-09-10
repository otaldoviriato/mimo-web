'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, X, AlertCircle, Download, Check, Loader2 } from 'lucide-react';
import { usePWA } from '@/context/PWAContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMyProfile } from '@/hooks/useQueries';
import { userApi } from '@/services/api';
import toast from 'react-hot-toast';

// Chave usada para sinalizar ao PWA standalone que deve reabrir o modal de notificações
const PWA_REOPEN_MODAL_KEY = 'mimo_reopen_notif_modal';

interface FirstMessageNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    professionalName?: string;
}

export function FirstMessageNotificationModal({
    isOpen,
    onClose,
    professionalName,
}: FirstMessageNotificationModalProps) {
    const { isStandalone, promptInstall } = usePWA();
    const { permission, handleRequestPermission } = usePushNotifications();
    const { data: user } = useMyProfile();

    const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
    const [pushEnabled, setPushEnabled] = useState<boolean>(false);
    const [showInstallPromptAlert, setShowInstallPromptAlert] = useState<boolean>(false);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState<boolean>(false);
    const [isRequestingPush, setIsRequestingPush] = useState<boolean>(false);
    const [isInstallingApp, setIsInstallingApp] = useState<boolean>(false);
    const [installDone, setInstallDone] = useState<boolean>(false);

    useEffect(() => {
        if (user?.emailNotificationsEnabled !== undefined) {
            setEmailEnabled(user.emailNotificationsEnabled);
        }
    }, [user?.emailNotificationsEnabled]);

    useEffect(() => {
        if (isStandalone && permission === 'granted') {
            setPushEnabled(true);
        } else {
            setPushEnabled(false);
        }
    }, [isStandalone, permission]);

    // Ouve o evento nativo 'pwa_app_installed' (disparado pelo PWAContext via 'appinstalled')
    useEffect(() => {
        const onInstalled = () => {
            setIsInstallingApp(false);
            setInstallDone(true);
            setShowInstallPromptAlert(prev => prev); // mantém visível para mostrar feedback

            // Salva flag para reabrir o modal quando o PWA abre em standalone
            if (typeof window !== 'undefined') {
                localStorage.setItem(PWA_REOPEN_MODAL_KEY, '1');
            }
        };

        window.addEventListener('pwa_app_installed', onInstalled);
        return () => window.removeEventListener('pwa_app_installed', onInstalled);
    }, []);

    // Quando o app abre em modo standalone com a flag, exibe o switch de push disponível
    useEffect(() => {
        if (!isStandalone || !isOpen) return;
        if (typeof window === 'undefined') return;

        const shouldReopen = localStorage.getItem(PWA_REOPEN_MODAL_KEY);
        if (shouldReopen) {
            localStorage.removeItem(PWA_REOPEN_MODAL_KEY);
        }
    }, [isStandalone, isOpen]);

    if (!isOpen) return null;

    const handleToggleEmail = async () => {
        const nextValue = !emailEnabled;
        setEmailEnabled(nextValue);
        setIsUpdatingEmail(true);
        try {
            await userApi.updateMe({ emailNotificationsEnabled: nextValue });
            toast.success(
                nextValue
                    ? 'Avisos por e-mail ativados!'
                    : 'Avisos por e-mail desativados.'
            );
        } catch {
            setEmailEnabled(!nextValue);
            toast.error('Erro ao atualizar preferência de e-mail.');
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handleTogglePush = async () => {
        if (pushEnabled) return;

        if (!isStandalone) {
            setShowInstallPromptAlert(true);
            return;
        }

        setIsRequestingPush(true);
        try {
            await handleRequestPermission();
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                setPushEnabled(true);
                setShowInstallPromptAlert(false);
                toast.success('Notificações no dispositivo ativadas com sucesso!');
            } else {
                toast.error('Permissão para notificações não concedida no navegador.');
            }
        } catch {
            toast.error('Não foi possível ativar notificações no momento.');
        } finally {
            setIsRequestingPush(false);
        }
    };

    const handleInstallClick = async () => {
        if (isInstallingApp || installDone) return;
        setIsInstallingApp(true);
        try {
            const outcome = await promptInstall();
            if (outcome === 'accepted') {
                // Mantém loading — o evento 'pwa_app_installed' irá resolver quando o Chrome confirmar.
                // Timeout de segurança de 12s caso o evento não chegue.
                const timeout = setTimeout(() => setIsInstallingApp(false), 12_000);
                window.addEventListener('pwa_app_installed', () => clearTimeout(timeout), { once: true });
            } else {
                setIsInstallingApp(false);
            }
        } catch {
            setIsInstallingApp(false);
        }
    };

    const displayName = professionalName || 'a criadora';

    return (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            {/* Overlay para fechar */}
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 text-slate-900 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
                {/* Botão Fechar */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    aria-label="Fechar"
                >
                    <X size={18} strokeWidth={2.4} />
                </button>

                {/* Área com scroll para caber em telas pequenas */}
                <div className="overflow-y-auto max-h-[85svh] p-5 space-y-4">
                    {/* Cabeçalho */}
                    <div className="flex flex-col items-center text-center pt-1 pb-1">
                        <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 shadow-xs">
                            <Bell size={22} strokeWidth={2.3} />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                            Não perca a resposta de {displayName}!
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-xs">
                            Sua primeira mensagem foi enviada. Verifique se suas notificações estão ativas para ser avisado assim que ela te responder:
                        </p>
                    </div>

                    {/* Opções de Notificação */}
                    <div className="space-y-2.5">
                        {/* E-mail */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 shrink-0 flex items-center justify-center mt-0.5">
                                    <Mail size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800">Avisos por e-mail</span>
                                        {emailEnabled && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                                                Ativado
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                                        Enviaremos um e-mail avisando quando novas mensagens chegarem na sua conversa.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={emailEnabled}
                                disabled={isUpdatingEmail}
                                onClick={handleToggleEmail}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                                    emailEnabled ? 'bg-purple-600' : 'bg-slate-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out my-0.5 ml-0.5 ${
                                        emailEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Push */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 shrink-0 flex items-center justify-center mt-0.5">
                                    <Smartphone size={16} strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800">Notificações no celular</span>
                                        {pushEnabled ? (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                                                Ativado
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-600">
                                                {isStandalone ? 'Disponível' : 'Requer app'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                                        Receba alertas instantâneos na tela do seu aparelho assim que ela responder.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={pushEnabled}
                                disabled={isRequestingPush}
                                onClick={handleTogglePush}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                                    pushEnabled ? 'bg-purple-600' : 'bg-slate-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out my-0.5 ml-0.5 ${
                                        pushEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Aviso de instalação necessária */}
                    {showInstallPromptAlert && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900 space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" strokeWidth={2.2} />
                                <div className="space-y-1 text-xs">
                                    <p className="font-bold text-amber-900">Aplicativo não instalado</p>
                                    <p className="text-amber-800 leading-relaxed">
                                        Para receber notificações na tela do seu aparelho, você precisa primeiro instalar o aplicativo do Mimo no celular ou computador.
                                    </p>
                                    {!installDone && (
                                        <p className="font-semibold text-amber-900 pt-0.5">Deseja instalar o aplicativo agora?</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleInstallClick}
                                    disabled={isInstallingApp || installDone}
                                    className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-70 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                                >
                                    {installDone ? (
                                        <>
                                            <Check size={14} />
                                            <span>Instalado!</span>
                                        </>
                                    ) : isInstallingApp ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Instalando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download size={14} />
                                            <span>Instalar Aplicativo</span>
                                        </>
                                    )}
                                </button>
                                {!installDone && (
                                    <button
                                        type="button"
                                        onClick={() => setShowInstallPromptAlert(false)}
                                        className="px-3 h-9 rounded-xl bg-white border border-amber-200 text-amber-900 hover:bg-amber-100/50 text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                        Agora não
                                    </button>
                                )}
                            </div>

                            {installDone && (
                                <p className="text-[10px] text-amber-800 leading-relaxed animate-in fade-in duration-300">
                                    Aplicativo instalado! Abra o Mimo pela sua tela inicial e ative as notificações de lá.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Botão de Conclusão */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all active:scale-[0.98] shadow-sm shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Check size={16} strokeWidth={2.5} />
                        <span>Continuar conversando</span>
                    </button>

                    <div className="h-1" />
                </div>
            </div>
        </div>
    );
}