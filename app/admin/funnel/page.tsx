'use client';

import React from 'react';
import { Filter, TrendingUp, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminFunnelPage() {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                        <Filter size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Funil de Conversão</h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Métricas e acompanhamento de etapas de aquisição e conversão da plataforma.
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                    <TrendingUp size={28} />
                </div>
                <div className="max-w-md space-y-1.5">
                    <h2 className="text-base font-bold text-slate-800">Módulo de Funil</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        A visualização analítica detalhada das etapas de conversão e comportamento dos leads será integrada aqui.
                    </p>
                </div>
                <Link
                    href="/admin/campaigns"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                    Ver Métricas de Campanhas
                    <ArrowRight size={14} />
                </Link>
            </div>
        </div>
    );
}
