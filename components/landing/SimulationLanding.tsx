'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Lock,
    Unlock,
    ShieldCheck,
    Send,
    Play,
    RotateCcw,
    ArrowRight,
    Volume2,
} from 'lucide-react';

interface SimulationLandingProps {
    authRedirectUrl?: string;
    ctaTrackingAttr?: boolean;
}

export function SimulationLanding({
    authRedirectUrl = '/login',
    ctaTrackingAttr = false,
}: SimulationLandingProps) {
    const ctaProps = ctaTrackingAttr ? { 'data-campaign-cta': true } : {};

    // Etapas da timeline (0 a 7)
    // 0: início com carregamento
    // 1: Débora manda primeira mensagem
    // 2: Você responde
    // 3: Débora avisa que tem uma foto exclusiva
    // 4: Mídia bloqueada (blur + R$ 5,00)
    // 5: Desbloqueio da mídia (blur some, foto revelada)
    // 6: Débora manda áudio/convite pro chat
    // 7: Clímax final (fundo ofuscado + CTA isolado)
    const [step, setStep] = useState(0);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [isSimulatingUnlock, setIsSimulatingUnlock] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll das mensagens no celular
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [step, isUnlocked]);

    // Timer principal da simulação automática
    useEffect(() => {
        if (!isPlaying) return;

        const totalDuration = 8800; // ~8.8 segundos no total
        const intervalMs = 50;
        const stepIncrement = (intervalMs / totalDuration) * 100;

        const progressTimer = setInterval(() => {
            setProgress((prev) => {
                const next = prev + stepIncrement;
                if (next >= 100) {
                    clearInterval(progressTimer);
                    return 100;
                }
                return next;
            });
        }, intervalMs);

        // Timeline de eventos
        const timers: NodeJS.Timeout[] = [];

        timers.push(setTimeout(() => setStep(1), 600));   // Débora fala
        timers.push(setTimeout(() => setStep(2), 2000));  // Usuário responde
        timers.push(setTimeout(() => setStep(3), 3400));  // Débora promete mimo
        timers.push(setTimeout(() => setStep(4), 4600));  // Mídia bloqueada surge
        timers.push(setTimeout(() => {
            setIsSimulatingUnlock(true);
            setStep(5);
        }, 5800)); // Inicia toque no desbloqueio
        timers.push(setTimeout(() => {
            setIsSimulatingUnlock(false);
            setIsUnlocked(true);
        }, 6400)); // Blur desfeito, foto revelada
        timers.push(setTimeout(() => setStep(6), 7200));  // Débora convida pro chat
        timers.push(setTimeout(() => setStep(7), 8400));  // Clímax: fundo ofuscado + CTA isolado

        return () => {
            clearInterval(progressTimer);
            timers.forEach(clearTimeout);
        };
    }, [isPlaying]);

    const handleRestart = () => {
        setStep(0);
        setIsUnlocked(false);
        setIsSimulatingUnlock(false);
        setProgress(0);
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 100);
    };

    const handleSkipToCta = () => {
        setStep(7);
        setIsUnlocked(true);
        setProgress(100);
    };

    const destinationUrl = `${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`;

    return (
        <div className="relative min-h-screen w-full bg-slate-900 text-slate-900 flex flex-col items-center justify-between overflow-hidden select-none font-sans">
            {/* Fundo dinâmico com iluminação sutil e foto de fundo desfocada */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <Image
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=70"
                    alt="Background atmosphere"
                    fill
                    priority
                    className="object-cover opacity-20 filter blur-3xl scale-125"
                />
                <div className="absolute inset-0 bg-radial from-slate-900/40 via-slate-950/80 to-slate-950" />
            </div>

            {/* Topo Mínimo: Logo oficial e botão pular */}
            <header className="relative z-30 w-full max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image
                        src="/Logo.svg"
                        alt="MimoChat"
                        width={110}
                        height={28}
                        priority
                        className="h-7 w-auto object-contain brightness-0 invert opacity-90"
                    />
                </div>

                {step < 7 && (
                    <button
                        onClick={handleSkipToCta}
                        className="text-xs font-bold text-white/70 hover:text-white px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 transition-all flex items-center gap-1 active:scale-95"
                    >
                        <span>Pular</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </header>

            {/* Centro: O Celular com a Simulação Automatizada */}
            <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-3 sm:p-4 w-full">
                <div className="relative w-full max-w-[340px] aspect-[9/18.5] max-h-[640px] rounded-[2.5rem] p-3 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 shadow-[0_25px_60px_rgba(0,0,0,0.8)] border-4 border-slate-700/80 flex flex-col transition-transform duration-700">
                    {/* Dynamic Island / Notch */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-40 flex items-center justify-end px-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                    </div>

                    {/* Barra de Progresso da Simulação (Estilo Stories) */}
                    <div className="absolute top-2.5 left-8 right-8 h-1 bg-white/20 rounded-full overflow-hidden z-30">
                        <div
                            className="h-full bg-purple-400 transition-all ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Display do Smartphone (Interface real do MimoChat) */}
                    <div className="relative w-full h-full rounded-[2rem] bg-white overflow-hidden flex flex-col border border-slate-200">
                        {/* Header da Sala de Chat */}
                        <div className="pt-8 pb-3 px-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-full overflow-hidden border border-purple-500/40">
                                        <Image
                                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                                            alt="Débora"
                                            width={36}
                                            height={36}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                                </div>
                                <div className="leading-tight">
                                    <div className="flex items-center gap-1">
                                        <h2 className="font-extrabold text-slate-900 text-xs">Débora Silveira</h2>
                                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                    </div>
                                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Online agora
                                    </span>
                                </div>
                            </div>

                            <div className="text-right leading-none">
                                <span className="text-[9px] text-slate-600 font-semibold block">Créditos</span>
                                <span className="text-xs font-black text-purple-600">R$ 15,00</span>
                            </div>
                        </div>

                        {/* Corpo do Chat com Mensagens e Mídia Animada */}
                        <div
                            ref={chatContainerRef}
                            className="flex-1 p-3 space-y-2.5 overflow-y-auto bg-slate-50/60 flex flex-col justify-end text-[11px] scrollbar-none"
                        >
                            {/* Mensagem 1: Débora */}
                            {step >= 1 && (
                                <div className="self-start max-w-[85%] bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs p-2.5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <p className="leading-snug">
                                        Oi amor... acordado a essa hora? Tava na cama pensando em você 🙈
                                    </p>
                                    <span className="text-[9px] text-slate-600 block text-right mt-1 font-semibold">
                                        23:42
                                    </span>
                                </div>
                            )}

                            {/* Mensagem 2: Você */}
                            {step >= 2 && (
                                <div className="self-end max-w-[85%] bg-purple-600 text-white rounded-2xl rounded-tr-xs p-2.5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <p className="leading-snug">
                                        Tô sim Débora... vendo suas fotos, você é linda demais
                                    </p>
                                    <span className="text-[9px] text-purple-200 block text-right mt-1 font-semibold">
                                        23:42
                                    </span>
                                </div>
                            )}

                            {/* Mensagem 3: Débora promete foto */}
                            {step >= 3 && (
                                <div className="self-start max-w-[85%] bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs p-2.5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <p className="leading-snug">
                                        Obrigada lindo! Tirei uma foto agorinha que só você vai ver no privado...
                                    </p>
                                    <span className="text-[9px] text-slate-600 block text-right mt-1 font-semibold">
                                        23:43
                                    </span>
                                </div>
                            )}

                            {/* Mensagem 4 & 5: Card de Mídia Bloqueada -> Desbloqueada */}
                            {step >= 4 && (
                                <div className="self-start w-[190px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md animate-in fade-in zoom-in-95 duration-400">
                                    <div className="relative aspect-[3/4] w-full overflow-hidden">
                                        <Image
                                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85"
                                            alt="Foto exclusiva"
                                            fill
                                            className={`object-cover transition-all duration-700 ${
                                                isUnlocked
                                                    ? 'blur-0 scale-100'
                                                    : 'blur-xl scale-110 filter contrast-125'
                                            }`}
                                        />

                                        {!isUnlocked ? (
                                            /* Overlay Bloqueado */
                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm p-2.5 flex flex-col justify-between text-white">
                                                <div className="flex items-center justify-between text-[9px] font-bold">
                                                    <span className="bg-white/20 px-1.5 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1">
                                                        <Lock className="w-2.5 h-2.5" />
                                                        Privado
                                                    </span>
                                                    <span className="bg-purple-600 px-2 py-0.5 rounded-md font-black">
                                                        R$ 5,00
                                                    </span>
                                                </div>

                                                <div className="text-center my-auto space-y-1.5">
                                                    <div className="w-8 h-8 rounded-full bg-white/25 mx-auto flex items-center justify-center border border-white/30 animate-pulse">
                                                        <Lock className="w-4 h-4 text-white" />
                                                    </div>
                                                    <p className="text-[9px] font-bold text-white leading-tight">
                                                        Foto Exclusiva
                                                    </p>
                                                    <div
                                                        className={`px-3 py-1.5 rounded-lg bg-purple-600 text-white font-black text-[10px] shadow-sm flex items-center justify-center gap-1 transition-transform ${
                                                            isSimulatingUnlock ? 'scale-90 bg-purple-700' : ''
                                                        }`}
                                                    >
                                                        <Unlock className="w-3 h-3" />
                                                        <span>Desbloquear</span>
                                                    </div>
                                                </div>
                                                <span className="text-[8px] text-white/70 text-center">Toque para ver</span>
                                            </div>
                                        ) : (
                                            /* Badge de Desbloqueado */
                                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-bold flex items-center gap-1 backdrop-blur-md shadow-xs animate-in fade-in duration-300">
                                                <Unlock className="w-2.5 h-2.5" />
                                                Liberado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mensagem 6: Débora manda áudio ou mensagem */}
                            {step >= 6 && (
                                <div className="self-start max-w-[85%] bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs p-2.5 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                                            <Play className="w-3 h-3 fill-current ml-0.5" />
                                        </div>
                                        <div className="flex-1 space-y-0.5">
                                            <div className="h-1.5 bg-purple-200 rounded-full w-full overflow-hidden">
                                                <div className="h-full bg-purple-600 w-2/3 animate-pulse" />
                                            </div>
                                            <span className="text-[8px] text-slate-600 font-bold block">
                                                Áudio de voz (0:08)
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-purple-700 font-semibold leading-snug">
                                        &quot;Gostou da foto gato? Vem pro chat continuar o papo... tô te esperando 💕&quot;
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Barra de input falsa do chat */}
                        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
                            <div className="flex-1 h-8 bg-slate-100 rounded-full px-3 text-[10px] text-slate-600 flex items-center">
                                Enviar mensagem...
                            </div>
                            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0">
                                <Send className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ─── CLÍMAX FINAL: FUNDO TOTALMENTE OFUSCADO E CTA ISOLADO ─── */}
            {step >= 7 && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
                    <div className="max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
                        {/* Avatar da Criadora em Destaque */}
                        <div className="relative inline-block mx-auto">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-2xl mx-auto ring-4 ring-purple-500/40">
                                <Image
                                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=85"
                                    alt="Débora Silveira"
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="absolute bottom-1 right-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black border-2 border-white shadow-md flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                Online
                            </span>
                        </div>

                        {/* Chamada Irresistível de Impacto Emocional */}
                        <div className="space-y-2">
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                                Débora e outras mulheres estão online agora.
                            </h2>
                            <p className="text-sm text-purple-200/90 font-medium">
                                Conversas privadas, fotos reais e sem enrolação.
                            </p>
                        </div>

                        {/* O BOTÃO GIGANTE E ISOLADO EM DESTAQUE ABSOLUTO */}
                        <div className="space-y-3 pt-2">
                            <Link
                                href={destinationUrl}
                                {...ctaProps}
                                className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-base uppercase tracking-wider shadow-[0_10px_35px_rgba(147,51,234,0.5)] transition-all flex items-center justify-center gap-2 border border-purple-400/30 ring-4 ring-purple-500/20"
                            >
                                <span>Ver Mulheres Online</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>

                            <p className="text-[11px] text-white/50 font-medium">
                                100% Discreto • Sem mensalidade fixa • +18
                            </p>
                        </div>

                        {/* Botão sutil para assistir novamente */}
                        <button
                            onClick={handleRestart}
                            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors pt-2"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Assistir simulação novamente</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Rodapé minimalista discreto */}
            <footer className="relative z-10 py-3 text-center text-[10px] text-white/40">
                <span>MimoChat • Conversas reais no privado</span>
            </footer>
        </div>
    );
}
