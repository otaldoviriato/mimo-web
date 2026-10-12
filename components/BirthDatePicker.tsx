'use client';

import { useEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { CalendarDays } from 'lucide-react';
import { validateApplicantBirthDate } from '@/lib/applicant';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ROW = 40;

function Wheel({ label, options, value, onChange }: { label: string; options: string[]; value: number; onChange: (index: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const scrolling = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
        if (!scrolling.current && ref.current) ref.current.scrollTop = value * ROW;
    }, [value, options.length]);
    useEffect(() => () => clearTimeout(timer.current), []);
    function select(index: number) {
        const next = Math.max(0, Math.min(options.length - 1, index));
        scrolling.current = false;
        ref.current?.scrollTo({ top: next * ROW, behavior: 'instant' });
        onChange(next);
    }
    return <div className="min-w-0">
        <p className="mb-2 text-center text-xs font-medium text-slate-500">{label}</p>
        <div className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-20 h-10 rounded-xl bg-purple-100/70" />
            <div ref={ref} role="spinbutton" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={options.length - 1} aria-valuenow={value} aria-valuetext={options[value]}
                data-vaul-no-drag
                className="relative h-[200px] snap-y snap-mandatory overflow-y-auto overscroll-contain py-20 outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl"
                onScroll={event => {
                    scrolling.current = true;
                    const index = Math.max(0, Math.min(options.length - 1, Math.round(event.currentTarget.scrollTop / ROW)));
                    onChange(index);
                    clearTimeout(timer.current);
                    timer.current = setTimeout(() => { scrolling.current = false; }, 150);
                }}
                onKeyDown={event => {
                    const delta = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[event.key];
                    if (delta !== undefined || event.key === 'Home' || event.key === 'End') {
                        event.preventDefault();
                        select(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : value + (delta || 0));
                    }
                }}>
                {options.map((option, index) => <button key={option} type="button" tabIndex={-1} aria-hidden="true" onClick={() => select(index)}
                    className={`block h-10 w-full snap-center text-center text-base transition-colors ${index === value ? 'font-semibold text-purple-800' : 'text-slate-400'}`}>{option}</button>)}
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
        </div>
    </div>;
}

export function BirthDatePicker({ value, onChange, disabled, className }: { value: string; onChange: (date: string) => void; disabled: boolean; className: string }) {
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState({ day: 1, month: 0, year: 2008 });
    const currentYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()));
    const years = Array.from({ length: 121 }, (_, index) => String(currentYear - index));
    const days = new Date(date.year, date.month + 1, 0).getDate();
    const day = Math.min(date.day, days);
    const iso = `${date.year}-${String(date.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const [error, setError] = useState<string | null>(null);
    function updateDate(next: (previous: typeof date) => typeof date) {
        setError(null);
        setDate(next);
    }
    function confirmDate() {
        const validationError = validateApplicantBirthDate(iso);
        setError(validationError);
        if (validationError) return;
        onChange(iso.split('-').reverse().join('/'));
        setOpen(false);
    }
    function changeOpen(next: boolean) {
        if (next) {
            setError(null);
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
            const part = (type: string) => Number(parts.find(item => item.type === type)?.value);
            const [d, m, y] = value.split('/').map(Number);
            setDate(value ? { day: d, month: m - 1, year: y } : { day: part('day'), month: part('month') - 1, year: part('year') - 18 });
        }
        setOpen(next);
    }
    return <Drawer.Root open={open} onOpenChange={changeOpen} repositionInputs={false}>
        <Drawer.Trigger asChild>
            <button id="applicant-birth" type="button" disabled={disabled} className={`${className} flex items-center justify-between text-left`}>
                <span className={value ? '' : 'text-slate-400'}>{value || 'Selecione sua data'}</span><CalendarDays size={16} className="text-purple-500" aria-hidden="true" />
            </button>
        </Drawer.Trigger>
        <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-[150] bg-slate-950/40" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-[151] mx-auto max-w-md rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] outline-none">
                <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
                <Drawer.Title className="text-center text-lg font-semibold text-slate-900">Data de nascimento</Drawer.Title>
                <Drawer.Description className="mt-1 text-center text-sm text-slate-500">Deslize para escolher dia, mês e ano.</Drawer.Description>
                <div className="mt-5 grid grid-cols-[1fr_2fr_1fr] gap-2">
                    <Wheel label="Dia" options={Array.from({ length: days }, (_, i) => String(i + 1))} value={day - 1} onChange={index => updateDate(prev => ({ ...prev, day: index + 1 }))} />
                    <Wheel label="Mês" options={MONTHS} value={date.month} onChange={month => updateDate(prev => ({ ...prev, month, day: Math.min(prev.day, new Date(prev.year, month + 1, 0).getDate()) }))} />
                    <Wheel label="Ano" options={years} value={currentYear - date.year} onChange={index => updateDate(prev => ({ ...prev, year: currentYear - index, day: Math.min(prev.day, new Date(currentYear - index, prev.month + 1, 0).getDate()) }))} />
                </div>
                {error && <p role="alert" className="mt-2 text-center text-xs text-rose-600">{error}</p>}
                <button type="button" onClick={confirmDate} className="mt-4 h-11 w-full rounded-xl bg-purple-600 text-sm font-semibold text-white disabled:opacity-40">Confirmar data</button>
                <Drawer.Close className="mt-2 h-9 w-full text-sm text-slate-500">Cancelar</Drawer.Close>
            </Drawer.Content>
        </Drawer.Portal>
    </Drawer.Root>;
}
