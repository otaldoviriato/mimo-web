'use client';

import React, { useEffect, useId, useState } from 'react';
import { Bell, Check, CheckCircle2, Download, Loader2, Mail, Smartphone, X } from 'lucide-react';
import { Drawer } from 'vaul';
import { usePWA } from '@/context/PWAContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMyProfile } from '@/hooks/useQueries';
import { userApi } from '@/services/api';
import toast from 'react-hot-toast';

export const PWA_REOPEN_NOTIFICATION_PROMPT_KEY = 'mimo_reopen_notif_modal';

interface FirstMessageNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    professionalName?: string;
}

function NativeSwitch({
    id,
    checked,
    onChange,
    disabled,
}: {
    id: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <label
            htmlFor={id}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
                checked ? 'bg-purple-600' : 'bg-slate-300'
            } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
            <input
                id={id}
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
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
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [showInstallHelp, setShowInstallHelp] = useState(false);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [isRequestingPush, setIsRequestingPush] = useState(false);
    const [isInstallingApp, setIsInstallingApp] = useState(false);
    const [installDone, setInstallDone] = useState(false);

    useEffect(() => {
        if (user?.emailNotificationsEnabled !== undefined) {
            setEmailEnabled(user.emailNotificationsEnabled);
        }
    }, [user?.emailNotificationsEnabled]);

    useEffect(() => {
        setPushEnabled(isStandalone && permission === 'granted');
    }, [isStandalone, permission]);

    useEffect(() => {
        const onInstalled = () => {
            setIsInstallingApp(false);
            setInstallDone(true);
            localStorage.setItem(PWA_REOPEN_NOTIFICATION_PROMPT_KEY, '1');
        };
        window.addEventListener('pwa_app_installed', onInstalled);
        return () => window.removeEventListener('pwa_app_installed', onInstalled);
    }, []);

    const handleToggleEmail = async (next: boolean) => {
        setEmailEnabled(next);
        setIsUpdatingEmail(true);
        try {
            await userApi.updateMe({ emailNotificationsEnabled: next });
            toast.success(next ? 'Avisos por e-mail ativados!' : 'Avisos por e-mail desativados.');
        } catch {
            setEmailEnabled(!next);
            toast.error('Não foi possível atualizar a preferência de e-mail.');
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    const handleTogglePush = async (next: boolean) => {
        if (!next || pushEnabled) return;
        if (!isStandalone) {
            setShowInstallHelp(true);
            return;
        }

        setIsRequestingPush(true);
        try {
            await handleRequestPermission();
            const granted = 'Notification' in window && Notification.permission === 'granted';
            if (granted) {
                setPushEnabled(true);
                toast.success('Notificações ativadas com sucesso!');
            } else {
                toast.error('A permissão para notificações não foi concedida.');
            }
        } catch {
            toast.error('Não foi possível ativar as notificações agora.');
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
                const timeout = setTimeout(() => setIsInstallingApp(false), 12_000);
                window.addEventListener('pwa_app_installed', () => clearTimeout(timeout), { once: true });
            } else {
                setIsInstallingApp(false);
            }
        } catch {
            setIsInstallingApp(false);
        }
    };

    const displayName = professionalName || 'a profissional';

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()} repositionInputs={false}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[150] bg-slate-950/60 backdrop-blur-[2px]" />
                <Drawer.Content className="fixed inset-x-0 bottom-0 z-[151] mx-auto flex max-h-[90svh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-slate-100 bg-white text-slate-900 shadow-[0_-20px_60px_rgba(15,23,42,0.22)] outline-none">
                    <div className="relative shrink-0 px-5 pb-1 pt-3">
                        <Drawer.Handle className="mb-2 !h-1.5 !w-12 !bg-slate-300" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Fechar"
                        >
                            <X size={18} strokeWidth={2.4} />
                        </button>
                    </div>

                    <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
                        <div className="flex flex-col items-center pb-4 text-center">
                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                                <Bell size={22} strokeWidth={2.3} />
                            </div>
                            <Drawer.Title className="text-base font-extrabold leading-snug tracking-tight text-slate-900">
                                Não perca a resposta de {displayName}
                            </Drawer.Title>
                            <Drawer.Description className="mt-1 max-w-xs text-[11px] leading-relaxed text-slate-500">
                                Sua primeira mensagem foi enviada. Escolha como quer ser avisado quando ela responder.
                            </Drawer.Description>
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                                        <Mail size={16} strokeWidth={2.2} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-xs font-bold text-slate-800">Avisos por e-mail</span>
                                            {emailEnabled && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">Ativado</span>}
                                        </div>
                                        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                                            Enviaremos um e-mail quando uma nova mensagem chegar nesta conversa.
                                        </p>
                                    </div>
                                </div>
                                <NativeSwitch id={emailSwitchId} checked={emailEnabled} onChange={handleToggleEmail} disabled={isUpdatingEmail} />
                            </div>

                            {!installDone && (
                                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
                                    <div className="flex min-w-0 items-start gap-2.5">
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                                            <Smartphone size={16} strokeWidth={2.2} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-800">Notificações no celular</span>
                                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${pushEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                                    {pushEnabled ? 'Ativado' : isStandalone ? 'Disponível' : 'Disponível no app'}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                                                Receba um alerta no aparelho assim que ela responder.
                                            </p>
                                        </div>
                                    </div>
                                    <NativeSwitch id={pushSwitchId} checked={pushEnabled} onChange={handleTogglePush} disabled={isRequestingPush} />
                                </div>
                            )}
                        </div>

                        {showInstallHelp && !installDone && (
                            <div className="mt-3 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                                <div className="space-y-1 text-xs">
                                    <p className="font-bold text-amber-900">Instale o Mimo para ativar</p>
                                    <p className="leading-relaxed text-amber-800">
                                        Depois da instalação, abra o Mimo pelo ícone na tela inicial. O aplicativo mostrará o pedido para ativar as notificações.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleInstallClick}
                                        disabled={isInstallingApp}
                                        className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-purple-600 text-xs font-bold text-white transition-all hover:bg-purple-700 active:scale-[0.98] disabled:opacity-70"
                                    >
                                        {isInstallingApp ? <><Loader2 size={14} className="animate-spin" /> Instalando...</> : <><Download size={14} /> Instalar aplicativo</>}
                                    </button>
                                    <button type="button" onClick={() => setShowInstallHelp(false)} className="h-9 cursor-pointer rounded-xl border border-amber-200 bg-white px-3 text-xs font-semibold text-amber-900">
                                        Agora não
                                    </button>
                                </div>
                            </div>
                        )}

                        {installDone && (
                            <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" strokeWidth={2.2} />
                                <div className="space-y-0.5 text-xs">
                                    <p className="font-bold text-emerald-800">Aplicativo instalado</p>
                                    <p className="leading-relaxed text-emerald-700">
                                        Abra o Mimo pelo ícone na tela inicial. Ao entrar no aplicativo, você poderá ativar as notificações.
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-purple-600 text-xs font-bold text-white shadow-sm shadow-purple-600/20 transition-all hover:bg-purple-700 active:scale-[0.98]"
                        >
                            <Check size={16} strokeWidth={2.5} />
                            Continuar conversando
                        </button>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
