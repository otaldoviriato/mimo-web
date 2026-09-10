'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { InstallPWAModal, type InstallModalType } from '@/components/InstallPWAModal';

interface PWAContextType {
    isInstallable: boolean;
    isIOS: boolean;
    isStandalone: boolean;
    isInstalled: boolean;
    mounted: boolean;
    hasDeferredPrompt: boolean;
    promptInstall: () => Promise<'accepted' | 'dismissed' | null>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installModal, setInstallModal] = useState<InstallModalType | null>(null);

    useEffect(() => {
        setTimeout(() => setMounted(true), 0);

        // Prevenir zoom por pinça (pinch-to-zoom) no iOS/Android
        const preventZoom = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        // Evento de gesto específico do Safari no iOS
        const preventGesture = (e: Event) => {
            e.preventDefault();
        };

        document.addEventListener('touchstart', preventZoom, { passive: false });
        document.addEventListener('gesturestart', preventGesture);
        document.addEventListener('gesturechange', preventGesture);

        // Registra o Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js')
                .then(reg => console.log('SW registrado com sucesso:', reg.scope))
                .catch(err => console.error('Erro ao registrar SW:', err));
        }

        // Detecta iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        // Detecta se já está instalado
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any as { standalone?: boolean }).standalone;
        setIsStandalone(!!standalone);

        const handleBeforeInstallPrompt = (e: Event) => {
            // Impede a mini-infobar automática do Chrome para controlar o momento exato
            // em que o diálogo aparece. Sem isso, o Chrome consome o evento antes que o
            // usuário toque em "Instalar", invalidando o deferredPrompt.
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            if (!ios) setIsInstallable(true);
        };

        // Dispara quando o Chrome confirma que o app foi instalado com sucesso
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            setIsInstallable(false);
            // Sinaliza para o modal que pode agir após a instalação
            window.dispatchEvent(new CustomEvent('pwa_app_installed'));
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // O botão de instalar aparece sempre — o comportamento ao clicar é que varia:
        // standalone → alerta de "já instalado" | ios → modal de passos | sem prompt → modal de indisponível
        setIsInstallable(true);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            document.removeEventListener('touchstart', preventZoom);
            document.removeEventListener('gesturestart', preventGesture);
            document.removeEventListener('gesturechange', preventGesture);
        };
    }, []);

    const promptInstall = async (): Promise<'accepted' | 'dismissed' | null> => {
        if (isStandalone) {
            alert('O Mimo já está instalado neste dispositivo.');
            return null;
        }

        if (isIOS) {
            setInstallModal('ios');
            return null;
        }

        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                setDeferredPrompt(null);
                if (outcome === 'accepted') {
                    setIsInstallable(false);
                }
                return outcome;
            } catch {
                // Prompt já consumido ou inválido; mostra modal de indisponibilidade
                setDeferredPrompt(null);
                setInstallModal('unavailable');
                return null;
            }
        } else {
            setInstallModal('unavailable');
            return null;
        }
    };

    return (
        <PWAContext.Provider value={{ isInstallable, isIOS, isStandalone, isInstalled, mounted, hasDeferredPrompt: deferredPrompt !== null, promptInstall }}>
            {children}
            {installModal && (
                <InstallPWAModal type={installModal} onClose={() => setInstallModal(null)} />
            )}
        </PWAContext.Provider>
    );
}

export function usePWA() {
    const context = useContext(PWAContext);
    if (context === undefined) {
        throw new Error('usePWA must be used within a PWAProvider');
    }
    return context;
}
