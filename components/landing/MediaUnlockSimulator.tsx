'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Unlock, ShieldCheck, CheckCircle2, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface MediaUnlockSimulatorProps {
    initialPrice?: number;
    redirectUrl?: string;
}

export function MediaUnlockSimulator({
    initialPrice = 5,
    redirectUrl = '/login',
}: MediaUnlockSimulatorProps) {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [selectedPrice, setSelectedPrice] = useState<number>(initialPrice);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleUnlock = () => {
        setIsSimulating(true);
        setTimeout(() => {
            setIsSimulating(false);
            setIsUnlocked(true);
            setShowSuccessModal(true);
        }, 600);
    };

    const handleReset = () => {
        setIsUnlocked(false);
        setShowSuccessModal(false);
    };

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-purple-500/5 overflow-hidden transition-all duration-300">
            {/* Cabeçalho do Chat Simulado */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-purple-500/30">
                            <Image
                                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                                alt="Débora Silveira"
                                width={44}
                                height={44}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 text-sm">Débora Silveira, 23</h3>
                            <span className="inline-flex items-center text-purple-600" title="Perfil Verificado">
                                <ShieldCheck className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Online agora
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-slate-500">
                                <Zap className="w-3 h-3 text-amber-500" />
                                Responde em ~3 min
                            </span>
                        </div>
                    </div>
                </div>

                {isUnlocked && (
                    <button
                        onClick={handleReset}
                        className="text-xs font-semibold text-slate-500 hover:text-purple-600 flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-100"
                        title="Bloquear novamente para testar"
                    >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resetar</span>
                    </button>
                )}
            </div>

            {/* Mensagem e Mídia Simulada */}
            <div className="p-5 space-y-4">
                {/* Balão de Mensagem da Criadora */}
                <div className="flex items-start gap-2.5">
                    <div className="bg-purple-50 border border-purple-100 text-slate-800 text-xs sm:text-sm rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] shadow-xs leading-relaxed">
                        <p className="font-medium">
                            Oi amor! Preparei esse mimo exclusivo que você me pediu no privado... espero que goste 🙈
                        </p>
                        <span className="block text-[10px] text-purple-700/60 font-semibold text-right mt-1">
                            Agora mesmo
                        </span>
                    </div>
                </div>

                {/* Seletor de valor para teste */}
                {!isUnlocked && (
                    <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">Valor configurado pela criadora:</span>
                        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setSelectedPrice(5)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                    selectedPrice === 5
                                        ? 'bg-white text-purple-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                R$ 5,00
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedPrice(10)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                                    selectedPrice === 10
                                        ? 'bg-white text-purple-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                R$ 10,00
                            </button>
                        </div>
                    </div>
                )}

                {/* Card de Mídia Interativo */}
                <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                    {/* Imagem de Fundo (com blur dinâmico) */}
                    <Image
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85"
                        alt="Mídia exclusiva da Débora"
                        fill
                        priority
                        className={`object-cover transition-all duration-700 ease-out ${
                            isUnlocked
                                ? 'blur-0 scale-100'
                                : 'blur-2xl scale-110 filter contrast-125 select-none'
                        }`}
                    />

                    {/* Estado Bloqueado: Camada de Proteção e Ação */}
                    {!isUnlocked ? (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col justify-between p-4 sm:p-5 text-white">
                            {/* Badges superiores */}
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold tracking-wide uppercase">
                                    <Lock className="w-3.5 h-3.5" />
                                    Foto Privada
                                </span>
                                <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-black shadow-md">
                                    R$ {selectedPrice.toFixed(2).replace('.', ',')}
                                </span>
                            </div>

                            {/* Centro: Chamada e Botão de Desbloqueio */}
                            <div className="my-auto text-center space-y-3 px-2">
                                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-lg border border-white/40 flex items-center justify-center mx-auto text-white shadow-lg animate-pulse">
                                    <Lock className="w-7 h-7" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-extrabold text-base sm:text-lg text-white drop-shadow-sm">
                                        Conteúdo Exclusivo
                                    </h4>
                                    <p className="text-xs text-white/80 max-w-xs mx-auto">
                                        Clique abaixo para simular o desbloqueio imediato por apenas R$ {selectedPrice.toFixed(2).replace('.', ',')}.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleUnlock}
                                    disabled={isSimulating}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-sm shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2 mx-auto"
                                >
                                    {isSimulating ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Liberando mídia...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Unlock className="w-4 h-4" />
                                            <span>Testar Desbloqueio Grátis</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Rodapé discreto da mídia */}
                            <div className="text-[11px] text-white/70 text-center">
                                Simulação interativa • Sem cobrança real
                            </div>
                        </div>
                    ) : (
                        /* Estado Desbloqueado: Badge de Sucesso */
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-xs font-bold shadow-md">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Mídia Desbloqueada
                            </span>
                            <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
                                Privado
                            </span>
                        </div>
                    )}
                </div>

                {/* Feedback e Chamada de Conversão após desbloquear */}
                {isUnlocked && (
                    <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span>É assim que funciona no MimoChat!</span>
                            </div>
                            <p className="text-emerald-800 leading-relaxed pl-5">
                                A criadora recebe o valor instantaneamente no saldo dela e você curte a foto ou vídeo em alta definição sem censura.
                            </p>
                        </div>

                        <Link
                            href={`${redirectUrl}?redirect=${encodeURIComponent('/search')}`}
                            className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Conversar com a Débora Agora</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
