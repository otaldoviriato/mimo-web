'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import {
    ArrowRight,
    BadgeCheck,
    Bell,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronDown,
    CircleDollarSign,
    CreditCard,
    FileCheck2,
    HeartHandshake,
    ImageIcon,
    Landmark,
    LockKeyhole,
    Menu,
    MessageCircle,
    MessageCircleHeart,
    PlayCircle,
    Send,
    ShieldCheck,
    Sparkles,
    Star,
    Users,
    Video,
    WalletCards,
    X,
    Zap,
} from 'lucide-react';
import { InstagramIcon } from '@/components/InstagramIcon';

const initialForm = {
    fullName: '',
    artisticName: '',
    instagram: '',
    whatsapp: '',
    email: '',
    age: '',
    cityState: '',
    hasOnlineExperience: '',
    howFoundMimo: 'Página para criadoras 2',
    reason: '',
    isAdultConfirmed: false,
    contactConsent: false,
    company: '',
};

type FormState = typeof initialForm;

const inputClass =
    'mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-fuchsia-400 focus:bg-white/10 focus:ring-4 focus:ring-fuchsia-500/10';

const monetization = [
    {
        icon: MessageCircle,
        number: '01',
        title: 'Mensagens pagas',
        text: 'Você define o valor por caractere. Cada conversa respeita o preço configurado no seu perfil.',
        accent: 'from-violet-500 to-purple-600',
    },
    {
        icon: ImageIcon,
        number: '02',
        title: 'Fotos exclusivas',
        text: 'Envie uma foto bloqueada dentro do chat e escolha quanto ela custa para ser revelada.',
        accent: 'from-fuchsia-500 to-pink-500',
    },
    {
        icon: Video,
        number: '03',
        title: 'Vídeos privados',
        text: 'Compartilhe vídeos pagos na própria conversa, sem tirar sua audiência do fluxo.',
        accent: 'from-orange-400 to-rose-500',
    },
];

const founderBenefits = [
    ['Taxas reduzidas vitalícias', 'Condição especial para as primeiras criadoras aprovadas no programa.'],
    ['Canal direto com os founders', 'Suporte próximo, feedback prioritário e participação nos testes.'],
    ['Selo de Criadora Fundadora', 'Reconhecimento do seu pioneirismo dentro do ecossistema Mimo.'],
    ['Poder de cocriar o produto', 'Sua rotina e suas sugestões ajudam a definir o que construímos.'],
];

const trustItems = [
    {
        icon: Landmark,
        title: 'Empresa brasileira',
        text: 'LEAD CONTEUDOS DIGITAIS LTDA',
        detail: 'CNPJ 60.312.273/0001-01',
    },
    {
        icon: ShieldCheck,
        title: 'Privacidade e LGPD',
        text: 'Dados tratados conforme a legislação brasileira.',
        detail: 'Política pública e transparente',
    },
    {
        icon: CreditCard,
        title: 'Pagamentos integrados',
        text: 'Pix e cartão processados por parceiros especializados.',
        detail: 'Asaas, AbacatePay e outros',
    },
    {
        icon: LockKeyhole,
        title: 'Dados protegidos',
        text: 'Seus fãs não acessam documentos ou dados pessoais.',
        detail: 'Segurança desde o cadastro',
    },
];

const faqs = [
    ['Preciso ter muitos seguidores?', 'Não. O mais importante é ter uma audiência real e vontade de construir uma relação próxima com ela. Cada candidatura é analisada individualmente.'],
    ['O Mimo garante renda?', 'Não. O Mimo oferece a tecnologia para monetizar conversas e conteúdos. Os resultados dependem da sua audiência, divulgação, disponibilidade e estratégia.'],
    ['Preciso baixar um aplicativo?', 'Não. O Mimo funciona no navegador e pode ser instalado na tela inicial do celular como um aplicativo, com acesso rápido e notificações.'],
    ['Quem pode participar?', 'A plataforma é exclusiva para maiores de 18 anos. Na fase inicial, as novas criadoras passam por uma análise de perfil antes da liberação.'],
];

