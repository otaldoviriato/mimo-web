'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PWAContextType {
    isInstallable: boolean;
    isIOS: boolean;
    isStandalone: boolean;
    mounted: boolean;
    promptInstall: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function PWAProvider({ children }: { children: React.ReactNode }) {
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        setMounted(true);

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
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(!!standalone);

        const handleBeforeInstallPrompt = (e: any) => {
            console.log('Evento beforeinstallprompt disparado');
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Mostramos o banner "sempre" se não estiver instalado, 
        // mesmo que o prompt automático não tenha disparado ainda.
        if (!standalone) {
            setIsInstallable(true);
        } else {
            setIsInstallable(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const promptInstall = async () => {
        if (isIOS) {
            alert('Para instalar no iPhone: clique no ícone de compartilhamento (quadrado com seta para cima) e escolha "Adicionar à Tela de Início".');
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstallable(false);
                setDeferredPrompt(null);
            }
        } else {
            // Instrução manual para Desktop ou navegadores que não suportam prompt automático
            alert('Para instalar: procure o ícone de instalação na barra de endereços (geralmente um computador com uma seta) ou vá no menu do navegador e selecione "Instalar Mimo".');
        }
    };

    return (
        <PWAContext.Provider value={{ isInstallable, isIOS, isStandalone, mounted, promptInstall }}>
            {children}
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
