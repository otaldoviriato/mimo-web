'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Lock,
    Unlock,
    ShieldCheck,
    ArrowRight,
    Zap,
    Gift,
    CheckCircle2,
    Eye,
    MessageCircle,
    Play,
    Flame,
    Volume2,
} from 'lucide-react';

interface AdultExoclickLandingProps {
    authRedirectUrl?: string;
    ctaTrackingAttr?: boolean;
}

interface CreatorProfile {
    name: string;
    age: number;
    city: string;
    image: string;
    tags: string[];
    onlineTime: string;
}

const CREATORS_LIST: CreatorProfile[] = [
    {
        name: 'Letícia',
        age: 22,
        city: 'São Paulo',
        image: '/assets/banner-model-hero.png',
        tags: ['Troca nudes', 'Mídias HD', 'Online agora'],
        onlineTime: 'Ativa agora',
    },
    {
        name: 'Fernanda',
        age: 24,
        city: 'Rio de Janeiro',
        image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=85',
        tags: ['Envia vídeos', 'Áudio safado', 'Responde rápido'],
        onlineTime: 'Há 2 min',
    },
    {
        name: 'Larissa',
        age: 22,
        city: 'Curitiba',
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=85',
        tags: ['Fotos privadas', 'Sem tabus', 'Top criadora'],
        onlineTime: 'Ativa agora',
    },
    {
        name: 'Andressa',
        age: 25,
        city: 'Belo Horizonte',
        image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=85',
        tags: ['Vídeos no banho', 'Troca fotos', 'Conversa íntima'],
        onlineTime: 'Há 5 min',
    },
    {
        name: 'Camila',
        age: 21,
        city: 'Porto Alegre',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=85',
        tags: ['Novinha', 'Manda nudes', 'Online agora'],
        onlineTime: 'Ativa agora',
    },
    {
        name: 'Beatriz',
        age: 23,
        city: 'Florianópolis',
        image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=85',
        tags: ['Lingerie', 'Chamada privativa', 'Mídias quentes'],
        onlineTime: 'Ativa agora',
    },
];

