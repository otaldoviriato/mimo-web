'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, X, AlertCircle, Download, Check } from 'lucide-react';
import { usePWA } from '@/context/PWAContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMyProfile } from '@/hooks/useQueries';
import { userApi } from '@/services/api';
import toast from 'react-hot-toast';

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
        if (pushEnabled) {
            return;
        }

        // Se o aplicativo ainda NÃO estiver instalado, exibe o aviso de instalação
        if (!isStandalone) {
            setShowInstallPromptAlert(true);
            return;
        }

        // Se já está instalado, solicita permissão nativa de push
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
        try {
            await promptInstall();
        } catch (error) {
            console.error('Erro ao acionar prompt de instalação PWA:', error);
        }
    };

    const displayName = professionalName || 'a criadora';

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-slate-900 space-y-5 animate-in zoom-in-95 duration-200">
                {/* Botão Fechar */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    aria-label="Fechar"
                >
                    <X size={18} strokeWidth={2.4} />
                </button>

                {/* Cabeçalho */}
                <div className="flex flex-col items-center text-center pt-1">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 shadow-xs">
                        <Bell size={24} strokeWidth={2.3} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                        Não perca a resposta de {displayName}!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm">
                        Sua primeira mensagem foi enviada. Verifique se suas notificações estão ativas para ser avisado assim que ela te responder:
                    </p>
                </div>

                {/* Lista de Opções de Notificação */}
                <div className="space-y-3">
                    {/* Opção 1: E-mail */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 shrink-0 flex items-center justify-center mt-0.5">
                                <Mail size={18} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-800">
                                        Avisos por e-mail
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                                        Ativado
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                                    Enviaremos um e-mail avisando quando novas mensagens chegarem na sua conversa.
                                </p>
                            </div>
                        </div>

                        {/* Switch E-mail */}
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

                    {/* Opção 2: Notificações no Dispositivo (Push) */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 shrink-0 flex items-center justify-center mt-0.5">
                                <Smartphone size={18} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-800">
                                        Notificações no celular
                                    </span>
                                    {pushEnabled ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                                            Ativado
                                        </span>
                                    ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-600">
                                            Requer app
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                                    Receba alertas instantâneos na tela do seu aparelho assim que ela responder.
                                </p>
                            </div>
                        </div>

                        {/* Switch Push */}
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

                {/* Mensagem de Erro / Aviso se o app não estiver instalado */}
                {showInstallPromptAlert && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" strokeWidth={2.2} />
                            <div className="space-y-1 text-xs">
                                <p className="font-bold text-amber-900">
                                    Aplicativo não instalado
                                </p>
                                <p className="text-amber-800 leading-relaxed">
                                    Para receber notificações na tela do seu aparelho, você precisa primeiro instalar o aplicativo do Mimo no celular ou computador.
                                </p>
                                <p className="font-semibold text-amber-900 pt-0.5">
                                    Deseja instalar o aplicativo agora?
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleInstallClick}
                                className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                            >
                                <Download size={14} />
                                <span>Instalar Aplicativo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowInstallPromptAlert(false)}
                                className="px-3 h-9 rounded-xl bg-white border border-amber-200 text-amber-900 hover:bg-amber-100/50 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Agora não
                            </button>
                        </div>
                    </div>
                )}

                {/* Botão de Conclusão */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all active:scale-[0.98] shadow-sm shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Check size={16} strokeWidth={2.5} />
                        <span>Continuar conversando</span>
                    </button>
                </div>
            </div>
        </div>
    );
}