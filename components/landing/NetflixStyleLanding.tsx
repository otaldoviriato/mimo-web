'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface NetflixStyleLandingProps {
    authRedirectUrl?: string;
    ctaTrackingAttr?: boolean;
}

// Perfis modelo que replicam exatamente o design dos cards do Explorar do MimoChat
const BACKGROUND_PROFILES = [
    {
        name: 'Gabriely Fernandes, 19',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        badge: 'Ativa hoje',
        badgeType: 'today',
    },
    {
        name: 'Fernanda, 24',
        image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
        badge: 'Ativa hoje',
        badgeType: 'today',
    },
    {
        name: 'Larissa Marques, 22',
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        badge: 'Online',
        badgeType: 'online',
    },
    {
        name: 'Andressa, 26',
        image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
        badge: 'Há 1d',
        badgeType: 'recent',
    },
    {
        name: 'Camila Rocha, 21',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        badge: 'Ativa hoje',
        badgeType: 'today',
    },
    {
        name: 'Beatriz Lima, 25',
        image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80',
        badge: 'Online',
        badgeType: 'online',
    },
    {
        name: 'Mariana Silva, 23',
        image: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=400&q=80',
        badge: 'Ativa hoje',
        badgeType: 'today',
    },
    {
        name: 'Juliana Paes, 27',
        image: 'https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=400&q=80',
        badge: 'Ativa hoje',
        badgeType: 'today',
    },
    {
        name: 'Rafaela Santos, 22',
        image: 'https://images.unsplash.com/photo-1526080652727-5b77f74eacd2?auto=format&fit=crop&w=400&q=80',
        badge: 'Há 2d',
        badgeType: 'recent',
    },
    {
        name: 'Letícia Mendonça, 24',
        image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80',
        badge: 'Ativa hoje',
        badgeType: 'today',
    },
    {
        name: 'Débora Silveira, 23',
        image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
        badge: 'Online',
        badgeType: 'online',
    },
    {
        name: 'Carolina Dias, 25',
        image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        badge: 'Ativa hoje',
        badgeType: 'today',
    },
];

export function NetflixStyleLanding({
    authRedirectUrl = '/login',
    ctaTrackingAttr = false,
}: NetflixStyleLandingProps) {
    const ctaProps = ctaTrackingAttr ? { 'data-campaign-cta': true } : {};
    const destinationUrl = `${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`;

    return (
        <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between overflow-hidden selection:bg-purple-600 selection:text-white">
            {/* ─── PAREDE DE PERFIS NO FUNDO (ESTILO NETFLIX / EXPLORAR MIMO) ─── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 p-3 sm:p-5 opacity-80 sm:opacity-85 scale-105 transform -translate-y-2">
                    {BACKGROUND_PROFILES.map((profile, i) => (
                        <div
                            key={i}
                            className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100"
                        >
                            {/* Imagem do Card */}
                            <Image
                                src={profile.image}
                                alt={profile.name}
                                fill
                                priority={i < 6}
                                className="object-cover"
                            />

                            {/* Gradiente escuro inferior idêntico ao Explorar */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                            {/* Badge superior direito */}
                            {profile.badgeType === 'today' && (
                                <div className="absolute top-2 right-2 bg-white/95 text-purple-700 border border-purple-100 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                                    <span>{profile.badge}</span>
                                </div>
                            )}

                            {profile.badgeType === 'online' && (
                                <div className="absolute top-2 right-2 bg-white text-emerald-600 border border-emerald-100 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                                    <span>Online</span>
                                </div>
                            )}

                            {profile.badgeType === 'recent' && (
                                <div className="absolute top-2 right-2 bg-black/45 text-white/90 border border-white/10 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                                    <span>{profile.badge}</span>
                                </div>
                            )}

                            {/* Nome e Idade inferior */}
                            <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 text-white">
                                <h4 className="text-xs sm:text-sm font-black tracking-tight leading-tight truncate drop-shadow-sm">
                                    {profile.name}
                                </h4>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ─── OVERLAY SUAVE DIRECIONAL (Lado esquerdo translúcido para leitura, lado direito aberto para ver as fotos) ─── */}
                <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-white/95 via-white/80 to-white/30 backdrop-blur-[1px]" />
            </div>

            {/* ─── HEADER MINIMALISTA ─── */}
            <header className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/Logo.svg"
                            alt="MimoChat"
                            width={135}
                            height={36}
                            priority
                            className="h-8 w-auto object-contain"
                        />
                    </Link>
                </div>

                <Link
                    href={destinationUrl}
                    {...ctaProps}
                    className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-purple-600/20 flex items-center gap-1.5"
                >
                    <span>Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </header>

            {/* ─── CONTEÚDO ALINHADO À ESQUERDA (IMPACTO DIRETO) ─── */}
            <main className="relative z-20 flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-7xl mx-auto w-full my-auto py-12">
                <div className="max-w-xl text-left space-y-6">
                    {/* Badge Sutil de Autenticidade */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100/90 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span>Perfis Verificados</span>
                    </div>

                    {/* Título Principal Marcante */}
                    <div className="space-y-1 text-left">
                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.08]">
                            Conversas Privadas.
                        </h1>
                        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 tracking-tight leading-[1.08]">
                            Mulheres Reais.
                        </h2>
                    </div>

                    {/* Subtítulo de 1 Linha */}
                    <p className="text-base sm:text-xl text-slate-600 leading-relaxed font-medium">
                        Fotos exclusivas e mensagens diretas no privado. Sem mensalidade fixa.
                    </p>

                    {/* Botão de Chamada para Ação Alinhado à Esquerda */}
                    <div className="pt-2 max-w-sm space-y-2.5 text-left">
                        <Link
                            href={destinationUrl}
                            {...ctaProps}
                            className="w-full sm:w-auto h-14 sm:h-16 px-10 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-black text-base sm:text-lg uppercase tracking-wider shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center gap-2.5 group"
                        >
                            <span>Ver Perfis</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <p className="text-xs text-slate-500 font-semibold">
                            100% discreto • Acesso para maiores de 18 anos
                        </p>
                    </div>
                </div>
            </main>

            {/* ─── RODAPÉ MINIMALISTA ─── */}
            <footer className="relative z-20 w-full py-4 px-6 sm:px-12 lg:px-16 text-xs text-slate-500 border-t border-slate-200/60 bg-white/40 backdrop-blur-xs">
                <div className="max-w-7xl mx-auto flex items-center justify-start gap-4 font-medium">
                    <Link href="/termos-de-uso" className="hover:text-slate-900 transition-colors">Termos</Link>
                    <span>•</span>
                    <Link href="/politica-de-privacidade" className="hover:text-slate-900 transition-colors">Privacidade</Link>
                    <span>•</span>
                    <Link href="/ajuda" className="hover:text-slate-900 transition-colors">Ajuda</Link>
                </div>
            </footer>
        </div>
    );
}
