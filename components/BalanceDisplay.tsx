'use client';

import React from 'react';
import { usePayment } from '@/context/PaymentContext';

interface BalanceDisplayProps {
    balance: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'transparent';
    clickable?: boolean;
}

export function BalanceDisplay({
    balance,
    size = 'md',
    variant = 'default',
    clickable = true,
}: BalanceDisplayProps) {
    const { openRechargeModal } = usePayment();

    const formatted = (balance / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });

    const sizeClasses = {
        sm: 'text-xs px-2 py-1 gap-1',
        md: 'text-sm px-3 py-1.5 gap-1.5',
        lg: 'text-base px-4 py-2 gap-2',
    };

    const baseClasses = `inline-flex items-center font-semibold rounded-full ${sizeClasses[size]}`;

    const variantClasses = {
        default: 'bg-purple-100 text-purple-700',
        transparent: 'bg-white/20 text-white',
    };

    if (!clickable) {
        return (
            <span className={`${baseClasses} ${variantClasses[variant]}`}>
                <WalletIcon size={size} variant={variant} />
                {formatted}
            </span>
        );
    }

    return (
        <button
            onClick={openRechargeModal}
            className={`${baseClasses} ${variantClasses[variant]} hover:opacity-80 transition-opacity cursor-pointer`}
        >
            <WalletIcon size={size} variant={variant} />
            {formatted}
        </button>
    );
}

function WalletIcon({ size, variant }: { size: string; variant: string }) {
    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
    return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
            <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}
