'use client';

import React, { useState } from 'react';

interface AvatarProps {
    uri?: string | null;
    size?: number;
    className?: string;
}

export function Avatar({ uri, size = 40, className = '' }: AvatarProps) {
    const [imgError, setImgError] = useState(false);

    const style = {
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
    };

    if (uri && !imgError) {
        return (
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
        );
    }

    return (
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
    );
}
