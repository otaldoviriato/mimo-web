'use client';

import React, { useState, useEffect, useId } from 'react';
import { Bell, Mail, Smartphone, X, Download, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { usePWA } from '@/context/PWAContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMyProfile } from '@/hooks/useQueries';
import { userApi } from '@/services/api';
import toast from 'react-hot-toast';

// Quando o PWA abre em standalone, o NotifPromoModal lÃª esta flag e pede permissÃ£o de push
const PWA_REOPEN_MODAL_KEY = 'mimo_reopen_notif_modal';

interface FirstMessageNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    professionalName?: string;
}

// Toggle real: input[type=checkbox] escondido + label estilizado como switch
function NativeSwitch({
    id,
    checked,
    onChange,
    disabled,
}: {
    id: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <label
            htmlFor={id}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                checked ? 'bg-purple-600' : 'bg-slate-300'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <input
                id={id}
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </label>
    );
}

export function FirstMessageNotificationModal({
    isOpen,
    onClose,
    professionalName,
}: FirstMessageNotificationModalProps) {
    const { isStandalone, promptInstall } = usePWA();
    const { permission, handleRequestPermission } = usePushNotifications();
    const { data: user } = useMyProfile();

    const emailSwitchId = useId();
    const pushSwitchId = useId();

    const [emailEnabled, setEmailEnabled] = useState<boolean>(true);
    const [pushEnabled, setPushEnabled] = useState<boolean>(false);
    const [showInstallAlert, setShowInstallAlert] = useState<boolean>(false);
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
        setPushEnabled(isStandalone && permission === 'granted');
    }, [isStandalone, permission]);

    // Ouve confirmaÃ§Ã£o de instalaÃ§Ã£o do Chrome (disparado pelo PWAContext)
    useEffect(() => {
        const onInstalled = () => {
            setIsInstallingApp(false);
            setInstallDone(true);
            // Sinaliza ao NotifPromoModal para pedir permissÃ£o de push quando o PWA abrir
            if (typeof window !== 'undefined') {
                localStorage.setItem(PWA_REOPEN_MODAL_KEY, '1');
            }
        };
        window.addEventListener('pwa_app_installed', onInstalled);
        return () => window.removeEventListener('pwa_app_installed', onInstalled);
    }, []);

    if (!isOpen) return null;

    const handleToggleEmail = async (next: boolean) => {
        setEmailEnabled(next);
        setIsUpdatingEmail(true);
        try {
            await userApi.updateMe({ emailNotificationsEnabled: next });
            toast.success(next ? 'Avisos por e-mail ativados!' : 'Avisos por e-mail desativados.');
        } catch {
            setEmailEnabled(!next);
            toast.error('Erro ao atualizar preferÃªncia de e-mail.');
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handleTogglePush = async (next: boolean) => {
        if (!next || pushEnabled) return;

        if (!isStandalone) {
            setShowInstallAlert(true);
            return;
        }

        setIsRequestingPush(true);
        try {
            await handleRequestPermission();
            const granted =
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted';
            if (granted) {
                setPushEnabled(true);
                toast.success('NotificaÃ§Ãµes no dispositivo ativadas com sucesso!');
            } else {
                toast.error('PermissÃ£o para notificaÃ§Ãµes nÃ£o concedida.');
            }
        } catch {
            toast.error('NÃ£o foi possÃ­vel ativar notificaÃ§Ãµes no momento.');
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
                // MantÃ©m loading â€” pwa_app_installed resolverÃ¡; timeout de seguranÃ§a 12s
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

    // ApÃ³s instalaÃ§Ã£o: oculta opÃ§Ã£o de push e aviso amber; mostra card verde de sucesso
    const showPushRow = !installDone;
    const showInstallPanel = showInstallAlert && !installDone;

    return (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 text-slate-900 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    aria-label="Fechar"
                >
                    <X size={18} strokeWidth={2.4} />
                </button>

                <div className="overflow-y-auto max-h-[85svh] p-5 space-y-4">
                    {/* CabeÃ§alho */}
                    <div className="flex flex-col items-center text-center pt-1">
                        <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
                            <Bell size={22} strokeWidth={2.3} />
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
                            NÃ£o perca a resposta de {displayName}!
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-xs">
                            Sua primeira mensagem foi enviada. Ative suas notificaÃ§Ãµes para ser avisado assim que ela te responder:
                        </p>
                    </div>

                    {/* OpÃ§Ãµes de NotificaÃ§Ã£o */}
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
                            <NativeSwitch
                                id={emailSwitchId}
                                checked={emailEnabled}
                                onChange={handleToggleEmail}
                                disabled={isUpdatingEmail}
                            />
                        </div>

                        {/* Push â€” oculto apÃ³s instalaÃ§Ã£o concluÃ­da */}
                        {showPushRow && (
                            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 shrink-0 flex items-center justify-center mt-0.5">
                                        <Smartphone size={16} strokeWidth={2.2} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-bold text-slate-800">NotificaÃ§Ãµes no celular</span>
                                            {pushEnabled ? (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                                                    Ativado
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-600">
                                                    {isStandalone ? 'DisponÃ­vel' : 'Requer app'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                                            Receba alertas instantÃ¢neos na tela do seu aparelho assim que ela responder.
                                        </p>
                                    </div>
                                </div>
                                <NativeSwitch
                                    id={pushSwitchId}
                                    checked={pushEnabled}
                                    onChange={handleTogglePush}
                                    disabled={isRequestingPush}
                                />
                            </div>
                        )}
                    </div>

                    {/* Painel de instalaÃ§Ã£o â€” somente enquanto NÃƒO instalado */}
                    {showInstallPanel && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-3 animate-in fade-in duration-200">
                            <div className="space-y-1 text-xs">
                                <p className="font-bold text-slate-800">Aplicativo nÃ£o instalado</p>
                                <p className="text-slate-600 leading-relaxed">
                                    Para receber notificaÃ§Ãµes na tela do seu celular, instale o aplicativo do Mimo.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleInstallClick}
                                    disabled={isInstallingApp}
                                    className="flex-1 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-70 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                                >
                                    {isInstallingApp ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Instalando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download size={14} />
                                            <span>Instalar aplicativo</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInstallAlert(false)}
                                    className="px-3 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    Agora nÃ£o
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Card de sucesso â€” exibido quando instalaÃ§Ã£o concluÃ­da */}
                    {installDone && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-2.5 animate-in fade-in duration-300">
                            <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" strokeWidth={2.2} />
                            <div className="space-y-0.5 text-xs">
                                <p className="font-bold text-emerald-800">Aplicativo instalado</p>
                                <p className="text-emerald-700 leading-relaxed">
                                    Abra o Mimo pelo atalho na sua tela inicial e ative as notificaÃ§Ãµes de lÃ¡ para nÃ£o perder nenhuma resposta.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* BotÃ£o de ConclusÃ£o */}
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

