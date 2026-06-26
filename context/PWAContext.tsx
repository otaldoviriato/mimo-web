'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { InstallPWAModal, type InstallModalType } from '@/components/InstallPWAModal';

interface PWAContextType {
    isInstallable: boolean;
    isIOS: boolean;
    isStandalone: boolean;
    mounted: boolean;
    promptInstall: () => Promise<void>;
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

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // iOS: sempre mostramos o botão (instrução manual via Safari)
        // Android/Desktop: isInstallable é ativado apenas quando beforeinstallprompt dispara
        if (standalone) {
            setIsInstallable(false);
        } else if (ios) {
            setIsInstallable(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            document.removeEventListener('touchstart', preventZoom);
            document.removeEventListener('gesturestart', preventGesture);
            document.removeEventListener('gesturechange', preventGesture);
        };
    }, []);

    const promptInstall = async () => {
        if (isIOS) {
            setInstallModal('ios');
            return;
        }

        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                setDeferredPrompt(null);
                if (outcome === 'accepted') {
                    setIsInstallable(false);
                }
            } catch {
                // Prompt já consumido ou inválido; mostra modal de indisponibilidade
                setDeferredPrompt(null);
                setInstallModal('unavailable');
            }
        } else {
            setInstallModal('unavailable');
        }
    };

    return (
        <PWAContext.Provider value={{ isInstallable, isIOS, isStandalone, mounted, promptInstall }}>
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
