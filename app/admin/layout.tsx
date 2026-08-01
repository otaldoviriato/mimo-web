'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/admin/Sidebar';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { AdminSettingsProvider, useAdminContext } from '@/context/AdminSettingsContext';
import { Sliders, Lock, ArrowLeft } from 'lucide-react';

const PATH_TITLES: Record<string, string> = {
    '/admin': 'Painel Geral',
    '/admin/clients': 'Gerenciamento de Clientes',
    '/admin/professionals': 'Gerenciamento de Profissionais',
    '/admin/identity-verifications': 'Verificações de Selos de Autenticidade',
    '/admin/rooms': 'Auditoria de Conversas',
    '/admin/financial': 'Movimentações Financeiras',
    '/admin/help-tickets': 'Tickets de Ajuda',
    '/admin/institutional-emails': 'E-mails Institucionais',
    '/admin/settings/platform': 'Configurações — Plataforma & Operação',
    '/admin/settings/alerts': 'Configurações — Alertas do Admin',
    '/admin/settings/chat': 'Configurações — Chat & Sessões',
    '/admin/settings/explore': 'Configurações — Explorar & Algoritmo',
    '/admin/settings/pricing': 'Configurações — Precificação & Assinaturas',
    '/admin/settings/profiles': 'Configurações — Perfis & Galeria',
    '/admin/settings/payments': 'Configurações — Meios de Pagamento',
    '/admin/settings/app': 'Configurações — App & Experiência',
    '/admin/settings/admins': 'Configurações — Administradores',
    '/admin/settings/levels': 'Configurações — Faixas & Medalhas',
};

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { settings, isLoaded, isSignedIn, userId } = useAdminContext();
    const { isAuthorized, loadingSettings } = settings;

    const title = PATH_TITLES[pathname] ?? 'MimoAdmin';
    const isSettingsTab = pathname.startsWith('/admin/settings');

    if (!isLoaded || loadingSettings) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-linear-to-br from-[#4C1D95] via-[#6D28D9] to-[#8B5CF6]">
                <div className="flex flex-col items-center animate-pulse">
                    <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center border border-white/20 shadow-2xl mb-4">
                        <Sliders size={40} className="text-white animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                    <h2 className="text-white text-xl font-bold tracking-wide">MimoAdmin</h2>
                    <p className="text-purple-200 text-xs mt-1 font-medium">Validando credenciais do painel...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6">
                <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6 animate-fade-in-up">
                    <div className="w-20 h-20 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shadow-xl shadow-rose-950/10">
                        <Lock size={38} className="stroke-[1.8]" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-white text-2xl font-black tracking-tight">Acesso Restrito</h2>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Esta é uma área restrita exclusiva para administradores do MimoChat. Sua conta atual não possui permissões administrativas.
                        </p>
                    </div>
                    {userId && (
                        <div className="bg-slate-900/60 border border-slate-800/80 px-4 py-3 rounded-xl w-full text-left space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Seu Clerk ID</span>
                            <code className="text-xs text-purple-400 font-mono font-bold break-all block">{userId}</code>
                        </div>
                    )}
                    <div className="w-full pt-2 flex flex-col gap-3">
                        <button onClick={() => router.replace('/')} className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-600/10 cursor-pointer">
                            <ArrowLeft size={16} />
                            Voltar ao MimoChat
                        </button>
                        {!isSignedIn && (
                            <button onClick={() => router.push('/login')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl transition-all border border-slate-700 cursor-pointer">
                                Entrar com outra conta
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-slate-50 min-h-screen font-sans selection:bg-purple-100 selection:text-purple-900 relative">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                <DashboardHeader title={title} onMenuToggle={() => setIsSidebarOpen(true)} />

                <main className={`flex-1 overflow-y-auto max-w-7xl w-full mx-auto ${isSettingsTab ? 'p-4 md:p-8' : 'p-4 md:p-8 space-y-4 md:space-y-8'}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminSettingsProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminSettingsProvider>
    );
}
