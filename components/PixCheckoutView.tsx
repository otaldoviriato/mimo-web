'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './Button';
import { userApi } from '@/services/api';

interface PixCheckoutViewProps {
    amount: number;
    pixData?: any;
    onPaymentComplete: () => void;
    onCancel: () => void;
}

export function PixCheckoutView({ amount, pixData, onPaymentComplete, onCancel }: PixCheckoutViewProps) {
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [isPaid, setIsPaid] = useState(false);
    const [copied, setCopied] = useState(false);

    const pixCode = pixData?.brCode || '';

    useEffect(() => {
        if (timeLeft <= 0) return;
        const interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const checkStatus = async () => {
        const tId = pixData?.transactionId || pixData?.id;
        if (!tId || isPaid) return;
        try {
            const statusData = await userApi.checkPixStatus(tId);
            if (statusData?.status === 'PAID') {
                setIsPaid(true);
                onPaymentComplete();
            }
        } catch (error) {
            console.error('Error checking pix status:', error);
        }
    };

    useEffect(() => {
        const tId = pixData?.transactionId || pixData?.id;
        if (isPaid || !tId) return;
        const pollInterval = setInterval(checkStatus, 5000);
        return () => clearInterval(pollInterval);
    }, [isPaid, pixData]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(pixCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { }
    };

    return (
        <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-between w-full mb-6">
                <button
                    onClick={onCancel}
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h2 className="text-lg font-bold text-gray-900">Pagamento via Pix</h2>
                <div className="w-10" />
            </div>

            <div className="text-center mb-6">
                <p className="text-sm text-gray-500">Valor a pagar:</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                    R$ {amount.toFixed(2).replace('.', ',')}
                </p>
            </div>

            <div className="p-6 bg-white border border-gray-200 rounded-2xl mb-4">
                {pixCode && pixCode.length > 30 ? (
                    <QRCodeSVG value={pixCode} size={200} />
                ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-xl">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                            <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
                            <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
                            <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" />
                            <path d="M14 14h1v1h-1zM16 14h1v1h-1zM18 14h3v1h-3zM14 16h1v1h-1zM16 16h1v3h-1zM18 16h1v1h-1zM20 16h1v3h-1zM18 18h1v1h-1z" fill="currentColor" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mb-1">
                {!isPaid && (
                    <svg className="animate-spin h-4 w-4 text-purple-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                )}
                <span className="text-base font-medium text-purple-600">
                    {isPaid ? 'Pagamento Concluído!' : `Aguardando... ${formatTime(timeLeft)}`}
                </span>
            </div>
            <p className="text-xs text-gray-500 mb-6">Esta tela atualiza automaticamente</p>

            {pixCode && (
                <div className="w-full mb-6">
                    <p className="text-sm font-medium text-gray-900 mb-2">Copia e Cola:</p>
                    <div className="flex items-center rounded-xl overflow-hidden border border-gray-200">
                        <p className="flex-1 px-4 py-2 text-xs text-gray-500 truncate">{pixCode}</p>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors whitespace-nowrap"
                        >
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
