'use client';

import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    change: string;
    isPositive: boolean;
    icon: LucideIcon;
    color: 'purple' | 'green' | 'blue' | 'amber';
}

export function StatsCard({ title, value, change, isPositive, icon: Icon, color }: StatsCardProps) {
    const colorMap = {
        purple: {
            bg: 'bg-purple-50 text-purple-600 border-purple-100',
            glow: 'hover:shadow-purple-500/5',
        },
        green: {
            bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            glow: 'hover:shadow-emerald-500/5',
        },
        blue: {
            bg: 'bg-blue-50 text-blue-600 border-blue-100',
            glow: 'hover:shadow-blue-500/5',
        },
        amber: {
            bg: 'bg-amber-50 text-amber-600 border-amber-100',
            glow: 'hover:shadow-amber-500/5',
        },
    };

    return (
        <div className={`bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex items-start justify-between cursor-default group hover:-translate-y-0.5 ${colorMap[color].glow}`}>
            <div className="space-y-3">
                <span className="text-sm font-bold text-slate-500 tracking-tight block">
                    {title}
                </span>
                <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-extrabold text-slate-800 tracking-tight block">
                        {value}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                        isPositive 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {change}
                    </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                    Comparado ao mesmo período anterior
                </p>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${colorMap[color].bg}`}>
                <Icon size={22} className="stroke-[2.2]" />
            </div>
        </div>
    );
}
