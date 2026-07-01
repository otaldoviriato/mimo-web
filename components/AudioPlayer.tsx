'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AudioPlayerProps {
    src: string;
    duration?: number;
    isMine: boolean;
}

export function AudioPlayer({ src, duration = 0, isMine }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        // Inicializa o elemento de áudio
        const audio = new Audio(src);
        audioRef.current = audio;

        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };

        const onPlay = () => {
            setIsPlaying(true);
        };

        const onPause = () => {
            setIsPlaying(false);
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
        <div className="flex items-center gap-3 w-[260px] max-w-full select-none py-1">
            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm ${
                    isMine ? 'bg-white text-purple-600' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                }`}
            >
                {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>

            {/* Audio Wave and Timeline Area */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
                {/* Visual Audio Wave */}
                <div className="flex items-end gap-[2px] h-6 px-1 select-none">
                    {waveBars.map((height, index) => {
                        const barProgress = (index / waveBars.length) * 100;
                        const isPlayed = barProgress <= currentPercentage;
                        return (
                            <div
                                key={index}
                                className="flex-1 rounded-full transition-colors duration-150"
                                style={{
                                    height: `${height}%`,
                                    backgroundColor: isPlayed
                                        ? (isMine ? '#ffffff' : '#9333ea') // played color
                                        : (isMine ? 'rgba(255, 255, 255, 0.3)' : 'rgba(147, 51, 234, 0.15)') // unplayed color
                                }}
                            />
                        );
                    })}
                </div>

                {/* Timeline slider input */}
                <div className="relative flex items-center w-full group">
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

                {/* Duration Labels */}
                <div className="flex justify-between items-center text-[10px] leading-none">
                    <span className={isMine ? 'text-purple-200' : 'text-gray-400 font-medium'}>
                        {formatTime(currentTime)}
                    </span>
                    <span className={isMine ? 'text-purple-200' : 'text-gray-400 font-medium'}>
                        {formatTime(duration)}
                    </span>
                </div>
            </div>

            {/* Ícone de microfone pequeno no canto para indicar que é áudio */}
            <div className={`shrink-0 ${isMine ? 'text-purple-200' : 'text-purple-600/80'} self-end mb-0.5`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
            </div>
        </div>
    );
}
