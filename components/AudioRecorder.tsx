'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AudioRecorderProps {
    onSendAudio: (blob: Blob, durationInSeconds: number) => void;
    connected: boolean;
    onStatusChange?: (status: 'idle' | 'recording' | 'locked') => void;
    /** Duração máxima (em segundos) que o saldo atual do usuário consegue pagar. `undefined` = sem limite (mensagem gratuita). */
    maxDurationSeconds?: number;
    /** Chamado quando o usuário tenta gravar sem ter saldo para nem 1 segundo de áudio. */
    onInsufficientBalance?: () => void;
}

export function AudioRecorder({ onSendAudio, connected, onStatusChange, maxDurationSeconds, onInsufficientBalance }: AudioRecorderProps) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'locked'>('idle');
    const [duration, setDuration] = useState(0);
    const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
    const [showTrashAnim, setShowTrashAnim] = useState(false);

    useEffect(() => {
        if (onStatusChange) onStatusChange(status);
    }, [status, onStatusChange]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Refs para a Web Audio API
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    // Gestos
    const touchStartCoords = useRef<{ x: number; y: number } | null>(null);
    const isRecordingInitiatedRef = useRef(false);
    const isTouchActiveRef = useRef(false);

    // Direção dominante do gesto — uma vez detectada, fica travada num eixo
    const swipeDirectionRef = useRef<'horizontal' | 'vertical' | null>(null);
    const DIRECTION_DETECT_THRESHOLD = 6; // pixels para detectar a direção

    // Limiares de ação
    const CANCEL_THRESHOLD = -110;
    const LOCK_THRESHOLD   = -85;

    const vibrate = (pattern: number | number[]) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    };

    // ─── Limpeza ────────────────────────────────────────────────
    const cleanup = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (animationFrameIdRef.current) { cancelAnimationFrame(animationFrameIdRef.current); animationFrameIdRef.current = null; }
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
        if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') { audioContextRef.current.close(); audioContextRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        isRecordingInitiatedRef.current = false;
    };

    useEffect(() => { return () => cleanup(); }, []);

    // ─── Timer ────────────────────────────────────────────────
    const startTimer = () => {
        setDuration(0);
        timerRef.current = setInterval(() => setDuration(p => p + 1), 1000);
    };

    // Encerra e envia automaticamente a gravação quando o saldo do usuário não cobre mais um segundo adicional.
    useEffect(() => {
        if (status === 'recording' && maxDurationSeconds !== undefined && duration >= maxDurationSeconds) {
            stopAndSendRecording();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration, status, maxDurationSeconds]);

    // ─── Waveform ────────────────────────────────────────────────
    const startWaveformAnimation = (stream: MediaStream) => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 64;
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            sourceRef.current = source;
            dataArrayRef.current = dataArray;

            const draw = () => {
                if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const barW = 3, barG = 2.5;
                const maxBars = Math.min(25, Math.floor(canvas.width / (barW + barG)));
                ctx.fillStyle = '#a855f7';
                for (let i = 0; i < maxBars; i++) {
                    const val = dataArrayRef.current[i % bufferLength] || 0;
                    const pct = val / 255;
                    const bh = Math.max(3, pct * canvas.height * 0.85);
                    const x = i * (barW + barG);
                    const y = (canvas.height - bh) / 2;
                    ctx.beginPath();
                    ctx.roundRect(x, y, barW, bh, 1.5);
                    ctx.fill();
                }
                animationFrameIdRef.current = requestAnimationFrame(draw);
            };
            draw();
        } catch (e) {
            console.error('Failed to initialize waveform:', e);
        }
    };

    // ─── Iniciar Gravação ────────────────────────────────────────────────
    const startRecording = async () => {
        if (isRecordingInitiatedRef.current) return;
        isRecordingInitiatedRef.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isTouchActiveRef.current) {
                stream.getTracks().forEach(t => t.stop());
                cleanup();
                setStatus('idle');
                return;
            }
            streamRef.current = stream;

            let options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'audio/mp4' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: '' };

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.onstop = () => {};
            mediaRecorder.start();
            setStatus('recording');
            startTimer();
            startWaveformAnimation(stream);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Não foi possível acessar o microfone. Verifique as permissões do seu navegador/dispositivo.');
            cleanup();
            setStatus('idle');
        }
    };

    // ─── Enviar ────────────────────────────────────────────────
    const stopAndSendRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') { cleanup(); setStatus('idle'); return; }
        const recordingDuration = duration;
        recorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
            if (recordingDuration >= 1 && blob.size > 100) {
                onSendAudio(blob, recordingDuration);
            }
            cleanup();
            setStatus('idle');
        };
        recorder.stop();
    };

    // ─── Cancelar (com animação de lixeira) ────────────────────────────────────────────────
    const cancelRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = () => { cleanup(); setStatus('idle'); };
            recorder.stop();
        } else {
            cleanup();
            setStatus('idle');
        }
        setSwipeOffset({ x: 0, y: 0 });
        swipeDirectionRef.current = null;

        // Vibração de cancelamento: padrão "raspagem" curta
        vibrate([10, 30, 10, 30, 10]);

        // Animação de lixeira
        setShowTrashAnim(true);
        setTimeout(() => setShowTrashAnim(false), 900);
    };

    // ─── Travar ────────────────────────────────────────────────
    const lockRecording = () => {
        setStatus('locked');
        setSwipeOffset({ x: 0, y: 0 });
        swipeDirectionRef.current = null;
        vibrate([30, 20, 60]); // padrão de "clique" firme
    };

    // ─── Movimento — detecção e travamento de eixo ────────────────────────────────────────────────
    const computeOffset = (rawX: number, rawY: number) => {
        // Detectar direção dominante no início
        if (!swipeDirectionRef.current) {
            if (Math.abs(rawX) > DIRECTION_DETECT_THRESHOLD || Math.abs(rawY) > DIRECTION_DETECT_THRESHOLD) {
                swipeDirectionRef.current = Math.abs(rawX) >= Math.abs(rawY) ? 'horizontal' : 'vertical';
            }
            return { x: 0, y: 0 }; // ainda detectando — botão estático
        }

        if (swipeDirectionRef.current === 'horizontal') {
            return { x: Math.min(0, rawX), y: 0 }; // apenas esquerda
        } else {
            return { x: 0, y: Math.min(0, rawY) }; // apenas cima
        }
    };

    // ─── Handlers de Toque ────────────────────────────────────────────────
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!connected || status !== 'idle') return;
        if (maxDurationSeconds !== undefined && maxDurationSeconds < 1) {
            onInsufficientBalance?.();
            return;
        }
        e.preventDefault();
        vibrate(50); // vibração IMEDIATA ao toque — antes de qualquer async
        isTouchActiveRef.current = true;
        swipeDirectionRef.current = null;
        const touch = e.touches[0];
        touchStartCoords.current = { x: touch.clientX, y: touch.clientY };
        startRecording();
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartCoords.current || status !== 'recording') return;
        const touch = e.touches[0];
        const rawX = touch.clientX - touchStartCoords.current.x;
        const rawY = touch.clientY - touchStartCoords.current.y;
        const offset = computeOffset(rawX, rawY);
        setSwipeOffset(offset);
        if (offset.x < CANCEL_THRESHOLD) cancelRecording();
        else if (offset.y < LOCK_THRESHOLD) lockRecording();
    };

    const handleTouchEnd = () => {
        isTouchActiveRef.current = false;
        swipeDirectionRef.current = null;
        touchStartCoords.current = null;
        if (status === 'recording') stopAndSendRecording();
    };

    // ─── Handlers de Mouse ────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!connected || status !== 'idle' || e.button !== 0) return;
        if (maxDurationSeconds !== undefined && maxDurationSeconds < 1) {
            onInsufficientBalance?.();
            return;
        }
        e.preventDefault();
        vibrate(50); // vibração IMEDIATA ao clique
        isTouchActiveRef.current = true;
        swipeDirectionRef.current = null;
        touchStartCoords.current = { x: e.clientX, y: e.clientY };
        startRecording();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!touchStartCoords.current || status !== 'recording') return;
        const rawX = e.clientX - touchStartCoords.current.x;
        const rawY = e.clientY - touchStartCoords.current.y;
        const offset = computeOffset(rawX, rawY);
        setSwipeOffset(offset);
        if (offset.x < CANCEL_THRESHOLD) cancelRecording();
        else if (offset.y < LOCK_THRESHOLD) lockRecording();
    };

    const handleMouseUp = () => {
        isTouchActiveRef.current = false;
        swipeDirectionRef.current = null;
        touchStartCoords.current = null;
        if (status === 'recording') stopAndSendRecording();
    };

    const handleMouseLeave = () => {
        isTouchActiveRef.current = false;
        swipeDirectionRef.current = null;
        touchStartCoords.current = null;
        if (status === 'recording') cancelRecording();
    };

    const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    // Progresso de cada gesto (0→1)
    const lockProgress   = status === 'recording' ? Math.min(1, Math.abs(swipeOffset.y) / Math.abs(LOCK_THRESHOLD)) : 0;
    const cancelProgress = status === 'recording' ? Math.min(1, Math.abs(swipeOffset.x) / Math.abs(CANCEL_THRESHOLD)) : 0;

    // Translação do botão: eixo único
    const btnX = status === 'recording' ? Math.max(CANCEL_THRESHOLD, swipeOffset.x) : 0;
    const btnY = status === 'recording' ? Math.max(LOCK_THRESHOLD, swipeOffset.y) : 0;

    // O cadeado flutua sempre 68px acima do botão e desce junto com ele no eixo Y
    const lockVisible = status === 'recording' && swipeDirectionRef.current === 'vertical';
    const cancelHintVisible = status === 'recording' && swipeDirectionRef.current === 'horizontal';

    return (
        <>
            {/* ─── CSS de animações ─── */}
            <style>{`
                @keyframes trashDrop {
                    0%   { transform: translateY(-24px) scale(1.3) rotate(-5deg); opacity: 1; }
                    40%  { transform: translateY(0px) scale(1) rotate(0deg); opacity: 1; }
                    70%  { transform: translateY(-6px) scale(1.05) rotate(3deg); opacity: 0.9; }
                    100% { transform: translateY(2px) scale(0.7) rotate(0deg); opacity: 0; }
                }
                @keyframes trashShake {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    20%       { transform: rotate(-12deg) scale(1.1); }
                    40%       { transform: rotate(12deg) scale(1.1); }
                    60%       { transform: rotate(-8deg) scale(1.05); }
                    80%       { transform: rotate(8deg) scale(1.05); }
                }
                @keyframes cancelRipple {
                    0%   { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>

            <div
                className={`flex items-center gap-3 ${status !== 'idle' ? 'flex-1 w-full' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                {/* ─── Barra de status da gravação ─── */}
                {status !== 'idle' && (
                    <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-gray-100 rounded-2xl px-4 py-1.5 min-h-[44px] animate-in fade-in duration-200">
                        
                        {/* Botão de Lixeira — modo travado */}
                        {status === 'locked' && (
                            <button
                                onClick={cancelRecording}
                                className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors active:scale-95 shadow-sm shrink-0"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                            </button>
                        )}

                        {/* Ponto vermelho + timer */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 relative" />
                            <span className="text-sm font-bold text-slate-700">{formatTimer(duration)}</span>
                        </div>

                        {/* Onda sonora */}
                        <div className="flex-1 h-6 min-w-[50px] relative">
                            <canvas ref={canvasRef} className="w-full h-full" width={150} height={24} />
                        </div>

                        {/* Dica de cancelar (eixo horizontal) */}
                        {status === 'recording' && (
                            <div
                                className="shrink-0 select-none pointer-events-none overflow-hidden"
                                style={{
                                    opacity: cancelHintVisible ? 1 : swipeDirectionRef.current === null ? 0.7 : 0,
                                    transition: 'opacity 0.2s',
                                    maxWidth: cancelHintVisible ? '160px' : '120px',
                                }}
                            >
                                {cancelProgress > 0.4 ? (
                                    <span className="text-[11px] font-bold text-red-500 whitespace-nowrap">← Solte para cancelar</span>
                                ) : (
                                    <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">⟨ Deslize para cancelar</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Wrapper do botão flutuante ─── */}
                <div className="relative shrink-0" style={{ touchAction: 'none' }}>

                    {/* ─── Animação de lixeira após cancelamento ─── */}
                    {showTrashAnim && (
                        <div
                            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                            style={{ animation: 'trashDrop 0.9s ease-out forwards' }}
                        >
                            {/* Ripple de cancelamento */}
                            <div
                                className="absolute w-11 h-11 rounded-2xl bg-red-400"
                                style={{ animation: 'cancelRipple 0.5s ease-out forwards' }}
                            />
                            {/* Ícone da lixeira */}
                            <div
                                className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg z-10"
                                style={{ animation: 'trashShake 0.4s ease-in-out 0.1s' }}
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* ─── Cadeado flutuante (só aparece no eixo vertical) ─── */}
                    {status === 'recording' && (lockVisible || lockProgress > 0) && (
                        <div
                            className="absolute left-1/2 pointer-events-none z-50"
                            style={{
                                bottom: 'calc(100% + 12px)',
                                transform: `translateX(-50%) translateY(${btnY}px)`,
                                transition: 'transform 0.05s linear',
                                opacity: lockVisible ? 0.4 + lockProgress * 0.6 : 0,
                                transitionProperty: 'transform, opacity',
                            }}
                        >
                            <div className="flex flex-col items-center gap-1">
                                {/* Linha guia */}
                                {lockProgress > 0.08 && (
                                    <div
                                        className="w-px"
                                        style={{
                                            height: `${Math.min(44, lockProgress * 56)}px`,
                                            background: lockProgress > 0.8
                                                ? 'linear-gradient(to top, #7c3aed, transparent)'
                                                : 'linear-gradient(to top, #cbd5e1, transparent)',
                                        }}
                                    />
                                )}

                                {/* Bolha do cadeado */}
                                <div
                                    className="flex items-center justify-center rounded-full border shadow-lg"
                                    style={{
                                        width:  lockProgress > 0.8 ? '38px' : '32px',
                                        height: lockProgress > 0.8 ? '38px' : '32px',
                                        background: lockProgress > 0.8
                                            ? 'linear-gradient(135deg, #6d28d9, #9333ea)'
                                            : 'white',
                                        borderColor: lockProgress > 0.8 ? '#6d28d9' : '#e2e8f0',
                                        color: lockProgress > 0.8 ? 'white' : '#9333ea',
                                        boxShadow: lockProgress > 0.8
                                            ? '0 4px 14px rgba(109, 40, 217, 0.55)'
                                            : '0 2px 8px rgba(0,0,0,0.08)',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {lockProgress > 0.8 ? (
                                        /* Cadeado FECHADO */
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    ) : (
                                        /* Cadeado ABERTO */
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Botão principal: Microfone (idle/gravando) ou Enviar (locked) ─── */}
                    {status === 'locked' ? (
                        <button
                            onClick={stopAndSendRecording}
                            className="w-11 h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-md shadow-purple-600/20 shrink-0"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            disabled={!connected}
                            className={`rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-50 ${
                                status === 'recording'
                                    // Botão grande (64px) para ficar visível sob o dedo
                                    ? 'w-16 h-16 bg-red-500 text-white'
                                    : 'w-11 h-11 bg-purple-600 text-white hover:bg-purple-700 active:scale-90 shadow-sm'
                            }`}
                            style={{
                                // Em gravação: acompanha o dedo no eixo detectado
                                transform: status === 'recording'
                                    ? `translate(${btnX}px, ${btnY}px)`
                                    : undefined,
                                transition: status === 'recording'
                                    ? 'transform 0.04s linear'
                                    : 'transform 0.2s, box-shadow 0.2s',
                                touchAction: 'none',
                                // Sombra contextual apenas quando gravando
                                boxShadow: status === 'recording'
                                    ? cancelProgress > 0.25
                                        ? `0 6px 24px rgba(239, 68, 68, ${0.4 + cancelProgress * 0.45})`
                                        : lockProgress > 0.25
                                            ? `0 6px 24px rgba(109, 40, 217, ${0.4 + lockProgress * 0.45})`
                                            : '0 6px 20px rgba(239, 68, 68, 0.5)'
                                    : undefined,
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
