'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { WalletStatement, type WalletStatementData } from '@/components/wallet/WalletStatement';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';

export default function WalletStatementPage() {
    const router = useTransitionRouter();
    const [showValues, setShowValues] = useState(() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem('mimo_show_wallet_values') !== 'false';
    });
    const { data, isLoading } = useQuery<WalletStatementData>({
        queryKey: ['wallet', 'sessions'],
        queryFn: async () => {
            const response = await fetch('/api/users/me/wallet-sessions');
            if (!response.ok) throw new Error('Falha ao buscar o extrato da carteira');
            return response.json();
        },
        staleTime: 30 * 1000,
        refetchInterval: 30 * 1000,
    });

    const toggleValues = () => {
        setShowValues(current => {
            const next = !current;
            localStorage.setItem('mimo_show_wallet_values', String(next));
            return next;
        });
    };

    return (
        <main className="h-full overflow-y-auto bg-slate-50 pb-28 md:pb-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
                <header className="flex items-center justify-between rounded-2xl border border-purple-100/60 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                            aria-label="Voltar para a carteira"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-wider text-slate-800">Extrato da carteira</h1>
                            <p className="mt-0.5 text-[10px] font-medium text-slate-400">Acompanhe como seus ganhos formam o saldo.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={toggleValues}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-purple-500 transition-colors hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                        aria-label={showValues ? 'Ocultar valores' : 'Mostrar valores'}
                    >
                        {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                </header>

                {isLoading && !data ? (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-purple-100/60 bg-white py-16 text-xs font-bold text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        Carregando extrato...
                    </div>
                ) : (
                    <WalletStatement data={data} isLoading={isLoading} showValues={showValues} />
                )}
            </div>
        </main>
    );
}
