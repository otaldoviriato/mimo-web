'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export function Input({
    label,
    error,
    containerClassName = '',
    className = '',
    ...props
}: InputProps) {
    return (
        <div className={`flex flex-col gap-1 ${containerClassName}`}>
            {label && (
                <label className="text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}
            <input
                className={`
                    w-full px-4 py-3 rounded-xl border text-gray-900 text-sm
                    placeholder-gray-400 bg-white
                    transition-colors duration-150
                    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    ${error ? 'border-red-400' : 'border-gray-200'}
                    ${className}
                `}
                {...props}
            />
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
}