export function AdultExoclickLanding({
    authRedirectUrl = '/login',
    ctaTrackingAttr = true,
}: AdultExoclickLandingProps) {
    const [isMediaUnlocked, setIsMediaUnlocked] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);

    const ctaProps = ctaTrackingAttr ? { 'data-campaign-cta': true } : {};
    const destinationUrl = `${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`;

    const handlePreviewUnlock = () => {
        setIsUnlocking(true);
        setTimeout(() => {
            setIsUnlocking(false);
            setIsMediaUnlocked(true);
        }, 500);
    };

    return (
        <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
            {/* ─── TOPO / HEADER ─── */}
            <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-xs">
                            <Image
                                src="/Logo.svg"
                                alt="MimoChat"
                                width={18}
                                height={18}
                                priority
                                className="w-4.5 h-4.5 object-contain"
                            />
                        </div>
                        <span className="font-black text-xl tracking-tight text-slate-900">
                            MimoChat
                        </span>
                    </Link>

                    {/* Status Ao Vivo */}
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs font-bold text-emerald-800 shadow-xs">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span>348 Mulheres Reais Online</span>
                        </div>

                        <Link
                            href={destinationUrl}
                            {...ctaProps}
                            className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <span>Entrar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* ─── HERO SECTION: CONGRUÊNCIA TOTAL COM O BANNER ─── */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    
                    {/* COLUNA ESQUERDA: APELO DIRETO, INSTINTIVO E SEM FREIO */}
                    <div className="lg:col-span-7 space-y-6 text-left">
                        {/* Tag de Apelo Direto */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black uppercase tracking-wider shadow-xs">
                            <Flame className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                            <span>100% Mulheres Reais • Sem Robôs</span>
                        </div>

                        {/* Título Oficial Idêntico ao Banner */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.05]">
                            Troque nudes com{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 block sm:inline">
                                mulheres reais
                            </span>
                        </h1>

                        {/* Subtexto Direto */}
                        <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed max-w-xl">
                            Entre no chat privado sem censura. Converse em tempo real, veja fotos e vídeos exclusivos e peça mídias personalizadas diretamente para elas.
                        </p>

                        {/* Card Destacado de Bônus de Boas-Vindas */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-purple-50/70 to-indigo-50/50 border border-purple-200/90 shadow-xs flex items-start gap-3.5 max-w-xl">
                            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Gift className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-xs font-black text-purple-900 uppercase tracking-wide flex items-center gap-1.5">
                                    <span>Bônus de Boas-Vindas Liberado</span>
                                    <span className="px-1.5 py-0.2 bg-purple-200 text-purple-800 rounded text-[10px] font-black">Grátis</span>
                                </span>
                                <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug">
                                    Cadastre-se agora e receba <strong>R$ 3,00 de saldo</strong> na sua carteira para enviar suas primeiras mensagens e testar o chat.
                                </p>
                            </div>
                        </div>

                        {/* CTA Principal de Conversão Imediata */}
                        <div className="space-y-3 pt-2 max-w-md">
                            <Link
                                href={destinationUrl}
                                {...ctaProps}
                                className="w-full h-14 sm:h-16 px-6 sm:px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-black text-base sm:text-lg uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-3 group cursor-pointer"
                            >
                                <span>Destravar Fotos e Conversar</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                            </Link>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1 text-slate-600">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    100% Anônimo & Sigiloso
                                </span>
                                <span>•</span>
                                <span>Fatura sem nome do site</span>
                                <span>•</span>
                                <span>PIX Imediato</span>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: MOCKUP INTERATIVO DO CHAT COM MÍDIA EM BLUR */}
                    <div className="lg:col-span-5 flex justify-center">
                        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-purple-500/10 overflow-hidden">
                            {/* Topo do Chat com a Modelo do Banner */}
                            <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-purple-500/40 bg-slate-100">
                                            <Image
                                                src="/assets/banner-model-avatar.png"
                                                alt="Letícia do MimoChat"
                                                width={44}
                                                height={44}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-extrabold text-slate-900 text-sm">Letícia, 22</h3>
                                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Online agora • Responde rápido</span>
                                        </div>
                                    </div>
                                </div>

                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-black text-[10px] uppercase">
                                    Ao Vivo
                                </span>
                            </div>

                            {/* Conteúdo do Chat Simulado */}
                            <div className="p-4 space-y-3.5 bg-slate-50/40">
                                {/* Balão 1: Mensagem de Texto Provocante */}
                                <div className="flex items-start gap-2">
                                    <div className="bg-white border border-slate-200/90 text-slate-800 text-xs sm:text-sm rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs leading-relaxed max-w-[90%]">
                                        <p className="font-medium">
                                            Oi amor... acabei de tirar essa selfie aqui no quarto só pra você. Quer ver sem censura? 😏
                                        </p>
                                        <span className="block text-[10px] text-slate-400 font-medium text-right mt-1">
                                            15:34
                                        </span>
                                    </div>
                                </div>

                                {/* Mídia em Blur Interativa (O Ponto Focal de Dopamina) */}
                                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
                                    <Image
                                        src="/assets/banner-model-hero.png"
                                        alt="Foto exclusiva com blur da Letícia"
                                        fill
                                        priority
                                        className={`object-cover transition-all duration-700 ${
                                            isMediaUnlocked
                                                ? 'blur-0 scale-100'
                                                : 'blur-xl scale-110 contrast-125 select-none'
                                        }`}
                                    />

                                    {/* Overlay Bloqueado */}
                                    {!isMediaUnlocked ? (
                                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between p-4 text-white">
                                            <div className="flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-bold tracking-wide uppercase">
                                                    <Lock className="w-3.5 h-3.5" />
                                                    Foto Privada HD
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-black">
                                                    Sem Censura
                                                </span>
                                            </div>

                                            <div className="my-auto text-center space-y-3">
                                                <div className="w-13 h-13 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center mx-auto text-white shadow-lg animate-pulse">
                                                    <Lock className="w-6 h-6" />
                                                </div>

                                                <div className="space-y-1">
                                                    <h4 className="font-black text-base sm:text-lg text-white drop-shadow-sm">
                                                        Mídia Íntima Bloqueada
                                                    </h4>
                                                    <p className="text-[11px] text-white/80 max-w-[220px] mx-auto leading-tight">
                                                        Toque abaixo para ver a foto completa da Letícia sem tarjas.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={handlePreviewUnlock}
                                                    disabled={isUnlocking}
                                                    className="w-full px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-purple-950/40 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                                                >
                                                    {isUnlocking ? (
                                                        <>
                                                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                            <span>Liberando...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="w-4 h-4" />
                                                            <span>Toque Para Ver a Foto</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="text-[10px] text-white/70 text-center font-medium">
                                                Disponível no chat privado
                                            </div>
                                        </div>
                                    ) : (
                                        /* Feedback de Foto Liberada */
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2">
                                            <div className="flex items-center gap-1.5 text-white text-xs font-bold">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>Prévia Destravada com Sucesso!</span>
                                            </div>
                                            <Link
                                                href={destinationUrl}
                                                {...ctaProps}
                                                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <span>Pedir Mais Fotos no Chat</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Balão 2: Mini Player de Áudio Provocante */}
                                <div className="flex items-start gap-2">
                                    <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-xs flex items-center gap-3 w-full max-w-[85%]">
                                        <Link
                                            href={destinationUrl}
                                            {...ctaProps}
                                            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                                        </Link>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1">
                                                <span className="h-2 w-1 bg-purple-600 rounded-full animate-pulse" />
                                                <span className="h-4 w-1 bg-purple-600 rounded-full" />
                                                <span className="h-3 w-1 bg-purple-600 rounded-full" />
                                                <span className="h-5 w-1 bg-purple-600 rounded-full animate-pulse" />
                                                <span className="h-2 w-1 bg-purple-600 rounded-full" />
                                                <span className="h-4 w-1 bg-purple-400 rounded-full" />
                                                <span className="h-3 w-1 bg-purple-300 rounded-full" />
                                                <span className="h-2 w-1 bg-purple-200 rounded-full" />
                                                <span className="text-[10px] font-bold text-slate-500 ml-2">0:18</span>
                                            </div>
                                            <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                                                Áudio íntimo da Letícia
                                            </span>
                                        </div>
                                        <Volume2 className="w-4 h-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* ─── GRADE DE CRIADORAS REAIS ONLINE AGORA ─── */}
                <section className="mt-16 sm:mt-24 pt-12 border-t border-slate-200/80 space-y-8">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Mulheres Disponíveis Agora</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Escolha com quem você quer conversar
                        </h2>
                        <p className="text-sm text-slate-600 font-medium">
                            Criadoras reais online no MimoChat trocando fotos, vídeos e conversas no privado.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                        {CREATORS_LIST.map((creator, idx) => (
                            <Link
                                key={idx}
                                href={destinationUrl}
                                {...ctaProps}
                                className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block"
                            >
                                <Image
                                    src={creator.image}
                                    alt={creator.name}
                                    fill
                                    sizes="(max-width: 640px) 180px, 240px"
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                
                                {/* Gradiente escuro inferior para leitura legível */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                                {/* Badge Superior de Status */}
                                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span>{creator.onlineTime}</span>
                                    </span>
                                </div>

                                {/* Informações e CTA inferior */}
                                <div className="absolute bottom-0 inset-x-0 p-3 text-white space-y-1.5">
                                    <div>
                                        <h3 className="font-black text-sm drop-shadow-sm flex items-center gap-1">
                                            <span>{creator.name}, {creator.age}</span>
                                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                        </h3>
                                        <span className="text-[10px] text-white/75 font-medium block">
                                            {creator.city}
                                        </span>
                                    </div>

                                    {/* Tag de Destaque */}
                                    <div className="text-[10px] font-bold text-purple-300">
                                        {creator.tags[0]}
                                    </div>

                                    <button
                                        type="button"
                                        className="w-full py-1.5 rounded-lg bg-purple-600 group-hover:bg-purple-700 text-white font-bold text-[11px] uppercase tracking-wide flex items-center justify-center gap-1 transition-colors shadow-xs"
                                    >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>Conversar</span>
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Botão de Rodapé da Grade */}
                    <div className="text-center pt-4">
                        <Link
                            href={destinationUrl}
                            {...ctaProps}
                            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-sm uppercase tracking-wider shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                        >
                            <span>Ver Mais Mulheres Online (348)</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>

                {/* ─── BARRA DE CONFIANÇA & PRIVACIDADE ─── */}
                <section className="mt-16 pt-12 border-t border-slate-200/80">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">
                                100% Anônimo & Sigiloso
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Nenhum dado pessoal é exposto. Na sua fatura bancária ou cartão nunca aparece o nome do site.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">
                                Apenas Mulheres Reais
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Todas as criadoras passam por verificação rigorosa de documentos e selfie. Zero robôs ou inteligência artificial.
                            </p>
                        </div>

                        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">
                                PIX & Acesso Imediato
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Recarregue quando quiser sem mensalidades obrigatórias. Pague apenas pelo que escolher desbloquear.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* ─── RODAPÉ INSTITUCIONAL ─── */}
            <footer className="w-full py-6 px-4 sm:px-8 border-t border-slate-200 bg-white text-xs text-slate-500">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-medium">
                    <div className="flex items-center gap-2">
                        <Image
                            src="/Logo.svg"
                            alt="MimoChat"
                            width={16}
                            height={16}
                            className="w-4 h-4 opacity-70"
                        />
                        <span>MimoChat © {new Date().getFullYear()} • Plataforma Privada para Maiores de 18 Anos</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/termos-de-uso" className="hover:text-slate-900 transition-colors">Termos</Link>
                        <span>•</span>
                        <Link href="/politica-de-privacidade" className="hover:text-slate-900 transition-colors">Privacidade</Link>
                        <span>•</span>
                        <Link href="/ajuda" className="hover:text-slate-900 transition-colors">Ajuda</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
