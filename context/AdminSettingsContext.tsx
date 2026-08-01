'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { useSettings, type UseSettingsReturn } from '@/hooks/admin/useSettings';

interface AdminContextValue {
    settings: UseSettingsReturn;
    isLoaded: boolean;
    isSignedIn: boolean | undefined;
    userId: string | null | undefined;
    dashboardData: any;
    loadingDashboard: boolean;
    fetchDashboard: () => Promise<void>;
    handleDeleteTransaction: (id: string, displayId: string) => Promise<void>;
}

const AdminSettingsContext = createContext<AdminContextValue | null>(null);

export function AdminSettingsProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const settings = useSettings(isLoaded, isSignedIn, userId);
    const { isAuthorized } = settings;

    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);

    const fetchDashboard = useCallback(async () => {
        setLoadingDashboard(true);
        try {
            const res = await fetch('/api/admin/dashboard');
            if (res.ok) setDashboardData(await res.json());
            else toast.error('Erro ao carregar métricas do dashboard.');
        } catch {
            toast.error('Erro de conexão com o servidor.');
        } finally {
            setLoadingDashboard(false);
        }
    }, []);

    const handleDeleteTransaction = useCallback(async (id: string, displayId: string) => {
        if (!window.confirm(`ATENÇÃO: Deseja realmente excluir permanentemente a transação "${displayId}"?\nEsta ação removerá de forma definitiva o registro contábil e não pode ser desfeita.`)) return;
        try {
            const res = await fetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Transação excluída com sucesso!', {
                    style: { borderRadius: '12px', background: '#1E293B', color: '#FFF', fontWeight: 600 }
                });
                fetchDashboard();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Erro ao excluir transação.');
            }
        } catch {
            toast.error('Erro de conexão com o servidor.');
        }
    }, [fetchDashboard]);

    useEffect(() => {
        if (isAuthorized) {
            fetchDashboard();
        }
    }, [isAuthorized, fetchDashboard]);

    return (
        <AdminSettingsContext.Provider value={{
            settings,
            isLoaded,
            isSignedIn,
            userId,
            dashboardData,
            loadingDashboard,
            fetchDashboard,
            handleDeleteTransaction,
        }}>
            {children}
        </AdminSettingsContext.Provider>
    );
}

export function useAdminContext() {
    const context = useContext(AdminSettingsContext);
    if (!context) {
        throw new Error('useAdminContext must be used within an AdminSettingsProvider');
    }
    return context;
}
