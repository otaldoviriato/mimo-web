'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AudioPlayerProps {
    src: string;
    duration?: number;
    isMine: boolean;
    timestamp?: string;
    isRead?: boolean;
    isDelivered?: boolean;
    status?: string;
}

export function AudioPlayer({ src, duration = 0, isMine, timestamp, isRead, isDelivered, status }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        // Inicializa o elemento de áudio
        const audio = new Audio(src);
        audioRef.current = audio;

        const updateProgress = () => {
            if (audio && !audio.paused) {
                setCurrentTime(audio.currentTime);
                animationFrameRef.current = requestAnimationFrame(updateProgress);
            }
        };

        const onTimeUpdate = () => {
            // Atualiza o progresso quando o áudio estiver pausado ou o loop de animação não estiver ativo
            if (audio.paused || !animationFrameRef.current) {
                setCurrentTime(audio.currentTime);
            }
        };

        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };

        const onPlay = () => {
            setIsPlaying(true);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(updateProgress);
        };

        const onPause = () => {
            setIsPlaying(false);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);

        return () => {
            audio.pause();
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            audioRef.current = null;
        };
    }, [src]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => {
                console.error('Failed to play audio:', err);
            });
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;
        const seekTime = parseFloat(e.target.value);
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const formatTime = (secs: number) => {
        const minutes = Math.floor(secs / 60);
        const seconds = Math.floor(secs % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Gera um padrão estático de altura de barras de áudio representativas (24 barras)
    const waveBars = [
        30, 50, 40, 60, 20, 45, 75, 55, 35, 65, 80, 50, 25, 45, 60, 30, 40, 70, 50, 30, 45, 60, 25, 35
    ];

    const currentPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex flex-col w-[240px] max-w-full select-none py-0.5">
            {/* Linha superior: Play + Ondas/Slider */}
            <div className="flex items-center gap-3 w-full">
                {/* Play/Pause Button */}
                <button
                    onClick={togglePlay}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
                        isMine ? 'bg-white text-purple-600' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                    }`}
                >
                    {isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                {/* Audio Wave and Timeline Area */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                    {/* Visual Audio Wave */}
                    <div className="flex items-end gap-[2px] h-5 px-0.5 select-none">
                        {waveBars.map((height, index) => {
                            const barProgress = (index / waveBars.length) * 100;
                            const isPlayed = barProgress <= currentPercentage;
                            return (
                                <div
                                    key={index}
                                    className="flex-1 rounded-full transition-colors duration-150"
                                    style={{
                                        height: `${height * 0.7}%`,
                                        backgroundColor: isPlayed
                                            ? (isMine ? '#ffffff' : '#9333ea') // played color
                                            : (isMine ? 'rgba(255, 255, 255, 0.3)' : 'rgba(147, 51, 234, 0.15)') // unplayed color
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Timeline slider input */}
                    <div className="relative flex items-center w-full group h-2">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-1 bg-transparent rounded-lg appearance-none cursor-pointer focus:outline-none"
                            style={{
                                accentColor: isMine ? '#ffffff' : '#9333ea',
                                background: isMine
                                    ? `linear-gradient(to right, #ffffff ${currentPercentage}%, rgba(255, 255, 255, 0.25) ${currentPercentage}%)`
                                    : `linear-gradient(to right, #9333ea ${currentPercentage}%, rgba(147, 51, 234, 0.1) ${currentPercentage}%)`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Linha inferior: Tempo à esquerda, carimbo de hora + checks + microfone à direita */}
            <div className="flex items-center justify-between mt-1 px-0.5 text-[9.5px] leading-none">
                {/* Tempo do áudio */}
                <span className={isMine ? 'text-purple-200' : 'text-gray-400 font-medium'}>
                    {isPlaying ? formatTime(currentTime) : formatTime(duration)}
                </span>

                {/* Info e status de envio à direita */}
                <div className="flex items-center gap-1.5">
                    {/* Timestamp */}
                    {timestamp && (
                        <span className={isMine ? 'text-purple-200/70' : 'text-gray-400'}>
                            {timestamp}
                        </span>
                    )}

                    {/* Checks */}
                    {isMine && (
                        <span className={`text-[11px] leading-none ${isRead ? 'text-blue-300' : (status === 'sending' ? 'text-purple-300 animate-pulse' : 'text-purple-300/80')}`}>
                            {status === 'sending' ? (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mb-[-1px]">
                                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                </svg>
                            ) : isRead ? (
                                <span className="inline-flex items-center">
                                    <span>✓</span>
                                    <span className="-ml-1">✓</span>
                                </span>
                            ) : isDelivered ? (
                                <span className="inline-flex items-center">
                                    <span>✓</span>
                                    <span className="-ml-1">✓</span>
                                </span>
                            ) : '✓'}
                        </span>
                    )}

                    {/* Ícone de microfone */}
                    <span className={isMine ? 'text-purple-200/80' : 'text-purple-600/80'}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mb-[1px]">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                    </span>
                </div>
            </div>
        </div>
    );
}