function scrollToApplication() {
    document.getElementById('participar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function ParaCriadorasLanding() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [form, setForm] = useState<FormState>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
        setForm(current => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');

        const age = Number(form.age);
        if (!Number.isInteger(age) || age < 18) {
            setError('Você precisa ter 18 anos ou mais para participar.');
            return;
        }
        if (!form.isAdultConfirmed || !form.contactConsent) {
            setError('Confirme sua idade e autorize o contato da equipe para continuar.');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/creator-applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, age }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível enviar sua candidatura.');

            setSuccess(true);
            setForm(initialForm);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Não foi possível enviar sua candidatura.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen overflow-hidden bg-[#f8f7fc] text-[#19151f] selection:bg-fuchsia-200">
            <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
                <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-[0_12px_40px_rgba(44,24,69,0.08)] backdrop-blur-xl sm:px-5">
                    <Link href="#inicio" className="flex items-center gap-2.5" aria-label="Mimo Chat para criadoras">
                        <Image src="/icon-192x192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl shadow-sm" />
                        <div className="leading-none">
                            <span className="block text-[17px] font-black tracking-[-0.03em]">Mimo Chat</span>
                            <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-[0.2em] text-violet-600">para criadoras</span>
                        </div>
                    </Link>

                    <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 lg:flex">
                        <a href="#como-funciona" className="transition hover:text-violet-700">Como funciona</a>
                        <a href="#diferencial" className="transition hover:text-violet-700">Por que o Mimo</a>
                        <a href="#founders" className="transition hover:text-violet-700">Founders</a>
                        <a href="#seguranca" className="transition hover:text-violet-700">Segurança</a>
                    </div>

                    <div className="hidden items-center gap-2 sm:flex">
                        <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
                            Entrar
                        </Link>
                        <button onClick={scrollToApplication} className="rounded-xl bg-[#6e35e9] px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5c28d3]">
                            Quero participar
                        </button>
                    </div>

                    <button onClick={() => setMenuOpen(value => !value)} className="rounded-xl border border-slate-200 p-2.5 sm:hidden" aria-label="Abrir menu">
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </nav>

                {menuOpen && (
                    <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-white bg-white p-3 shadow-xl sm:hidden">
                        {[
                            ['Como funciona', '#como-funciona'],
                            ['Por que o Mimo', '#diferencial'],
                            ['Founders', '#founders'],
                            ['Segurança', '#seguranca'],
                        ].map(([label, href]) => (
                            <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-violet-50">
                                {label}
                            </a>
                        ))}
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <Link href="/login" className="rounded-xl border border-slate-200 px-3 py-3 text-center text-sm font-bold">Entrar</Link>
                            <button onClick={() => { setMenuOpen(false); scrollToApplication(); }} className="rounded-xl bg-violet-600 px-3 py-3 text-sm font-bold text-white">Participar</button>
                        </div>
                    </div>
                )}
            </header>

            <main id="inicio">
                <section className="relative overflow-hidden px-4 pb-24 pt-36 sm:px-6 sm:pb-32 sm:pt-44">
                    <div className="absolute left-[-18rem] top-10 h-[34rem] w-[34rem] rounded-full bg-violet-300/35 blur-[120px]" />
                    <div className="absolute right-[-16rem] top-20 h-[32rem] w-[32rem] rounded-full bg-fuchsia-300/25 blur-[120px]" />
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#f8f7fc] to-transparent" />

                    <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/75 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-violet-700 shadow-sm backdrop-blur">
                                <Sparkles className="h-3.5 w-3.5" />
                                O chat onde seu tempo tem valor
                            </div>
                            <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-slate-950 sm:text-7xl lg:mx-0 lg:text-[5.3rem]">
                                Sua audiência quer
                                <span className="relative ml-2 inline-block text-violet-600">
                                    falar com você.
                                    <svg className="absolute -bottom-3 left-0 h-3 w-full text-fuchsia-400" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true">
                                        <path d="M2 9C75 1 205 1 298 8" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                                    </svg>
                                </span>
                            </h1>
                            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl lg:mx-0">
                                O Mimo é um aplicativo de mensagens criado para transformar conversas, atenção e conteúdos exclusivos em uma nova fonte de renda.
                            </p>
                            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                                <button onClick={scrollToApplication} className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6e35e9] px-7 py-4 text-base font-extrabold text-white shadow-[0_16px_35px_rgba(110,53,233,0.3)] transition hover:-translate-y-1 hover:bg-[#5c28d3] sm:w-auto">
                                    Participar da fase inicial
                                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                                </button>
                                <Link href="/creators" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-extrabold text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 sm:w-auto">
                                    Explorar área Creators
                                </Link>
                            </div>
                            <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-bold text-slate-500 lg:justify-start">
                                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Feito no Brasil</span>
                                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Para maiores de 18 anos</span>
                                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Entrada por análise</span>
                            </div>
                        </div>

                        <div className="relative mx-auto w-full max-w-[510px]">
                            <div className="absolute -left-10 top-24 hidden rounded-2xl border border-white bg-white/90 p-4 shadow-xl backdrop-blur sm:block">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-600"><CircleDollarSign className="h-5 w-5" /></div>
                                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversa de hoje</p><p className="text-lg font-black text-slate-900">Gerando valor</p></div>
                                </div>
                            </div>
                            <div className="absolute -right-4 bottom-24 z-20 hidden rounded-2xl bg-slate-950 p-4 text-white shadow-xl sm:block">
                                <div className="flex items-center gap-3">
                                    <Bell className="h-5 w-5 text-fuchsia-400" />
                                    <div><p className="text-[10px] font-bold text-white/50">NOVA MENSAGEM</p><p className="text-xs font-extrabold">Você recebeu um Mimo</p></div>
                                </div>
                            </div>

                            <div className="relative mx-auto w-[315px] rounded-[3rem] border-[9px] border-slate-950 bg-[#f7f3fa] p-2 shadow-[0_35px_80px_rgba(45,27,69,0.28)] sm:w-[350px]">
                                <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-950" />
                                <div className="overflow-hidden rounded-[2.25rem] bg-[#f8f5fb]">
                                    <div className="flex items-center gap-3 border-b border-violet-100 bg-white px-4 pb-3 pt-8">
                                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 font-black text-white">
                                            L
                                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                                        </div>
                                        <div className="flex-1"><p className="text-sm font-black">Laura M.</p><p className="text-[10px] font-semibold text-emerald-600">online agora</p></div>
                                        <BadgeCheck className="h-5 w-5 text-violet-600" />
                                    </div>
                                    <div className="flex h-[470px] flex-col justify-end gap-3 p-4">
                                        <div className="max-w-[82%] self-start rounded-2xl rounded-bl-sm bg-white p-3 text-[11px] leading-relaxed text-slate-700 shadow-sm">
                                            Oi! Vi seu story e queria muito saber mais sobre os bastidores do ensaio 💜
                                        </div>
                                        <div className="max-w-[86%] self-end rounded-2xl rounded-br-sm bg-violet-600 p-3 text-[11px] leading-relaxed text-white shadow-sm">
                                            Oi! Separei um vídeo exclusivo e algumas fotos para te mostrar por aqui.
                                        </div>
                                        <div className="max-w-[88%] self-end overflow-hidden rounded-2xl rounded-br-sm bg-slate-900 text-white shadow-xl">
                                            <div className="relative flex h-32 items-center justify-center overflow-hidden bg-linear-to-br from-fuchsia-500 via-violet-600 to-slate-950">
                                                <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_30%),radial-gradient(circle_at_80%_80%,#f0abfc_0,transparent_35%)]" />
                                                <div className="relative rounded-full border border-white/25 bg-black/30 p-3 backdrop-blur"><LockKeyhole className="h-5 w-5" /></div>
                                            </div>
                                            <div className="p-3">
                                                <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold text-white/50">VÍDEO PRIVADO</p><p className="mt-0.5 text-xs font-extrabold">Bastidores do ensaio</p></div><span className="text-sm font-black text-fuchsia-300">R$ 29,90</span></div>
                                                <div className="mt-3 rounded-xl bg-white py-2 text-center text-[10px] font-black text-violet-700">Desbloquear conteúdo</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
                                            <span className="flex-1 px-2 text-[10px] text-slate-400">Escreva uma mensagem...</span>
                                            <span className="rounded-xl bg-violet-600 p-2 text-white"><Send className="h-4 w-4" /></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-violet-100 bg-white py-7">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-5 px-4 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400 sm:px-6">
                        <span className="text-slate-800">Um ecossistema conectado</span>
                        <a href="https://www.instagram.com/mimochat.oficial/" target="_blank" rel="noreferrer" className="flex items-center gap-2 transition hover:text-fuchsia-600"><InstagramIcon className="h-4 w-4" /> Instagram</a>
                        <Link href="/institucional" className="flex items-center gap-2 transition hover:text-violet-600"><FileCheck2 className="h-4 w-4" /> Institucional</Link>
                        <Link href="/creators" className="flex items-center gap-2 transition hover:text-violet-600"><BookOpen className="h-4 w-4" /> Creators</Link>
                        <Link href="/founders" className="flex items-center gap-2 transition hover:text-violet-600"><Users className="h-4 w-4" /> Founders</Link>
                    </div>
                </section>

                <section id="como-funciona" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
                    <div className="mx-auto max-w-7xl">
                        <SectionTitle eyebrow="Monetização no centro da conversa" title="Você conversa. O Mimo cuida do fluxo." text="Sem montar uma loja complicada. Sem transformar toda interação em um post. A monetização acontece onde a conexão já existe: dentro do chat." />
                        <div className="mt-14 grid gap-5 lg:grid-cols-3">
                            {monetization.map(item => (
                                <article key={item.title} className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-8">
                                    <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${item.accent}`} />
                                    <div className="flex items-center justify-between">
                                        <div className={`rounded-2xl bg-linear-to-br ${item.accent} p-3.5 text-white shadow-lg`}><item.icon className="h-6 w-6" /></div>
                                        <span className="text-5xl font-black tracking-tighter text-slate-100">{item.number}</span>
                                    </div>
                                    <h3 className="mt-8 text-2xl font-black tracking-tight text-slate-950">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                                </article>
                            ))}
                        </div>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <div className="rounded-[2rem] bg-[#191320] p-7 text-white sm:p-9">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-2xl bg-white/10 p-3 text-fuchsia-300"><WalletCards className="h-6 w-6" /></div>
                                    <div><h3 className="text-xl font-black">Mimos e saldo em um só lugar</h3><p className="mt-2 text-sm leading-7 text-white/60">Apoiadores recarregam a carteira via Pix ou cartão. Você acompanha suas movimentações dentro do app.</p></div>
                                </div>
                            </div>
                            <div className="rounded-[2rem] bg-violet-100 p-7 sm:p-9">
                                <div className="flex items-start gap-4">
                                    <div className="rounded-2xl bg-white p-3 text-violet-700"><Bell className="h-6 w-6" /></div>
                                    <div><h3 className="text-xl font-black text-violet-950">Notificações que trazem você de volta</h3><p className="mt-2 text-sm leading-7 text-violet-900/65">Receba alertas de novas mensagens e mantenha suas conversas próximas, como em um app moderno.</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="diferencial" className="scroll-mt-24 bg-[#191320] px-4 py-24 text-white sm:px-6 sm:py-32">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                            <div>
                                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-fuchsia-300">Não é mais uma plataforma de feed</span>
                                <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">O conteúdo abre a porta. A conversa cria a conexão.</h2>
                            </div>
                            <p className="max-w-2xl text-lg leading-8 text-white/60">Privacy, OnlyFans e plataformas similares nasceram em torno de catálogos e assinaturas. No Mimo, o chat não é um recurso secundário. Ele é o produto.</p>
                        </div>

                        <div className="mt-14 overflow-hidden rounded-[2rem] border border-white/10">
                            <div className="grid grid-cols-[0.8fr_1fr_1fr] border-b border-white/10 bg-white/[0.04] text-[10px] font-black uppercase tracking-[0.15em] text-white/45 sm:text-xs">
                                <div className="p-4 sm:p-6">Experiência</div><div className="p-4 sm:p-6">Plataformas tradicionais</div><div className="border-l border-violet-400/30 bg-violet-500/10 p-4 text-violet-200 sm:p-6">Mimo Chat</div>
                            </div>
                            {[
                                ['Ponto central', 'Feed e catálogo', 'Conversas privadas'],
                                ['Monetização', 'Assinaturas e posts', 'Mensagens, caracteres e mídias'],
                                ['Experiência', 'Plataforma de conteúdo', 'Aplicativo de mensagens'],
                                ['Relacionamento', 'Audiência consome', 'Audiência participa'],
                                ['Rotina', 'Produção constante', 'Converse no seu tempo'],
                            ].map(row => (
                                <div key={row[0]} className="grid grid-cols-[0.8fr_1fr_1fr] border-b border-white/10 text-xs last:border-0 sm:text-sm">
                                    <div className="p-4 font-bold text-white/70 sm:p-6">{row[0]}</div><div className="p-4 text-white/45 sm:p-6">{row[1]}</div><div className="border-l border-violet-400/20 bg-violet-500/[0.06] p-4 font-bold text-white sm:p-6"><Check className="mr-2 inline h-4 w-4 text-fuchsia-300" />{row[2]}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="founders" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
                        <div className="relative">
                            <div className="absolute -inset-4 rotate-2 rounded-[2.5rem] bg-violet-200" />
                            <Image src="/assets/founders_hero.png" alt="Edmilson e Laura, founders do Mimo" width={900} height={700} className="relative aspect-[4/3] w-full rounded-[2rem] object-cover shadow-2xl" />
                            <div className="absolute -bottom-5 left-5 rounded-2xl bg-white px-5 py-4 shadow-xl sm:left-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">Pessoas reais</p>
                                <p className="mt-1 text-lg font-black">Edmilson + Laura</p>
                            </div>
                        </div>
                        <div className="lg:pl-8">
                            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-600">Quem está construindo</span>
                            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">Tecnologia com rosto, história e responsabilidade.</h2>
                            <p className="mt-6 text-base leading-8 text-slate-600">O Mimo é construído por Edmilson, à frente da tecnologia, e Laura, à frente da experiência da comunidade. Uma empresa brasileira, próxima das criadoras e aberta ao diálogo.</p>
                            <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4"><Zap className="h-5 w-5 text-violet-600" /><p className="mt-3 text-sm font-black">Produto construído no Brasil</p></div>
                                <div className="rounded-2xl border border-slate-200 bg-white p-4"><HeartHandshake className="h-5 w-5 text-fuchsia-600" /><p className="mt-3 text-sm font-black">Suporte próximo e humano</p></div>
                            </div>
                            <Link href="/founders" className="group mt-8 inline-flex items-center gap-2 font-extrabold text-violet-700">
                                Conhecer a história dos founders <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-24 sm:px-6 sm:pb-32">
                    <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-linear-to-br from-[#6e35e9] via-[#712bd0] to-[#b326a8] px-6 py-16 text-white shadow-[0_30px_70px_rgba(104,47,201,0.25)] sm:px-12 lg:px-16">
                        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full border-[70px] border-white/5" />
                        <div className="relative">
                            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                                <div>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.17em]"><Star className="h-3.5 w-3.5 fill-current" /> Early access</span>
                                    <h2 className="mt-6 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Programa de Criadoras Fundadoras</h2>
                                    <p className="mt-5 leading-7 text-white/70">Entre no começo, ajude a construir e carregue para sempre a história de quem acreditou primeiro.</p>
                                    <button onClick={scrollToApplication} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-violet-700 shadow-xl transition hover:-translate-y-1">
                                        Quero ser Fundadora <ArrowRight className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {founderBenefits.map(([title, text], index) => (
                                        <article key={title} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-violet-700">0{index + 1}</span>
                                            <h3 className="mt-5 font-black">{title}</h3>
                                            <p className="mt-2 text-xs leading-6 text-white/65">{text}</p>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-violet-50 px-4 py-24 sm:px-6 sm:py-32">
                    <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                        <div>
                            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-600">Área Creators</span>
                            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">Você não precisa descobrir tudo sozinha.</h2>
                            <p className="mt-6 leading-8 text-slate-600">A área Creators conecta tutoriais, vídeos, dicas de divulgação, exemplos prontos e orientações para usar o Mimo melhor desde o primeiro dia.</p>
                            <Link href="/creators" className="group mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 font-black text-white transition hover:-translate-y-1">
                                Conhecer a área Creators <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                            </Link>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                [PlayCircle, 'Tutoriais e vídeos', 'Aprenda o produto passo a passo.'],
                                [BookOpen, 'Guias práticos', 'Configure perfil, preços e carteira.'],
                                [InstagramIcon, 'Dicas de divulgação', 'Leve sua audiência para o Mimo.'],
                                [Users, 'Comunidade e grupos', 'Troque experiências com outras criadoras.'],
                            ].map(([Icon, title, text]) => {
                                const CreatorIcon = Icon as typeof PlayCircle;
                                return (
                                    <article key={title as string} className="rounded-[1.75rem] border border-violet-100 bg-white p-6 shadow-sm">
                                        <CreatorIcon className="h-7 w-7 text-violet-600" />
                                        <h3 className="mt-6 text-lg font-black">{title as string}</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">{text as string}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section id="seguranca" className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
                    <div className="mx-auto max-w-7xl">
                        <SectionTitle eyebrow="Confiança para começar" title="Sério na tecnologia. Transparente nas relações." text="O Mimo está em construção, mas a responsabilidade não está. Você sabe quem somos, como falar conosco e quais regras protegem seus dados." />
                        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {trustItems.map(item => (
                                <article key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="inline-flex rounded-2xl bg-violet-100 p-3 text-violet-700"><item.icon className="h-6 w-6" /></div>
                                    <h3 className="mt-6 text-lg font-black">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                                    <p className="mt-4 border-t border-slate-100 pt-4 text-[11px] font-extrabold uppercase tracking-wider text-violet-600">{item.detail}</p>
                                </article>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs font-bold text-slate-500">
                            <Link href="/politica-de-privacidade" className="underline decoration-violet-300 underline-offset-4 hover:text-violet-700">Política de Privacidade</Link>
                            <Link href="/termos-de-uso" className="underline decoration-violet-300 underline-offset-4 hover:text-violet-700">Termos de Uso</Link>
                            <a href="mailto:suporte@mimochat.com.br" className="underline decoration-violet-300 underline-offset-4 hover:text-violet-700">suporte@mimochat.com.br</a>
                        </div>
                    </div>
                </section>

                <section id="participar" className="scroll-mt-20 bg-[#191320] px-4 py-24 text-white sm:px-6 sm:py-32">
                    <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.8fr_1.2fr]">
                        <div>
                            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-fuchsia-300">Fase inicial</span>
                            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">Seu lugar pode começar agora.</h2>
                            <p className="mt-6 leading-8 text-white/60">Preencha a candidatura. Nossa equipe analisa cada perfil e entra em contato pelo WhatsApp quando houver compatibilidade com esta fase.</p>
                            <div className="mt-9 space-y-4">
                                {['Candidatura gratuita', 'Análise humana do perfil', 'Contato direto da equipe', 'Sem promessa de ganhos'].map(item => (
                                    <div key={item} className="flex items-center gap-3 text-sm font-bold text-white/75"><CheckCircle2 className="h-5 w-5 text-fuchsia-300" />{item}</div>
                                ))}
                            </div>
                        </div>

                        {success ? (
                            <div className="flex min-h-[430px] flex-col items-center justify-center rounded-[2rem] border border-emerald-400/25 bg-emerald-400/10 p-8 text-center">
                                <div className="rounded-full bg-emerald-400/15 p-5 text-emerald-300"><BadgeCheck className="h-12 w-12" /></div>
                                <h3 className="mt-6 text-3xl font-black">Candidatura recebida.</h3>
                                <p className="mt-3 max-w-lg leading-7 text-white/60">Obrigada por querer construir esse começo com o Mimo. Edmilson ou Laura entrarão em contato pelo WhatsApp após a análise.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur sm:p-8">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Field label="Nome completo" required><input required value={form.fullName} onChange={event => updateField('fullName', event.target.value)} className={inputClass} placeholder="Seu nome" /></Field>
                                    <Field label="Nome artístico"><input value={form.artisticName} onChange={event => updateField('artisticName', event.target.value)} className={inputClass} placeholder="Como sua audiência conhece você" /></Field>
                                    <Field label="Instagram" required><input required value={form.instagram} onChange={event => updateField('instagram', event.target.value)} className={inputClass} placeholder="@seuinstagram" autoCapitalize="none" /></Field>
                                    <Field label="WhatsApp" required><input required value={form.whatsapp} onChange={event => updateField('whatsapp', event.target.value)} className={inputClass} placeholder="(11) 99999-9999" inputMode="tel" /></Field>
                                    <Field label="E-mail"><input type="email" value={form.email} onChange={event => updateField('email', event.target.value)} className={inputClass} placeholder="voce@email.com" /></Field>
                                    <Field label="Idade" required><input required type="number" min={18} max={100} value={form.age} onChange={event => updateField('age', event.target.value)} className={inputClass} placeholder="18" /></Field>
                                    <Field label="Cidade / Estado" required><input required value={form.cityState} onChange={event => updateField('cityState', event.target.value)} className={inputClass} placeholder="São Paulo / SP" /></Field>
                                    <Field label="Já vende conteúdo online?" required>
                                        <select required value={form.hasOnlineExperience} onChange={event => updateField('hasOnlineExperience', event.target.value)} className={inputClass}>
                                            <option value="" className="text-slate-900">Selecione</option>
                                            <option value="yes" className="text-slate-900">Sim</option>
                                            <option value="no" className="text-slate-900">Ainda não</option>
                                        </select>
                                    </Field>
                                </div>
                                <div className="mt-5">
                                    <Field label="Por que você quer participar?" required><textarea required rows={4} value={form.reason} onChange={event => updateField('reason', event.target.value)} className={inputClass} placeholder="Conte um pouco sobre você e sua audiência..." /></Field>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <CheckField checked={form.isAdultConfirmed} onChange={value => updateField('isAdultConfirmed', value)}>Confirmo que tenho 18 anos ou mais.</CheckField>
                                    <CheckField checked={form.contactConsent} onChange={value => updateField('contactConsent', value)}>Autorizo o contato da equipe do Mimo por WhatsApp ou e-mail.</CheckField>
                                </div>

                                {error && <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm font-semibold text-rose-200">{error}</p>}

                                <button disabled={submitting} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-violet-700 shadow-xl transition hover:bg-violet-50 disabled:cursor-wait disabled:opacity-70">
                                    {submitting ? 'Enviando candidatura...' : 'Enviar candidatura'}
                                    {!submitting && <ArrowRight className="h-5 w-5" />}
                                </button>
                                <p className="mt-4 text-center text-[10px] leading-5 text-white/35">Ao enviar, você concorda com nossos Termos de Uso e Política de Privacidade.</p>
                            </form>
                        )}
                    </div>
                </section>

                <section className="px-4 py-24 sm:px-6 sm:py-28">
                    <div className="mx-auto max-w-4xl">
                        <SectionTitle eyebrow="Dúvidas comuns" title="Antes de começar" />
                        <div className="mt-10 space-y-3">
                            {faqs.map(([question, answer]) => (
                                <details key={question} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-black text-slate-900">
                                        {question}<ChevronDown className="h-5 w-5 shrink-0 text-violet-600 transition group-open:rotate-180" />
                                    </summary>
                                    <p className="mt-4 pr-8 text-sm leading-7 text-slate-600">{answer}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-24 sm:px-6 sm:pb-32">
                    <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-violet-100 px-6 py-14 text-center sm:px-12 sm:py-20">
                        <MessageCircleHeart className="mx-auto h-10 w-10 text-violet-700" />
                        <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-[-0.04em] text-violet-950 sm:text-5xl">A próxima grande conversa pode começar aqui.</h2>
                        <p className="mx-auto mt-5 max-w-xl leading-7 text-violet-900/60">Crie sua conta para conhecer o app ou candidate-se para construir a fase inicial com a gente.</p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <button onClick={scrollToApplication} className="rounded-2xl bg-violet-700 px-7 py-4 font-black text-white shadow-lg shadow-violet-200">Participar como Fundadora</button>
                            <Link href="/login" className="rounded-2xl border border-violet-200 bg-white px-7 py-4 font-black text-violet-800">Criar conta ou entrar</Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-10 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2.5"><Image src="/icon-192x192.png" alt="" width={36} height={36} className="rounded-xl" /><span className="text-lg font-black">Mimo Chat</span></div>
                            <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">Um aplicativo de mensagens criado para transformar atenção, conversas e conteúdos exclusivos em valor.</p>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Ecossistema</p>
                            <div className="mt-4 space-y-3 text-sm font-bold text-slate-600"><Link href="/creators" className="block hover:text-violet-700">Creators</Link><Link href="/founders" className="block hover:text-violet-700">Founders</Link><Link href="/institucional" className="block hover:text-violet-700">Institucional</Link></div>
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Transparência</p>
                            <div className="mt-4 space-y-3 text-sm font-bold text-slate-600"><Link href="/termos-de-uso" className="block hover:text-violet-700">Termos de Uso</Link><Link href="/politica-de-privacidade" className="block hover:text-violet-700">Privacidade</Link><a href="mailto:suporte@mimochat.com.br" className="block hover:text-violet-700">Contato</a></div>
                        </div>
                    </div>
                    <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-7 text-[11px] text-slate-400 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="font-bold text-slate-500">LEAD CONTEUDOS DIGITAIS LTDA</p><p className="mt-1">CNPJ 60.312.273/0001-01 · EEL CONTEUDOS DIGITAIS</p></div>
                        <p>© {new Date().getFullYear()} Mimo Chat. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
    return (
        <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-600">{eyebrow}</span>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">{title}</h2>
            {text && <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-600">{text}</p>}
        </div>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return <label className="block text-xs font-extrabold uppercase tracking-wider text-white/65">{label}{required && <span className="text-fuchsia-300"> *</span>}{children}</label>;
}

function CheckField({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
    return (
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-white/60">
            <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-fuchsia-500" />
            <span>{children}</span>
        </label>
    );
}
