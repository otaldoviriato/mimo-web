'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SortableColumnHeaderProps {
    label: string;
    active: boolean;
    direction: 'asc' | 'desc';
    onClick: () => void;
}

export function SortableColumnHeader({ label, active, direction, onClick }: SortableColumnHeaderProps) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1 hover:text-purple-600 transition-colors cursor-pointer select-none"
        >
            {label}
            {active ? (
                direction === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
            ) : (
                <ChevronsUpDown size={11} className="opacity-40" />
            )}
        </button>
    );
}
