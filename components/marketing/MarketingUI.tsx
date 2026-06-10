import { Loader2, SearchX } from 'lucide-react';

export const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100';
export const labelClass = 'mb-1.5 block text-xs font-bold text-slate-600';
export const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-purple-200 hover:bg-purple-50 disabled:opacity-50';

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <section className={`rounded-2xl border border-slate-200/90 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function PageIntro({ title, description, action }: {
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
            </div>
            {action}
        </div>
    );
}

export function LoadingState({ text = 'Carregando...' }: { text?: string }) {
    return (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
            <p className="text-sm font-semibold text-slate-500">{text}</p>
        </div>
    );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
            <SearchX className="h-9 w-9 text-slate-300" />
            <h3 className="mt-4 font-black text-slate-700">{title}</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
        </div>
    );
}

export function StatusBadge({ children, tone = 'slate' }: {
    children: React.ReactNode;
    tone?: 'purple' | 'green' | 'amber' | 'red' | 'blue' | 'slate';
}) {
    const styles = {
        purple: 'border-purple-200 bg-purple-50 text-purple-700',
        green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        red: 'border-rose-200 bg-rose-50 text-rose-700',
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        slate: 'border-slate-200 bg-slate-50 text-slate-600',
    };
    return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[tone]}`}>{children}</span>;
}
