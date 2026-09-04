import Link from 'next/link';
import { BadgeCheck, MessageCircle, ShieldCheck } from 'lucide-react';

export default function ProfessionalSelectionPage() {
    return (
        <main className="min-h-screen bg-slate-950 px-5 py-16 text-white">
            <div className="mx-auto max-w-3xl">
                <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-200">Seleção de profissionais</span>
                <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">O Mimo leva clientes até profissionais selecionadas.</h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">Estamos formando um grupo pequeno de perfis completos, verificados e preparados para receber a demanda gerada pelas campanhas do marketplace.</p>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><ShieldCheck className="text-purple-300" /><h2 className="mt-4 font-bold">Verificação</h2><p className="mt-2 text-sm text-slate-400">Identidade e perfil passam por análise da equipe.</p></div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><BadgeCheck className="text-purple-300" /><h2 className="mt-4 font-bold">Perfil completo</h2><p className="mt-2 text-sm text-slate-400">Foto, capa, biografia e galeria são obrigatórios.</p></div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><MessageCircle className="text-purple-300" /><h2 className="mt-4 font-bold">Conversas reais</h2><p className="mt-2 text-sm text-slate-400">Cada mensagem paga gera repasse imediato.</p></div>
                </div>

                <div className="mt-10 flex flex-wrap gap-3">
                    <a href="mailto:contato@mimochat.com.br?subject=Seleção%20de%20profissionais%20Mimo" className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold hover:bg-purple-500">Falar com a equipe</a>
                    <Link href="/login" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-white/5">Entrar no Mimo</Link>
                </div>
            </div>
        </main>
    );
}
