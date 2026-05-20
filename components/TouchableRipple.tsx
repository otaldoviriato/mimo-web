'use client';

import React, { useState, useRef } from 'react';

interface Ripple {
    key: number;
    x: number;
    y: number;
    size: number;
}

interface TouchableRippleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    rippleColor?: string;
    activeOpacity?: number; // Opacidade ao pressionar
    children: React.ReactNode;
}

export function TouchableRipple({
    rippleColor = 'rgba(0, 0, 0, 0.08)', // Sombreamento cinza sutil padrão do Android
    activeOpacity = 0.7, // Padrão sutil para TouchableOpacity do Android
    className = '',
    children,
    onClick,
    style,
    ...props
}: TouchableRippleProps) {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const countRef = useRef(0);

    const createRipple = (clientX: number, clientY: number) => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        
        // Define o diâmetro como o dobro da maior dimensão para garantir preenchimento total
        const size = Math.max(rect.width, rect.height) * 2;
        const x = clientX - rect.left - size / 2;
        const y = clientY - rect.top - size / 2;

        const newRipple = {
            key: countRef.current++,
            x,
            y,
            size,
        };

        setRipples((prev) => [...prev, newRipple]);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return; // Apenas clique esquerdo
        createRipple(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
        if (e.touches.length > 0) {
            createRipple(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const removeRipple = (key: number) => {
        setRipples((prev) => prev.filter((r) => r.key !== key));
    };

    return (
        <button
            ref={buttonRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={onClick}
            className={`relative overflow-hidden outline-none cursor-pointer select-none transition-opacity duration-150 active:opacity-[var(--active-opacity)] ${className}`}
            style={{
                '--active-opacity': activeOpacity,
                WebkitTapHighlightColor: 'transparent',
                ...style,
            } as React.CSSProperties}
            {...props}
        >
            {children}
            {ripples.map((ripple) => (
                <span
                    key={ripple.key}
                    onAnimationEnd={() => removeRipple(ripple.key)}
                    className="absolute rounded-full pointer-events-none z-30"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: ripple.size,
                        height: ripple.size,
                        backgroundColor: rippleColor,
                        transform: 'scale(0)',
                        animation: 'ripple 450ms cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                    }}
                />
            ))}
        </button>
    );
}
