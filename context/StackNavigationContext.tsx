'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface StackScreen {
    type: 'chat' | 'profile';
    key: string;
    params: any;
    isClosing?: boolean;
}

interface StackNavigationContextType {
    screens: StackScreen[];
    pushVirtual: (type: 'chat' | 'profile', params: any) => void;
    popVirtual: () => void;
    isVirtualActive: boolean;
}

const StackNavigationContext = createContext<StackNavigationContextType | undefined>(undefined);

export function StackNavigationProvider({ children }: { children: React.ReactNode }) {
    const [screens, setScreens] = useState<StackScreen[]>([]);
    const screensRef = useRef<StackScreen[]>([]);

    // Sincroniza a ref para uso no event listener sem recriar o listener
    useEffect(() => {
        screensRef.current = screens;
    }, [screens]);

    const pushVirtual = (type: 'chat' | 'profile', params: any) => {
        const key = `${type}-${Date.now()}`;
        const newScreen: StackScreen = { type, key, params };

        // Define a URL silenciosamente
        let url = '';
        if (type === 'chat') {
            url = `/chat/${params.userId}`;
        } else if (type === 'profile') {
            url = `/${params.username}`;
        }

        if (url) {
            window.history.pushState({ isVirtual: true, key }, '', url);
        }

        setScreens((prev) => [...prev, newScreen]);
    };

    const popVirtual = () => {
        const currentScreens = screensRef.current;
        if (currentScreens.length === 0) return;

        // Inicia animação de saída da última tela
        const lastScreen = currentScreens[currentScreens.length - 1];
        
        setScreens((prev) =>
            prev.map((s) => (s.key === lastScreen.key ? { ...s, isClosing: true } : s))
        );

        // Remove a tela definitivamente após a duração da animação (250ms)
        setTimeout(() => {
            setScreens((prev) => prev.filter((s) => s.key !== lastScreen.key));
        }, 250);
    };

    // Escuta o evento de voltar do navegador (gesto ou botão de voltar do Android/iOS)
    useEffect(() => {
        const handlePopState = (e: PopStateEvent) => {
            const currentScreens = screensRef.current;
            if (currentScreens.length > 0) {
                // Se o popstate disparou e tínhamos telas virtuais, removemos a tela do topo
                // Não precisamos fazer pushState na URL pois o navegador já voltou a URL anterior
                popVirtual();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    const isVirtualActive = screens.length > 0;

    return (
        <StackNavigationContext.Provider value={{ screens, pushVirtual, popVirtual, isVirtualActive }}>
            {children}
        </StackNavigationContext.Provider>
    );
}

export function useStackNavigation() {
    const context = useContext(StackNavigationContext);
    if (context === undefined) {
        throw new Error('useStackNavigation must be used within a StackNavigationProvider');
    }
    return context;
}
