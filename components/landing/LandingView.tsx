'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    ShieldCheck,
    Lock,
    MessageCircle,
    ArrowRight,
    Zap,
    CheckCircle2,
    Crown,
    Flame,
} from 'lucide-react';
import { MediaUnlockSimulator } from './MediaUnlockSimulator';

interface LandingViewProps {
    authRedirectUrl?: string;
    ctaTrackingAttr?: boolean;
}

const CREATORS = [
    {
        name: 'Débora Silveira',
        age: 23,
        city: 'São Paulo',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        status: 'Online agora',
        badge: 'Responde em ~3 min',
    },
    {
        name: 'Camila Rocha',
        age: 22,
        city: 'Rio de Janeiro',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
        status: 'Online agora',
        badge: 'Responde em ~5 min',
    },
    {
        name: 'Larissa Mendonça',
        age: 25,
        city: 'Curitiba',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        status: 'Online agora',
        badge: 'Responde em ~8 min',
    },
    {
        name: 'Beatriz Lima',
        age: 24,
        city: 'Belo Horizonte',
        avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
        status: 'Online agora',
        badge: 'Responde em ~10 min',
    },
];

export function LandingView({
    authRedirectUrl = '/login',
    ctaTrackingAttr = false,
}: LandingViewProps) {
    const ctaProps = ctaTrackingAttr ? { 'data-campaign-cta': true } : {};

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-purple-600 selection:text-white">
            {/* Header minimalista estilo app */}
            <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/Logo.svg"
                            alt="MimoChat"
                            width={115}
                            height={30}
                            priority
                            className="h-7 w-auto object-contain"
                        />
                    </Link>
                </div>

                <Link
                    href={`${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`}
                    {...ctaProps}
                    className="h-8 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1"
                >
                    <span>Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </header>

            {/* Conteúdo Central Compacto */}
            <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
                {/* Hero Direto & Instigante */}
                <div className="text-center space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/70 text-purple-700 text-[11px] font-extrabold uppercase tracking-wider">
                        <Flame className="w-3.5 h-3.5 text-purple-600" />
                        <span>Conversas Privadas</span>
                        <span className="text-purple-300">•</span>
                        <span>Sem Robôs</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                        Papo íntimo e fotos exclusivas com <span className="text-purple-600">mulheres de verdade</span>.
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                        Como um aplicativo de conversa particular. Troque mensagens, áudios e veja mídias privadas sem assinaturas automáticas.
                    </p>

                    {/* Micro-benefícios de 1 linha */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] font-semibold text-slate-600">
                        <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            100% Pessoas Reais
                        </span>
                        <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-xs">
                            <Lock className="w-3 h-3 text-purple-600" />
                            Extrato Discreto no Pix
                        </span>
                        <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-xs">
                            <Zap className="w-3 h-3 text-amber-500" />
                            Sem Mensalidade Fixa
                        </span>
                    </div>
                </div>

                {/* Simulador de Desbloqueio Interativo (Coração da página) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                            Teste como funciona:
                        </span>
                        <span className="text-purple-600 font-semibold text-[11px]">
                            Toque para simular
                        </span>
                    </div>
                    <MediaUnlockSimulator redirectUrl={authRedirectUrl} />
                </div>

                {/* Vitrine Compacta de Criadoras no Estilo Stories/Tinder */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span>Criadoras online agora</span>
                        </div>
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ao vivo
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        {CREATORS.map((creator, i) => (
                            <Link
                                key={i}
                                href={`${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`}
                                {...ctaProps}
                                className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs hover:border-purple-300 transition-all flex flex-col"
                            >
                                <div className="relative aspect-[4/5] w-full bg-slate-100 overflow-hidden">
                                    <Image
                                        src={creator.avatar}
                                        alt={creator.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                    
                                    {/* Tag superior */}
                                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[9px] font-bold">
                                        {creator.city}
                                    </span>

                                    {/* Info no rodapé da foto */}
                                    <div className="absolute bottom-2 left-2 right-2 text-white">
                                        <div className="flex items-center gap-1">
                                            <span className="font-extrabold text-xs leading-tight">
                                                {creator.name}, {creator.age}
                                            </span>
                                            <ShieldCheck className="w-3 h-3 text-purple-400 shrink-0" />
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-semibold mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            <span>{creator.badge}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2 text-center bg-white border-t border-slate-100">
                                    <span className="text-xs font-bold text-purple-600 group-hover:text-purple-700 flex items-center justify-center gap-1">
                                        <MessageCircle className="w-3 h-3" />
                                        <span>Conversar</span>
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Card Educativo Curto (Alinha a expectativa sem textão) */}
                <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-700">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Como funciona o papo?</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                        Você escolhe a criadora e conversa direto no privado. Como são mulheres reais na rotina delas, cada uma responde no seu tempo (geralmente em poucos minutos). Você recebe aviso no celular quando ela responder.
                    </p>
                </div>

                {/* Botão de Ação Principal */}
                <div className="space-y-2 pt-1 pb-4">
                    <Link
                        href={`${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`}
                        {...ctaProps}
                        className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        <span>Entrar e Ver Todas as Criadoras</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    <p className="text-[10px] text-center text-slate-600">
                        Acesso 100% discreto • Sem mensalidade • Para maiores de 18 anos
                    </p>
                </div>
            </main>

            {/* Footer Compacto */}
            <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 px-4 text-center text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center justify-center gap-3 font-medium">
                    <Link href="/termos-de-uso" className="hover:text-slate-900">Termos</Link>
                    <span>•</span>
                    <Link href="/politica-de-privacidade" className="hover:text-slate-900">Privacidade</Link>
                    <span>•</span>
                    <Link href="/ajuda" className="hover:text-slate-900">Ajuda</Link>
                </div>
                <p>© MimoChat • Todos os direitos reservados</p>
            </footer>
        </div>
    );
}
