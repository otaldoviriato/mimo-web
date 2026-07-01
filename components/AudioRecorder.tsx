'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AudioRecorderProps {
    onSendAudio: (blob: Blob, durationInSeconds: number) => void;
    connected: boolean;
    onStatusChange?: (status: 'idle' | 'recording' | 'locked') => void;
}

export function AudioRecorder({ onSendAudio, connected, onStatusChange }: AudioRecorderProps) {
    const [status, setStatus] = useState<'idle' | 'recording' | 'locked'>('idle');
    const [duration, setDuration] = useState(0);
    const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (onStatusChange) {
            onStatusChange(status);
        }
    }, [status, onStatusChange]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Refs para a Web Audio API (Onda sonora animada)
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    // Gestos
    const touchStartCoords = useRef<{ x: number; y: number } | null>(null);
    const isRecordingInitiatedRef = useRef(false);

    // Limiares de arrasto (pixels)
    const CANCEL_THRESHOLD = -80; // arrastar para esquerda
    const LOCK_THRESHOLD = -70;   // arrastar para cima

    // Limpeza de timers e áudios
    const cleanup = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        isRecordingInitiatedRef.current = false;
    };

    useEffect(() => {
        return () => cleanup();
    }, []);

    // Atualização do cronômetro de duração da gravação
    const startTimer = () => {
        setDuration(0);
        timerRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
        }, 1000);
    };

    // Iniciar a animação no canvas
    const startWaveformAnimation = (stream: MediaStream) => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 64; // pouca frequência para 15-20 barras

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

                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = dataArrayRef.current;

                analyserRef.current.getByteFrequencyData(dataArray as any);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const barWidth = 3;
                const barGap = 2.5;
                const maxBars = Math.min(25, Math.floor(canvas.width / (barWidth + barGap)));

                ctx.fillStyle = '#a855f7'; // Roxo elegante

                for (let i = 0; i < maxBars; i++) {
                    const value = dataArray[i % bufferLength] || 0;
                    const percent = value / 255;
                    const barHeight = Math.max(3, percent * canvas.height * 0.85);
                    const x = i * (barWidth + barGap);
                    const y = (canvas.height - barHeight) / 2;

                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, barHeight, 1.5);
                    ctx.fill();
                }

                animationFrameIdRef.current = requestAnimationFrame(draw);
            };

            draw();
        } catch (e) {
            console.error('Failed to initialize dynamic waveform:', e);
        }
    };

    // Iniciar Gravação
    const startRecording = async () => {
        if (isRecordingInitiatedRef.current) return;
        isRecordingInitiatedRef.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Suporte para iOS Safari (audio/mp4) e outros navegadores (webm)
            let options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'audio/mp4' };
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                // Fallback final
                options = { mimeType: '' };
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Aqui só geramos o blob se formos enviar (status controlará se envia ou cancela)
            };

            mediaRecorder.start();
            setStatus('recording');
            startTimer();
            startWaveformAnimation(stream);

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(20); // Vibração tátil sutil para indicar início
            }
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Não foi possível acessar o microfone. Verifique as permissões do seu navegador/dispositivo.');
            cleanup();
            setStatus('idle');
        }
    };

    // Finalizar gravação e enviar
    const stopAndSendRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
            cleanup();
            setStatus('idle');
            return;
        }

        const recordingDuration = duration; // captura a duração antes de resetar

        recorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, {
                type: recorder.mimeType || 'audio/webm'
            });

            if (recordingDuration >= 1 && audioBlob.size > 100) {
                onSendAudio(audioBlob, recordingDuration);
            } else {
                alert('Áudio muito curto para ser enviado.');
            }
            cleanup();
            setStatus('idle');
        };

        recorder.stop();
    };

    // Cancelar a gravação
    const cancelRecording = () => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = () => {
                cleanup();
                setStatus('idle');
            };
            recorder.stop();
        } else {
            cleanup();
            setStatus('idle');
        }
        setSwipeOffset({ x: 0, y: 0 });

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([15, 10, 15]); // Padrão de vibração curto de cancelamento
        }
    };

    // Travar gravação (Modo Locked/Cadeado)
    const lockRecording = () => {
        setStatus('locked');
        setSwipeOffset({ x: 0, y: 0 });
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(30); // Feedback vibratório curto indicando trava
        }
    };

    // Eventos de toque (Mobile)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!connected || status !== 'idle') return;
        e.preventDefault();
        const touch = e.touches[0];
        touchStartCoords.current = { x: touch.clientX, y: touch.clientY };
        startRecording();
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartCoords.current || status !== 'recording') return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartCoords.current.x;
        const deltaY = touch.clientY - touchStartCoords.current.y;

        // Limita movimento a valores negativos (esquerda / cima)
        const clampedX = Math.min(0, deltaX);
        const clampedY = Math.min(0, deltaY);

        setSwipeOffset({ x: clampedX, y: clampedY });

        if (clampedX < CANCEL_THRESHOLD) {
            cancelRecording();
        } else if (clampedY < LOCK_THRESHOLD) {
            lockRecording();
        }
    };

    const handleTouchEnd = () => {
        touchStartCoords.current = null;
        if (status === 'recording') {
            stopAndSendRecording();
        }
    };

    // Eventos de clique (Desktop)
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!connected || status !== 'idle' || e.button !== 0) return; // apenas clique esquerdo
        e.preventDefault();
        touchStartCoords.current = { x: e.clientX, y: e.clientY };
        startRecording();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!touchStartCoords.current || status !== 'recording') return;
        const deltaX = e.clientX - touchStartCoords.current.x;
        const deltaY = e.clientY - touchStartCoords.current.y;

        const clampedX = Math.min(0, deltaX);
        const clampedY = Math.min(0, deltaY);

        setSwipeOffset({ x: clampedX, y: clampedY });

        if (clampedX < CANCEL_THRESHOLD) {
            cancelRecording();
        } else if (clampedY < LOCK_THRESHOLD) {
            lockRecording();
        }
    };

    const handleMouseUp = () => {
        touchStartCoords.current = null;
        if (status === 'recording') {
            stopAndSendRecording();
        }
    };

    const handleMouseLeave = () => {
        touchStartCoords.current = null;
        if (status === 'recording') {
            cancelRecording(); // Se o mouse sair do botão no desktop sem travar, cancela
        }
    };

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 ${status !== 'idle' ? 'flex-1 w-full' : ''}`}>
            {status !== 'idle' && (
                <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-gray-100 rounded-2xl px-4 py-1.5 min-h-[44px] animate-in fade-in duration-200">
                    
                    {/* Botão de Lixeira se estiver Locked */}
                    {status === 'locked' && (
                        <button
                            onClick={cancelRecording}
                            className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors active:scale-95 shadow-sm shrink-0"
                            title="Cancelar gravação"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                        </button>
                    )}

                    {/* Indicador Vermelho de Gravação */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 relative" />
                        <span className="text-sm font-bold text-slate-700">{formatTimer(duration)}</span>
                    </div>

                    {/* Onda Sonora Canvas */}
                    <div className="flex-1 h-6 min-w-[50px] relative">
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full"
                            width={150}
                            height={24}
                        />
                    </div>

                    {/* Texto Deslize para Cancelar (se apenas gravando) */}
                    {status === 'recording' && (
                        <div className="flex items-center gap-2 shrink-0 select-none pointer-events-none text-[11px] text-gray-450 font-medium">
                            <div 
                                className="flex items-center gap-1 transition-transform"
                                style={{
                                    transform: `translateX(${swipeOffset.x * 0.4}px)`,
                                }}
                            >
                                <span>⟨ Deslize para cancelar</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* O Botão do Microfone/Enviar flutuante à direita */}
            <div className="relative shrink-0">
                {/* Cadeado flutuante (se gravando por toque) */}
                {status === 'recording' && (
                    <div 
                        className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white p-2 rounded-full border border-slate-100 shadow-md flex items-center justify-center animate-bounce text-purple-600 z-50"
                        style={{
                            transform: `translateY(${Math.max(-20, swipeOffset.y * 0.3)}px)`,
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                )}

                {status === 'locked' ? (
                    /* Botão de Enviar (se travado) */
                    <button
                        onClick={stopAndSendRecording}
                        className="w-11 h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-md shadow-purple-600/20 shrink-0"
                        title="Enviar áudio"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                ) : (
                    /* Botão de Microfone (se idle ou gravando/segurando) */
                    <button
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        disabled={!connected}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                            status === 'recording'
                                ? 'bg-red-500 text-white scale-125 shadow-lg animate-pulse'
                                : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-90 shadow-sm'
                        } disabled:opacity-50`}
                        style={{
                            transform: status === 'recording' ? `translate(${swipeOffset.x * 0.1}px, ${swipeOffset.y * 0.1}px) scale(1.2)` : '',
                            touchAction: 'none'
                        }}
                        title="Segure para gravar áudio"
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
    );
}
