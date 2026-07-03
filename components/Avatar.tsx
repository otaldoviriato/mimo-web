'use client';

import React, { useState } from 'react';

interface AvatarProps {
    uri?: string | null;
    size?: number;
    className?: string;
    isOnline?: boolean;
}

function OnlineDot({ size }: { size: number }) {
    const dotSize = Math.max(10, Math.round(size * 0.28));
    return (
        <span
            className="absolute bottom-0 right-0 block rounded-full bg-emerald-400 ring-2 ring-white shadow-[0_0_6px_rgba(52,211,153,0.6)]"
            style={{ width: dotSize, height: dotSize }}
        />
    );
}

export function Avatar({ uri, size = 40, className = '', isOnline = false }: AvatarProps) {
    const [imgError, setImgError] = useState(false);

    const style = {
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
    };

    if (uri && !imgError) {
        return (
            <div className="relative flex flex-shrink-0">
                <div
                    className={`rounded-full overflow-hidden bg-gray-200 flex-shrink-0 ${className}`}
                    style={style}
                >
                    <img
                        src={uri}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                </div>
                {isOnline && <OnlineDot size={size} />}
            </div>
        );
    }

    return (
        <div className="relative flex flex-shrink-0">
            <div
                className={`rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 ${className}`}
                style={style}
            >
                <svg
                    width={size * 0.5}
                    height={size * 0.5}
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-purple-400"
                >
                    <path
                        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle
                        cx="12"
                        cy="7"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            {isOnline && <OnlineDot size={size} />}
        </div>
    );
}
