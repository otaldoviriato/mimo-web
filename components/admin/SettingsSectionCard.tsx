'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SettingsSectionCardProps {
    title: string;
    icon: React.ReactNode;
    storageKey: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export function SettingsSectionCard({ title, icon, storageKey, defaultOpen = true, children }: SettingsSectionCardProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`admin-section-${storageKey}`);
            if (stored !== null) {
                setIsOpen(stored === 'true');
            }
        }
    }, [storageKey]);

    const toggle = () => {
        const next = !isOpen;
        setIsOpen(next);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`admin-section-${storageKey}`, String(next));
        }
    };

    return (
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
                type="button"
                onClick={toggle}
                className="w-full flex items-center justify-between p-5 bg-slate-50/60 hover:bg-slate-100/60 transition-colors text-left select-none cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <span className="text-purple-600">{icon}</span>
                    <span className="text-sm font-bold text-slate-700">{title}</span>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            {isOpen && (
                <div className="p-5 border-t border-slate-100 bg-white space-y-5">
                    {children}
                </div>
            )}
        </div>
    );
}
