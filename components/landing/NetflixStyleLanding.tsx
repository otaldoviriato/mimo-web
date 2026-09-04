'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowRight,
} from 'lucide-react';

interface NetflixStyleLandingProps {
    authRedirectUrl?: string;
    ctaTrackingAttr?: boolean;
}

interface ProfileItem {
    name: string;
    image: string;
    badge: string;
    badgeType: 'today' | 'online' | 'recent';
}

const COL_1: ProfileItem[] = [
    { name: 'Gabriely Fernandes, 19', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Fernanda, 24', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80', badge: 'Online', badgeType: 'online' },
    { name: 'Larissa Marques, 22', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Andressa, 26', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80', badge: 'Há 1d', badgeType: 'recent' },
];

const COL_2: ProfileItem[] = [
    { name: 'Camila Rocha, 21', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', badge: 'Online', badgeType: 'online' },
    { name: 'Beatriz Lima, 25', image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Mariana Silva, 23', image: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Juliana Paes, 27', image: 'https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=400&q=80', badge: 'Há 2d', badgeType: 'recent' },
];

const COL_3: ProfileItem[] = [
    { name: 'Rafaela Santos, 22', image: 'https://images.unsplash.com/photo-1526080652727-5b77f74eacd2?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Letícia Mendonça, 24', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80', badge: 'Online', badgeType: 'online' },
    { name: 'Débora Silveira, 23', image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Carolina Dias, 25', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
];

const COL_4: ProfileItem[] = [
    { name: 'Vanessa Lima, 23', image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=400&q=80', badge: 'Online', badgeType: 'online' },
    { name: 'Isabela Costa, 26', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Nicole Rocha, 20', image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Bruna Alves, 24', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', badge: 'Há 1d', badgeType: 'recent' },
];

const COL_5: ProfileItem[] = [
    { name: 'Amanda Vieira, 22', image: 'https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Thais Ribeiro, 25', image: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=400&q=80', badge: 'Online', badgeType: 'online' },
    { name: 'Jessica Torres, 23', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Priscila Ramos, 26', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', badge: 'Há 2d', badgeType: 'recent' },
];

const COL_6: ProfileItem[] = [
    { name: 'Luana Martins, 24', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80', badge: 'Online', badgeType: 'online' },
    { name: 'Natalia Melo, 21', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Bianca Farias, 25', image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80', badge: 'Ativa hoje', badgeType: 'today' },
    { name: 'Marcela Fontes, 23', image: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=400&q=80', badge: 'Há 1d', badgeType: 'recent' },
];

function ProfileCard({ profile }: { profile: ProfileItem }) {
    return (
        <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-md border border-slate-200/90 bg-slate-100 select-none">
            <Image
                src={profile.image}
                alt={profile.name}
                fill
                sizes="(max-width: 640px) 140px, 200px"
                className="object-cover"
            />
            {/* Gradiente escuro inferior idêntico ao Explorar */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Nome e Idade inferior */}
            <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 text-white">
                <h4 className="text-xs sm:text-sm font-black tracking-tight leading-tight truncate drop-shadow-sm">
                    {profile.name}
                </h4>
            </div>
        </div>
    );
}

export function NetflixStyleLanding({
    authRedirectUrl = '/login',
    ctaTrackingAttr = false,
}: NetflixStyleLandingProps) {
    const ctaProps = ctaTrackingAttr ? { 'data-campaign-cta': true } : {};
    const destinationUrl = `${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`;

    return (
        <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between overflow-hidden selection:bg-purple-600 selection:text-white">
            {/* Animação suave e desacelerada (60 FPS com aceleração GPU) */}
            <style>{`
                @keyframes slowMarquee {
                    0% {
                        transform: translate3d(0, 0, 0);
                    }
                    100% {
                        transform: translate3d(0, -50%, 0);
                    }
                }
                .slide-col-1 {
                    animation: slowMarquee 78s linear infinite;
                    will-change: transform;
                }
                .slide-col-2 {
                    animation: slowMarquee 65s linear infinite;
                    will-change: transform;
                }
                .slide-col-3 {
                    animation: slowMarquee 88s linear infinite;
                    will-change: transform;
                }
                .slide-col-4 {
                    animation: slowMarquee 72s linear infinite;
                    will-change: transform;
                }
                .slide-col-5 {
                    animation: slowMarquee 82s linear infinite;
                    will-change: transform;
                }
                .slide-col-6 {
                    animation: slowMarquee 68s linear infinite;
                    will-change: transform;
                }
            `}</style>

            {/* ─── PAREDE DE PERFIS: COBERTURA TOTAL SEM BORDAS VAZIAS (-6deg) ─── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
                {/* Contêiner amplo escalado cobrindo 100% dos cantos */}
                <div
                    className="flex gap-3.5 sm:gap-4.5 w-[190vw] sm:w-[170vw] shrink-0 justify-center opacity-85 sm:opacity-90"
                    style={{
                        transform: 'rotate(-6deg) scale(1.4)',
                        transformOrigin: 'center center',
                    }}
                >
                    {/* Coluna 1 */}
                    <div className="flex flex-col gap-3.5 sm:gap-4.5 w-[140px] sm:w-[180px] md:w-[200px] shrink-0 slide-col-1">
                        {[...COL_1, ...COL_1].map((p, i) => (
                            <ProfileCard key={`col1-${i}`} profile={p} />
                        ))}
                    </div>

                    {/* Coluna 2 */}
                    <div className="flex flex-col gap-3.5 sm:gap-4.5 w-[140px] sm:w-[180px] md:w-[200px] shrink-0 slide-col-2 pt-10">
                        {[...COL_2, ...COL_2].map((p, i) => (
                            <ProfileCard key={`col2-${i}`} profile={p} />
                        ))}
                    </div>

                    {/* Coluna 3 */}
                    <div className="flex flex-col gap-3.5 sm:gap-4.5 w-[140px] sm:w-[180px] md:w-[200px] shrink-0 slide-col-3">
                        {[...COL_3, ...COL_3].map((p, i) => (
                            <ProfileCard key={`col3-${i}`} profile={p} />
                        ))}
                    </div>

                    {/* Coluna 4 */}
                    <div className="flex flex-col gap-3.5 sm:gap-4.5 w-[140px] sm:w-[180px] md:w-[200px] shrink-0 slide-col-4 pt-14">
                        {[...COL_4, ...COL_4].map((p, i) => (
                            <ProfileCard key={`col4-${i}`} profile={p} />
                        ))}
                    </div>

                    {/* Coluna 5 */}
                    <div className="flex flex-col gap-3.5 sm:gap-4.5 w-[140px] sm:w-[180px] md:w-[200px] shrink-0 slide-col-5">
                        {[...COL_5, ...COL_5].map((p, i) => (
                            <ProfileCard key={`col5-${i}`} profile={p} />
                        ))}
                    </div>

                    {/* Coluna 6 */}
                    <div className="flex flex-col gap-3.5 sm:gap-4.5 w-[140px] sm:w-[180px] md:w-[200px] shrink-0 slide-col-6 pt-12">
                        {[...COL_6, ...COL_6].map((p, i) => (
                            <ProfileCard key={`col6-${i}`} profile={p} />
                        ))}
                    </div>
                </div>

                {/* ─── OVERLAY GRADIENTE: Proteção de leitura sólida no mobile, aberta à direita no desktop ─── */}
                <div className="absolute inset-0 bg-white/88 sm:bg-transparent sm:bg-gradient-to-r sm:from-white/95 sm:via-white/80 sm:to-white/25 backdrop-blur-[2px] sm:backdrop-blur-[1px]" />
            </div>

            {/* ─── HEADER MINIMALISTA ─── */}
            <header className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-12 lg:px-16 py-3.5 sm:py-5 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-xs">
                        <Image
                            src="/Logo.svg"
                            alt="Mimo"
                            width={18}
                            height={18}
                            priority
                            className="w-4.5 h-4.5 object-contain"
                        />
                    </div>
                    <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900">MimoChat</span>
                </Link>

                <Link
                    href={destinationUrl}
                    {...ctaProps}
                    className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-purple-600/20 flex items-center gap-1.5"
                >
                    <span>Entrar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </header>

            {/* ─── CONTEÚDO: ULTRA DIRETO, ENXUTO E 100% RESPONSIVO ─── */}
            <main className="relative z-20 flex-1 flex flex-col justify-center px-5 sm:px-12 lg:px-16 max-w-7xl mx-auto w-full py-8 sm:my-auto sm:py-12">
                <div className="w-full max-w-xl mx-auto sm:mx-0 text-center sm:text-left space-y-5 sm:space-y-6">
                    {/* Título Principal de Impacto: Escala Perfeita em Telas Pequenas */}
                    <h1 className="text-[2.65rem] sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-[-0.035em] leading-[0.98] sm:leading-[1.05]">
                        <span className="block">Conversas Privadas.</span>
                        <span className="mt-1.5 block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600">
                            Mulheres Reais.
                        </span>
                    </h1>

                    {/* Proposta direta, sem promessa de resposta ou imediatismo */}
                    <p className="text-base sm:text-lg lg:text-xl text-slate-700 font-bold leading-snug">
                        Converse sem precisar dar match.
                    </p>

                    {/* Botão de Chamada para Ação */}
                    <div className="pt-1 sm:pt-2 max-w-sm mx-auto sm:mx-0 space-y-2.5 text-center sm:text-left">
                        <Link
                            href={destinationUrl}
                            {...ctaProps}
                            className="w-full sm:w-auto h-13 sm:h-16 px-7 sm:px-10 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-black text-base sm:text-lg uppercase tracking-wider shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2.5 group"
                        >
                            <span>Conhecer Mulheres</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                            100% discreto • Sem mensalidade • +18
                        </p>
                    </div>
                </div>
            </main>

            {/* ─── RODAPÉ MINIMALISTA ─── */}
            <footer className="relative z-20 w-full py-3 sm:py-4 px-5 sm:px-12 lg:px-16 text-[11px] sm:text-xs text-slate-500 border-t border-slate-200/60 bg-white/60 backdrop-blur-xs">
                <div className="max-w-7xl mx-auto flex items-center justify-center sm:justify-start gap-4 font-medium">
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
