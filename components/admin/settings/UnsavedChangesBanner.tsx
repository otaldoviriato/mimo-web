'use client';

import React from 'react';
import { AlertTriangle, Save, Loader2 } from 'lucide-react';

interface UnsavedChangesBannerProps {
    isDirty: boolean;
    saving: boolean;
    onSave: () => void;
}

export function UnsavedChangesBanner({ isDirty, saving, onSave }: UnsavedChangesBannerProps) {
    if (!isDirty && !saving) return null;

    return (
        <div className="sticky top-0 z-30 w-full animate-fade-in-up">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-md shadow-amber-100/80">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                        <AlertTriangle size={15} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-900 leading-tight">Alterações não salvas</p>
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                            Você modificou campos nesta página. Clique em salvar para aplicar as mudanças.
                        </p>
                    </div>
                </div>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-600/20 cursor-pointer shrink-0"
                >
                    {saving ? (
                        <Loader2 size={13} className="animate-spin" />
                    ) : (
                        <Save size={13} />
                    )}
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
            </div>
        </div>
    );
}
