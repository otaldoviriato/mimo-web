'use client';

import React from 'react';
import { usePayment } from '@/context/PaymentContext';

interface BalanceDisplayProps {
    balance: number;
    earnings?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'transparent' | 'glass';
    clickable?: boolean;
}

export function BalanceDisplay({
    balance,
    earnings,
    size = 'md',
    variant = 'default',
    clickable = true,
}: BalanceDisplayProps) {
    const { openRechargeModal } = usePayment();

    const formatBRL = (val: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Math.floor(val) / 100);
    };

    const formatted = formatBRL(balance);
    const formattedEarnings = earnings ? formatBRL(earnings) : '';

    const sizeClasses = {
        sm: 'text-[11px] px-3 py-1.5',
        md: 'text-xs px-4 py-2',
        lg: 'text-sm px-5 py-2.5',
    };

    const variantClasses = {
        default: 'bg-white text-gray-900 border border-gray-100 shadow-sm',
        transparent: 'bg-purple-800/30 text-white border border-white/10 backdrop-blur-sm',
        glass: 'bg-white/10 text-white border border-white/20 backdrop-blur-md shadow-xl shadow-black/5',
    };

    const baseClasses = `inline-flex items-center justify-center font-black rounded-xl transition-all duration-300 whitespace-nowrap ${sizeClasses[size]} ${variantClasses[variant]}`;
    const showEarnings = Boolean(earnings && earnings > 0);

    const content = (
        <div className="flex flex-col items-center justify-center leading-none">
            <span className="tracking-tighter">{formatted}</span>
            {showEarnings && (
                <div className="flex items-center gap-1 mt-1 text-green-400 animate-in fade-in slide-in-from-top-1 duration-500">
                    <span className="text-[9px] font-black">+{formattedEarnings}</span>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <polyline points="7 9 12 4 17 9"></polyline>
                    </svg>
                </div>
            )}
        </div>
    );

    if (!clickable) {
        return (
            <div className={baseClasses}>
                {content}
            </div>
        );
    }

    return (
        <button
            onClick={openRechargeModal}
            className={`${baseClasses} hover:scale-[1.02] active:scale-[0.98] hover:shadow-md cursor-pointer`}
        >
            {content}
        </button>
    );
}
