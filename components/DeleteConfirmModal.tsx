'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteConfirmModal({
    isOpen,
    title = 'Remover foto',
    description = 'Tem certeza de que deseja remover esta foto? Esta ação não pode ser desfeita.',
    confirmText = 'Remover',
    cancelText = 'Cancelar',
    isDanger = true,
    onClose,
    onConfirm,
}: DeleteConfirmModalProps) {
    const [visible, setVisible] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimateIn(true));
            });
        } else {
            setAnimateIn(false);
            const timer = setTimeout(() => setVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 select-none"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
                style={{ opacity: animateIn ? 1 : 0 }}
            />

            <div
                className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl transition-all duration-200"
                style={{
                    opacity: animateIn ? 1 : 0,
                    transform: animateIn ? 'scale(1)' : 'scale(0.95)',
                }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    aria-label="Fechar"
                >
                    <X size={16} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
                        <Trash2 className="h-6 w-6" />
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                        {title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-xs">
                        {description}
                    </p>

                    <div className="mt-6 flex w-full gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-xs font-bold text-slate-700 transition-all cursor-pointer"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onConfirm();
                            }}
                            className={`flex-1 h-11 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] shadow-md cursor-pointer ${
                                isDanger
                                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
