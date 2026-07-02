'use client';

import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { DollarSign, Timer, Lock, X } from 'lucide-react';

interface MediaComposerSheetProps {
    previewUrl: string | null;
    isVideo: boolean;
    onCancel: () => void;
    onConfirm: (priceInCents: number, isTemporary: boolean, expiryMinutes: number) => void;
}

const PRICE_OPTIONS = [
    { label: 'Grátis', value: 'free', price: 0 },
    { label: 'R$ 5', value: '5', price: 5 },
    { label: 'R$ 10', value: '10', price: 10 },
    { label: 'R$ 20', value: '20', price: 20 },
    { label: 'R$ 50', value: '50', price: 50 },
    { label: 'Personalizado', value: 'custom', price: null },
] as const;

const DURATION_OPTIONS = [
    { label: 'Permanente', value: 'permanent' },
    { label: '10 segundos', value: '10s' },
    { label: '30 segundos', value: '30s' },
    { label: '1 minuto', value: '1min' },
    { label: '30 minutos', value: '30min' },
    { label: '1 dia', value: '24h' },
    { label: '1 semana', value: '7d' },
    { label: 'Personalizado', value: 'custom_duration' },
] as const;

export function MediaComposerSheet({ previewUrl, isVideo, onCancel, onConfirm }: MediaComposerSheetProps) {
    const [mediaPriceStr, setMediaPriceStr] = useState('');
    const [mediaPriceType, setMediaPriceType] = useState<'free' | 'paid'>('free');
    const [mediaPriceFormatted, setMediaPriceFormatted] = useState('R$ 0,00');
    const [isTemporary, setIsTemporary] = useState(false);
    const [expiryOption, setExpiryOption] = useState<'permanent' | '10s' | '30s' | '1min' | '30min' | '24h' | '7d' | 'custom'>('permanent');
    const [customExpiryValue, setCustomExpiryValue] = useState(1);
    const [customExpiryUnit, setCustomExpiryUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('hours');

    const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleanValue = e.target.value.replace(/\D/g, '');
        const numberValue = parseFloat(cleanValue) / 100;
        if (isNaN(numberValue)) {
            setMediaPriceFormatted('R$ 0,00');
            setMediaPriceStr('0');
            return;
        }
        setMediaPriceFormatted(numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        setMediaPriceStr(numberValue.toFixed(2));
    };

    const handleSubmit = () => {
        const price = parseFloat(mediaPriceStr || '0');
        if (mediaPriceType === 'paid' && (!price || price <= 0)) {
            alert('Por favor, defina um valor maior que R$ 0,00 para mídias pagas.');
            return;
        }

        let expiryMinutes = 60;
        if (isTemporary) {
            const val = customExpiryValue || 1;
            const unit = customExpiryUnit as string;
            if (unit === 'seconds') expiryMinutes = val / 60;
            else if (unit === 'minutes') expiryMinutes = val;
            else if (unit === 'hours') expiryMinutes = val * 60;
            else if (unit === 'days') expiryMinutes = val * 1440;
        }

        onConfirm(Math.round(price * 100), isTemporary, expiryMinutes);
    };

    return (
        <Drawer.Root open onOpenChange={(open) => !open && onCancel()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-[100] bg-gray-950/55 backdrop-blur-[2px]" />
                <Drawer.Content className="fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.18)] outline-none">
                    {/* Header */}
                    <div className="shrink-0 border-b border-gray-100 px-5 pb-4 pt-3 bg-white">
                        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Configurar envio</p>
                                <Drawer.Title className="mt-0.5 text-xl font-bold tracking-tight text-gray-900">
                                    {isVideo ? 'Enviar vídeo' : 'Enviar foto'}
                                </Drawer.Title>
                            </div>
                            <button
                                type="button"
                                onClick={onCancel}
                                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* Corpo scrollável */}
                    <div className="flex w-full flex-1 flex-col overflow-y-auto min-h-0 px-5 py-4 gap-5">
                        {/* Preview da mídia */}
                        <div className="relative w-full rounded-2xl bg-slate-100 overflow-hidden shrink-0" style={{ height: '240px' }}>
                            {previewUrl ? (
                                isVideo ? (
                                    <video
                                        src={previewUrl}
                                        className={`w-full h-full object-cover transition-all duration-300 ${mediaPriceType === 'paid' ? 'blur-md scale-105' : ''}`}
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={previewUrl}
                                        alt="Prévia da mídia"
                                        className={`w-full h-full object-cover transition-all duration-300 ${mediaPriceType === 'paid' ? 'blur-md scale-105' : ''}`}
                                    />
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                                </div>
                            )}

                            {mediaPriceType === 'paid' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 select-none">
                                    <Lock size={30} className="text-white opacity-90" strokeWidth={2} />
                                    <span className="text-white text-xs font-bold opacity-90">Conteúdo pago</span>
                                </div>
                            )}

                            {mediaPriceType === 'paid' && mediaPriceFormatted !== 'R$ 0,00' && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                    <Lock size={11} strokeWidth={2.5} />
                                    {mediaPriceFormatted}
                                </div>
                            )}
                        </div>

                        {/* Preço */}
                        <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center gap-1.5 border-b border-gray-50 px-4 py-3">
                                <DollarSign size={13} className="text-gray-400" strokeWidth={2.5} />
                                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                                    Preço {isVideo ? 'do vídeo' : 'da foto'}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2.5 p-3.5">
                                <div className="flex flex-wrap gap-2">
                                    {PRICE_OPTIONS.map((opt) => {
                                        const isSelected = opt.value === 'free'
                                            ? mediaPriceType === 'free'
                                            : opt.value === 'custom'
                                            ? mediaPriceType === 'paid' && !['5', '10', '20', '50'].includes(mediaPriceStr)
                                            : mediaPriceType === 'paid' && mediaPriceStr === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    if (opt.value === 'free') {
                                                        setMediaPriceType('free');
                                                        setMediaPriceStr('0');
                                                        setMediaPriceFormatted('R$ 0,00');
                                                    } else if (opt.value === 'custom') {
                                                        setMediaPriceType('paid');
                                                        setMediaPriceStr('');
                                                        setMediaPriceFormatted('');
                                                    } else {
                                                        setMediaPriceType('paid');
                                                        setMediaPriceStr(opt.value);
                                                        setMediaPriceFormatted('R$ ' + opt.value + ',00');
                                                    }
                                                }}
                                                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all active:scale-95 ${
                                                    isSelected
                                                        ? 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-200'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {mediaPriceType === 'paid' && !['5', '10', '20', '50'].includes(mediaPriceStr) && (
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 animate-in slide-in-from-top-1 duration-150">
                                        <span className="text-sm font-bold text-slate-400">R$</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            autoFocus
                                            className="flex-1 bg-transparent text-sm font-semibold text-slate-800 focus:outline-none placeholder:text-slate-300"
                                            placeholder="0,00"
                                            value={mediaPriceFormatted.replace('R$', '').trim() === '0,00' ? '' : mediaPriceFormatted.replace('R$', '').trim()}
                                            onChange={handlePriceInputChange}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Duração */}
                        <div className="rounded-lg border border-gray-100 bg-white shadow-sm">
                            <div className="flex items-center gap-1.5 border-b border-gray-50 px-4 py-3">
                                <Timer size={13} className="text-gray-400" strokeWidth={2.5} />
                                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                                    Duração {isVideo ? 'do vídeo' : 'da foto'}
                                </p>
                            </div>
                            <div className="flex flex-col gap-2.5 p-3.5">
                                <div className="flex flex-wrap gap-2">
                                    {DURATION_OPTIONS.map((opt) => {
                                        const isSelected = opt.value === 'permanent'
                                            ? !isTemporary
                                            : opt.value === 'custom_duration'
                                            ? isTemporary && !['10s', '30s', '1min', '30min', '24h', '7d'].includes(expiryOption)
                                            : isTemporary && expiryOption === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => {
                                                    if (opt.value === 'permanent') {
                                                        setIsTemporary(false);
                                                        setExpiryOption('permanent');
                                                    } else if (opt.value === 'custom_duration') {
                                                        setIsTemporary(true);
                                                        setExpiryOption('custom');
                                                        setCustomExpiryValue(1);
                                                        setCustomExpiryUnit('hours');
                                                    } else {
                                                        setIsTemporary(true);
                                                        setExpiryOption(opt.value as any);
                                                        if (opt.value === '10s') { setCustomExpiryValue(10); setCustomExpiryUnit('seconds'); }
                                                        else if (opt.value === '30s') { setCustomExpiryValue(30); setCustomExpiryUnit('seconds'); }
                                                        else if (opt.value === '1min') { setCustomExpiryValue(1); setCustomExpiryUnit('minutes'); }
                                                        else if (opt.value === '30min') { setCustomExpiryValue(30); setCustomExpiryUnit('minutes'); }
                                                        else if (opt.value === '24h') { setCustomExpiryValue(24); setCustomExpiryUnit('hours'); }
                                                        else if (opt.value === '7d') { setCustomExpiryValue(7); setCustomExpiryUnit('days'); }
                                                    }
                                                }}
                                                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all active:scale-95 ${
                                                    isSelected
                                                        ? 'bg-purple-600 border-purple-600 text-white shadow-sm shadow-purple-200'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {isTemporary && expiryOption === 'custom' && (
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 animate-in slide-in-from-top-1 duration-150">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-16 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none text-center py-1"
                                            value={customExpiryValue}
                                            onChange={(e) => setCustomExpiryValue(Math.max(1, parseInt(e.target.value) || 1))}
                                        />
                                        <select
                                            className="flex-1 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                            value={customExpiryUnit}
                                            onChange={(e) => setCustomExpiryUnit(e.target.value as 'seconds' | 'minutes' | 'hours' | 'days')}
                                        >
                                            <option value="seconds">Segundos</option>
                                            <option value="minutes">Minutos</option>
                                            <option value="hours">Horas</option>
                                            <option value="days">Dias</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer fixo — nunca sai da tela */}
                    <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-base rounded-2xl transition-all active:scale-[0.98] shadow-md shadow-purple-200 flex items-center justify-center gap-2"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            {isVideo ? 'Enviar vídeo' : 'Enviar foto'}
                        </button>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
