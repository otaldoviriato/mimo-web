'use client';

import React from 'react';
import { Colors } from '@/constants/theme';

interface ButtonProps {
    title: string;
    onPress?: () => void;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}

export function Button({
    title,
    onPress,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    className = '',
    type = 'button',
}: ButtonProps) {
    const handleClick = onPress || onClick;

    const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500';

    const sizeClasses = {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    const variantClasses = {
        primary: 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50',
        secondary: 'bg-purple-100 text-purple-700 hover:bg-purple-200 active:bg-purple-300 disabled:opacity-50',
        outline: 'border-2 border-purple-600 text-purple-600 bg-transparent hover:bg-purple-50 active:bg-purple-100 disabled:opacity-50',
        ghost: 'text-purple-600 bg-transparent hover:bg-purple-50 active:bg-purple-100 disabled:opacity-50',
    };

    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={isDisabled}
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : icon ? (
                <span className="flex items-center">{icon}</span>
            ) : null}
            {title}
        </button>
    );
}
