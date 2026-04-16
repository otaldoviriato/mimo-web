'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { userApi } from '@/services/api';

interface ProcessingPaymentViewProps {
    transactionId: string;
    onPaymentComplete: () => void;
    onCancel: () => void;
}

export function ProcessingPaymentView({ transactionId, onPaymentComplete, onCancel }: ProcessingPaymentViewProps) {
    const [isPaid, setIsPaid] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const checkStatus = async () => {
        if (!transactionId || isPaid) return;
        try {
            const statusData = await userApi.checkPixStatus(transactionId);
            if (statusData?.status === 'PAID') {
                setIsPaid(true);
                onPaymentComplete();
            } else if (statusData?.status === 'CANCELLED') {
                onCancel();
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    };

    useEffect(() => {
        if (isPaid || !transactionId) return;
        const pollInterval = setInterval(checkStatus, 5000);
        return () => clearInterval(pollInterval);
    }, [isPaid, transactionId]);

    const handleManualCheck = async () => {
        setIsChecking(true);
        await checkStatus();
        setIsChecking(false);
    };

    return (
        <div className="flex flex-col items-center w-full py-4">
            <div className="w-full flex justify-end mb-4">
                <button
                    onClick={onCancel}
                    className="p-2 text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                        <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </div>
                {!isPaid && (
                    <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center">
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">Estamos processando</h2>

            <p className="text-base text-gray-500 text-center px-6 leading-relaxed mb-6">
                Aguarde um instante. Seu banco está analisando e processando o pagamento do cartão de crédito.
            </p>

            <div className="flex items-center gap-2 bg-purple-100 px-5 py-2 rounded-full mb-6">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-purple-600">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-medium text-purple-700">Transação em andamento</span>
            </div>

            <p className="text-xs text-gray-400 text-center px-8 mb-6">
                Você pode fechar esta janela. Notificaremos quando o saldo estiver disponível.
            </p>

            <Button
                title={isPaid ? 'Pagamento Aprovado!' : 'Atualizar Status'}
                onPress={handleManualCheck}
                variant={isPaid ? 'primary' : 'outline'}
                size="md"
                loading={isChecking}
                disabled={isPaid}
                className="w-full"
            />
        </div>
    );
}
