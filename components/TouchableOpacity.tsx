'use client';

import React from 'react';

interface TouchableOpacityProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    activeOpacity?: number;
    children: React.ReactNode;
}

export function TouchableOpacity({
    activeOpacity = 0.5,
    className = '',
    children,
    style,
    ...props
}: TouchableOpacityProps) {
    return (
        <button
            className={`transition-opacity duration-300 active:opacity-[var(--active-opacity)] select-none outline-none cursor-pointer ${className}`}
            style={{
                '--active-opacity': activeOpacity,
                WebkitTapHighlightColor: 'transparent',
                ...style,
            } as React.CSSProperties}
            {...props}
        >
            {children}
        </button>
    );
}
