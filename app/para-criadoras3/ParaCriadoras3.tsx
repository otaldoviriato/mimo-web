'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    ArrowRight,
    BadgeCheck,
    Bell,
    Check,
    CheckCircle2,
    ChevronDown,
    CreditCard,
    ExternalLink,
    Heart,
    Image as ImageIcon,
    Lock,
    MessageCircle,
    MessageCircleHeart,
    Play,
    Send,
    Shield,
    ShieldCheck,
    Sparkles,
    Star,
    Users,
    Video,
    Wallet,
    Zap,
} from 'lucide-react';
import { InstagramIcon } from '@/components/InstagramIcon';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface CountUpProps {
    end: number;
    suffix?: string;
    prefix?: string;
    duration?: number;
}

// ─── Helpers / Sub-componentes ──────────────────────────────────────────────────

function CountUp({ end, suffix = '', prefix = '', duration = 1800 }: CountUpProps) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !started.current) {
                    started.current = true;
                    const startTime = performance.now();
                    const step = (now: number) => {
                        const progress = Math.min((now - startTime) / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.floor(eased * end));
                        if (progress < 1) requestAnimationFrame(step);
                    };
                    requestAnimationFrame(step);
                }
            },
            { threshold: 0.5 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return (
        <span ref={ref}>
            {prefix}
            {count.toLocaleString('pt-BR')}
            {suffix}
        </span>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/60 bg-purple-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-purple-700">
            {children}
        </span>
    );
}

function GradientBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-300/50">
            {children}
        </span>
    );
}

// ─── Chat Mockup ───────────────────────────────────────────────────────────────

function ChatMockup() {
    const messages = [
        { from: 'fan', text: 'Oi! Posso te mandar uma mensagem?', time: '14:32' },
        { from: 'creator', text: 'Claro! Respondi sua mensagem 💜', time: '14:35', paid: true },
        { from: 'fan', text: 'Você tem fotos exclusivas?', time: '14:36' },
        { from: 'creator', text: null, isMedia: true, time: '14:37', paid: true },
        { from: 'system', text: 'Mimo recebido: R$ 12,00', time: '14:37' },
    ];

    return (
        <div className="relative mx-auto w-full max-w-[320px]">
            {/* Phone frame */}
            <div className="relative overflow-hidden rounded-[2rem] border-[6px] border-slate-800 bg-slate-800 shadow-2xl shadow-slate-900/60">
                {/* Notch */}
                <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-800" />
                {/* Screen */}
                <div className="relative h-[580px] overflow-hidden bg-[#f5f2ff]">
                    {/* App header */}
                    <div className="flex items-center gap-3 border-b border-purple-100 bg-white px-4 pb-3 pt-8">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500" />
                        <div>
                            <p className="text-xs font-bold text-slate-900">Sofia Almeida</p>
                            <div className="flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                <p className="text-[10px] text-slate-500">Online agora</p>
                            </div>
                        </div>
                        <Bell className="ml-auto h-4 w-4 text-purple-600" />
                    </div>
                    {/* Messages */}
                    <div className="flex flex-col gap-2.5 overflow-y-auto p-4">
                        {messages.map((msg, i) => {
                            if (msg.from === 'system') {
                                return (
                                    <div key={i} className="flex items-center justify-center gap-2">
                                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
                                            <Wallet className="h-3 w-3" />
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            }
                            if (msg.from === 'fan') {
                                return (
                                    <div key={i} className="flex flex-col items-start gap-0.5">
                                        <div className="max-w-[200px] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                                            {msg.text}
                                        </div>
                                        <span className="ml-1 text-[9px] text-slate-400">{msg.time}</span>
                                    </div>
                                );
                            }
                            if (msg.from === 'creator') {
                                if (msg.isMedia) {
                                    return (
                                        <div key={i} className="flex flex-col items-end gap-0.5">
                                            <div className="relative overflow-hidden rounded-2xl rounded-tr-sm">
                                                <div className="flex h-28 w-40 items-center justify-center bg-gradient-to-br from-purple-400 to-fuchsia-500">
                                                    <div className="flex flex-col items-center gap-1.5 text-white">
                                                        <ImageIcon className="h-7 w-7 opacity-80" />
                                                        <span className="text-[10px] font-bold">Foto exclusiva</span>
                                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold">R$ 8,00</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="mr-1 text-[9px] text-slate-400">{msg.time}</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={i} className="flex flex-col items-end gap-0.5">
                                        <div className="max-w-[200px] rounded-2xl rounded-tr-sm bg-purple-600 px-3 py-2 text-xs text-white shadow-sm">
                                            {msg.text}
                                            {msg.paid && (
                                                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold">
                                                    R$ 4,00
                                                </span>
                                            )}
                                        </div>
                                        <span className="mr-1 text-[9px] text-slate-400">{msg.time}</span>
                                    </div>
                                );
                            }
                        })}
                    </div>
                    {/* Input bar */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 border-t border-purple-100 bg-white px-3 py-3">
                        <div className="flex-1 rounded-full bg-slate-100 px-3 py-2 text-[10px] text-slate-400">
                            Escreva uma mensagem...
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600">
                            <Send className="h-3.5 w-3.5 text-white" />
                        </div>
                    </div>
                </div>
            </div>
            {/* Floating notifications */}
            <div className="absolute -right-4 top-16 animate-bounce rounded-2xl border border-white bg-white px-3 py-2 shadow-xl">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                        <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-900">+R$ 47,00</p>
                        <p className="text-[9px] text-slate-500">Hoje</p>
                    </div>
                </div>
            </div>
            <div className="absolute -left-6 bottom-28 animate-pulse rounded-2xl border border-white bg-white px-3 py-2 shadow-xl">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-purple-600" />
                    <p className="text-[10px] font-bold text-purple-700">3 novas mensagens</p>
                </div>
            </div>
        </div>
    );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function ParaCriadoras3() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const navItems = [
        { label: 'Como funciona', href: '#como-funciona' },
        { label: 'Diferenciais', href: '#diferenciais' },
        { label: 'Founders', href: '#founders' },
        { label: 'Programa', href: '#programa' },
        { label: 'Creators', href: '#creators' },
    ];

    const monetizationItems = [
        {
            icon: MessageCircle,
            title: 'Mensagens cobradas por caractere',
            description:
                'Cada mensagem enviada pelos seus fãs tem um custo. Quanto mais eles escrevem, mais você recebe. Você define o valor mínimo.',
            color: 'purple',
            example: '1 mensagem longa = R$ 8 a R$ 15',
        },
        {
            icon: ImageIcon,
            title: 'Fotos pagas na conversa',
            description:
                'Envie fotos com preço definido diretamente no chat. O fã paga para desbloquear antes de ver. Tudo dentro do próprio app.',
            color: 'fuchsia',
            example: 'Foto exclusiva = a partir de R$ 5',
        },
        {
            icon: Video,
            title: 'Vídeos com desbloqueio',
            description:
                'Vídeos privados enviados no chat, desbloqueados via pagamento. A criadora controla o acesso de cada conteúdo.',
            color: 'violet',
            example: 'Vídeo curto = R$ 10 a R$ 30+',
        },
        {
            icon: Zap,
            title: 'Pagamentos instantâneos via Pix',
            description:
                'Os mimos chegam diretamente na sua conta, processados pela Asaas e AbacatePay — plataformas reguladas pelo Banco Central.',
            color: 'emerald',
            example: 'Saque disponível em minutos',
        },
    ];

    const diferenciais = [
        {
            versus: 'Privacy / OnlyFans',
            mimo: 'App de mensagens real — com notificações, interface moderna e conversas como centro',
            eles: 'Foco em conteúdo de assinatura, sem experiência de conversa real',
        },
        {
            versus: 'WhatsApp/Instagram',
            mimo: 'Monetização embutida — cada resposta tem valor. Seus fãs pagam para falar com você',
            eles: 'Você responde de graça, sem nenhuma receita por atenção e tempo dedicados',
        },
        {
            versus: 'Plataformas de assinatura',
            mimo: 'Sem mensalidade para criadoras. Sem taxa de entrada. Você ganha no que recebe',
            eles: 'Taxas mensais, setup complicado e suporte distante',
        },
        {
            versus: 'Gateways de mensagem isolados',
            mimo: 'Ecossistema completo: chat, mídia, pagamento, perfil e notificações em um só lugar',
            eles: 'Ferramentas separadas sem integração, obrigando você a usar vários apps',
        },
    ];

    const founderBenefits = [
        { icon: Star, text: 'Taxa reduzida permanente — menor do que criadoras que entrarem depois' },
        { icon: BadgeCheck, text: 'Selo de Fundadora no seu perfil — visível para todos os fãs' },
        { icon: Users, text: 'Acesso ao grupo exclusivo de criadoras fundadoras' },
        { icon: MessageCircleHeart, text: 'Suporte direto com os fundadores via WhatsApp' },
        { icon: Sparkles, text: 'Participe das decisões da plataforma — suas ideias constroem o Mimo' },
        { icon: Zap, text: 'Prioridade de acesso a novos recursos antes do lançamento público' },
    ];

    const creatorLinks = [
        { label: 'Tutoriais em vídeo', desc: 'Passo a passo para configurar seu perfil', href: '/creators', icon: Play },
        { label: 'Dicas de divulgação', desc: 'Como atrair seus primeiros fãs', href: '/creators', icon: Sparkles },
        { label: 'Comunidade de criadoras', desc: 'Grupos e redes de apoio', href: '/creators', icon: Users },
        { label: 'Central de ajuda', desc: 'FAQ e suporte rápido', href: '/ajuda', icon: MessageCircle },
    ];

    const faqItems = [
        {
            q: 'O Mimo é gratuito para criadoras?',
            a: 'Sim! Não há taxa de entrada ou mensalidade. O Mimo retém uma comissão sobre o que você recebe — detalhada nos Termos de Uso. Criadoras fundadoras têm comissão ainda menor.',
        },
        {
            q: 'Posso usar o Mimo sem experiência com conteúdo pago?',
            a: 'Totalmente. Muitas criadoras que entram no Mimo são iniciantes. Nossa área Creators tem tutoriais, dicas e comunidade para te guiar desde o primeiro passo.',
        },
        {
            q: 'O Mimo é seguro? Meus dados ficam protegidos?',
            a: 'Sim. Operamos sob a LGPD (Lei Geral de Proteção de Dados). Os pagamentos são processados pela Asaas e AbacatePay, ambas reguladas pelo Banco Central. Seus dados pessoais não são compartilhados com fãs.',
        },
        {
            q: 'Preciso de muitos seguidores para começar?',
            a: 'Não. Criadoras com audiências menores e nichos específicos frequentemente têm resultados surpreendentes. O que importa é a qualidade da conexão com sua audiência, não o número de seguidores.',
        },
        {
            q: 'Qual é a diferença entre o Mimo e o Privacy?',
            a: 'O Mimo é um aplicativo de mensagens — a conversa é o centro. Você recebe notificações em tempo real, a interface é similar a um WhatsApp premium, e a monetização acontece de forma natural dentro da conversa. O Privacy foca em conteúdo de assinatura, sem a experiência de troca real que o Mimo oferece.',
        },
        {
            q: 'Como funciona o Programa de Fundadoras?',
            a: 'É um programa exclusivo para as primeiras criadoras da plataforma. Você terá taxa reduzida permanente, selo de Fundadora, acesso à comunidade exclusiva e contato direto com os criadores do Mimo. As vagas são limitadas.',
        },
    ];

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#faf9ff] text-slate-900 selection:bg-purple-200">
            {/* ── Background glows ─────────────────────────────────── */}
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple-200/40 blur-[120px]" />
                <div className="absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full bg-fuchsia-200/30 blur-[100px]" />
                <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-violet-100/40 blur-[120px]" />
            </div>

            {/* ── NAVBAR ───────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
                <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-lg shadow-purple-100/30 backdrop-blur-xl sm:px-6">
                    <a href="#topo" className="flex items-center gap-2.5">
                        <Image
                            src="/icon-192x192.png"
                            alt="Mimo Chat"
                            width={38}
                            height={38}
                            className="rounded-xl object-cover shadow-sm"
                        />
                        <div>
                            <span className="block text-sm font-extrabold tracking-tight text-slate-900">MimoChat</span>
                            <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-purple-600">
                                Para criadoras
                            </span>
                        </div>
                    </a>

                    <div className="hidden items-center gap-6 md:flex">
                        {navItems.map(item => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="text-xs font-semibold text-slate-600 transition hover:text-purple-600"
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="hidden rounded-xl px-4 py-2 text-xs font-bold text-slate-700 transition hover:text-purple-700 sm:block"
                        >
                            Entrar
                        </Link>
                        <Link
                            href="/login"
                            className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-300/50 transition hover:shadow-purple-300/70 hover:brightness-110"
                        >
                            Criar conta
                        </Link>
                    </div>
                </nav>
            </header>

            <main id="topo">
                {/* ══════════════════════════════════════════════
                    HERO
                ══════════════════════════════════════════════ */}
                <section className="mx-auto grid max-w-7xl items-center gap-16 px-4 pb-24 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
                    {/* Left */}
                    <div className="space-y-7 text-center lg:text-left">
                        <GradientBadge>
                            <Sparkles className="h-3.5 w-3.5" />
                            Plataforma em fase de fundadores
                        </GradientBadge>

                        <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
                            O app de{' '}
                            <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
                                mensagens
                            </span>{' '}
                            que{' '}
                            <span className="relative inline-block">
                                monetiza.
                                <svg
                                    className="absolute -bottom-2 left-0 w-full"
                                    viewBox="0 0 200 10"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M2 8 C50 2, 150 2, 198 8"
                                        stroke="url(#underline-grad)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="underline-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#9333ea" />
                                            <stop offset="100%" stopColor="#d946ef" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </span>
                        </h1>

                        <p className="mx-auto max-w-lg text-lg leading-relaxed text-slate-600 lg:mx-0">
                            O Mimo não é uma plataforma de conteúdo. É um{' '}
                            <strong className="text-slate-800">aplicativo de mensagens</strong> onde você recebe por
                            cada conversa respondida — com notificações reais, interface moderna e monetização
                            embutida na própria troca de mensagens.
                        </p>

                        <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row lg:mx-0">
                            <Link
                                href="#programa"
                                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 text-sm font-extrabold text-white shadow-xl shadow-purple-300/40 transition hover:-translate-y-0.5 hover:shadow-purple-300/60"
                            >
                                Quero ser Fundadora
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <a
                                href="#como-funciona"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-purple-200 hover:text-purple-700"
                            >
                                Ver como funciona
                            </a>
                        </div>

                        {/* Trust badges */}
                        <div className="flex flex-wrap justify-center gap-4 pt-2 lg:justify-start">
                            {[
                                { icon: ShieldCheck, text: 'LGPD compliant' },
                                { icon: CreditCard, text: 'Pagamentos via Asaas & AbacatePay' },
                                { icon: BadgeCheck, text: 'CNPJ: 60.312.273/0001-01' },
                            ].map(item => (
                                <div key={item.text} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                    <item.icon className="h-3.5 w-3.5 text-purple-500" />
                                    {item.text}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right — Chat Mockup */}
                    <div className="relative flex justify-center lg:justify-end">
                        <ChatMockup />
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    ECOSSISTEMA (links rápidos)
                ══════════════════════════════════════════════ */}
                <section className="border-y border-purple-100/80 bg-white/60 py-10 backdrop-blur-sm">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6">
                        <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                            Ecossistema Mimo — explore tudo em um só lugar
                        </p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                {
                                    href: '/founders',
                                    icon: Heart,
                                    label: 'Founders',
                                    desc: 'Conheça os criadores',
                                    color: 'purple',
                                },
                                {
                                    href: '/creators',
                                    icon: Sparkles,
                                    label: 'Creators',
                                    desc: 'Tutoriais e dicas',
                                    color: 'fuchsia',
                                },
                                {
                                    href: '/institucional',
                                    icon: Shield,
                                    label: 'Institucional',
                                    desc: 'Sobre a plataforma',
                                    color: 'violet',
                                },
                                {
                                    href: 'https://www.instagram.com/mimochat.oficial/',
                                    icon: InstagramIcon,
                                    label: 'Instagram',
                                    desc: '@mimochat.oficial',
                                    color: 'pink',
                                    external: true,
                                },
                            ].map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    target={item.external ? '_blank' : undefined}
                                    rel={item.external ? 'noopener noreferrer' : undefined}
                                    className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:shadow-md"
                                >
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-${item.color}-50 text-${item.color}-600 transition group-hover:scale-110`}
                                    >
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-800">{item.label}</p>
                                        <p className="truncate text-xs text-slate-500">{item.desc}</p>
                                    </div>
                                    <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-purple-400" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    O QUE É O MIMO
                ══════════════════════════════════════════════ */}
                <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
                    <div className="mx-auto max-w-3xl space-y-6 text-center">
                        <SectionLabel>
                            <MessageCircle className="h-3.5 w-3.5" />O que é o Mimo
                        </SectionLabel>
                        <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                            Não é um site de conteúdo.
                            <br />
                            <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                                É um app de mensagens.
                            </span>
                        </h2>
                        <p className="text-lg leading-relaxed text-slate-600">
                            O Mimo foi construído com a mesma lógica de um WhatsApp ou Telegram — mas com
                            monetização nativa. Seus fãs chegam, iniciam uma conversa, e você recebe{' '}
                            <strong>por cada mensagem respondida</strong>, por cada foto e vídeo enviado.
                        </p>
                    </div>

                    <div className="mt-16 grid gap-6 sm:grid-cols-3">
                        {[
                            {
                                icon: Bell,
                                title: 'Notificações reais',
                                text: 'Quando um fã envia uma mensagem, você recebe notificação como em qualquer app moderno. Sem precisar entrar na plataforma para descobrir.',
                            },
                            {
                                icon: MessageCircleHeart,
                                title: 'Conversa como centro',
                                text: 'A experiência de quem fala com você é igual a um aplicativo de mensagens nativo. Familiar, rápido e sem fricção.',
                            },
                            {
                                icon: Wallet,
                                title: 'Dinheiro embutido',
                                text: 'Não há desvio de atenção. O pagamento acontece dentro da conversa — sem links externos, sem redirecionamentos, sem complicações.',
                            },
                        ].map(item => (
                            <div
                                key={item.title}
                                className="rounded-3xl border border-purple-100 bg-white p-8 shadow-sm transition hover:border-purple-200 hover:shadow-md"
                            >
                                <div className="mb-5 inline-flex rounded-2xl bg-purple-100 p-3 text-purple-700">
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-extrabold text-slate-900">{item.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    COMO FUNCIONA A MONETIZAÇÃO
                ══════════════════════════════════════════════ */}
                <section id="como-funciona" className="scroll-mt-24 bg-slate-950 py-24 text-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <SectionLabel>
                                <Wallet className="h-3.5 w-3.5 text-purple-300" />
                                <span className="text-purple-300">Monetização</span>
                            </SectionLabel>
                            <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                                Como você ganha{' '}
                                <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                                    dinheiro no Mimo
                                </span>
                            </h2>
                            <p className="mt-4 leading-relaxed text-slate-400">
                                Quatro formas de monetização, todas dentro da conversa, todas transparentes.
                            </p>
                        </div>

                        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {monetizationItems.map(item => (
                                <div
                                    key={item.title}
                                    className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/8"
                                >
                                    <div className="mb-4 inline-flex w-fit rounded-2xl bg-purple-600/20 p-3 text-purple-400">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-base font-extrabold text-white">{item.title}</h3>
                                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{item.description}</p>
                                    <div className="mt-5 rounded-xl bg-white/5 px-3 py-2">
                                        <p className="text-xs font-bold text-purple-300">Exemplo</p>
                                        <p className="mt-0.5 text-xs text-slate-300">{item.example}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Stats */}
                        <div className="mt-16 grid grid-cols-2 gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 sm:grid-cols-4">
                            {[
                                { value: 0, suffix: '%', label: 'Taxa de entrada', prefix: '' },
                                { value: 100, suffix: '%', label: 'Via Pix instantâneo', prefix: '' },
                                { value: 0, suffix: '', label: 'Mensalidades', prefix: 'R$ ' },
                                { value: 24, suffix: 'h', label: 'Suporte disponível', prefix: '' },
                            ].map(stat => (
                                <div key={stat.label} className="text-center">
                                    <p className="text-3xl font-black text-white sm:text-4xl">
                                        <CountUp end={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    DIFERENCIAIS
                ══════════════════════════════════════════════ */}
                <section id="diferenciais" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-24 sm:px-6">
                    <div className="mx-auto max-w-2xl text-center">
                        <SectionLabel>
                            <Zap className="h-3.5 w-3.5" />
                            Por que o Mimo
                        </SectionLabel>
                        <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                            Diferente do que você{' '}
                            <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                                conhece
                            </span>
                        </h2>
                        <p className="mt-4 leading-relaxed text-slate-600">
                            Existem plataformas similares. Mas nenhuma foi pensada com a experiência de um app de
                            mensagens real como centro da monetização.
                        </p>
                    </div>

                    <div className="mt-14 space-y-4">
                        {diferenciais.map((item, i) => (
                            <div
                                key={i}
                                className="grid items-center gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:grid-cols-[auto_1fr_1fr] sm:gap-6"
                            >
                                <div className="hidden w-32 shrink-0 text-center sm:block">
                                    <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                                        vs. {item.versus}
                                    </span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600">
                                        <Check className="h-3 w-3 text-white" />
                                    </div>
                                    <p className="text-sm font-semibold leading-relaxed text-slate-900">{item.mimo}</p>
                                </div>
                                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 sm:bg-transparent sm:p-0">
                                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100">
                                        <span className="text-[10px] font-bold text-slate-500">✕</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-500">{item.eles}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    FOUNDERS — Quem está por trás
                ══════════════════════════════════════════════ */}
                <section id="founders" className="scroll-mt-24 bg-gradient-to-br from-purple-950 via-slate-950 to-slate-900 py-24 text-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <SectionLabel>
                                <Heart className="h-3.5 w-3.5 text-purple-300" />
                                <span className="text-purple-300">Quem está construindo</span>
                            </SectionLabel>
                            <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                                Pessoas reais,{' '}
                                <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                                    empresa real
                                </span>
                            </h2>
                            <p className="mt-4 leading-relaxed text-slate-300">
                                O Mimo não é um projeto anônimo. Somos Edmilson e Laura, e trabalhamos dia a dia para
                                construir a plataforma que criadoras merecem.
                            </p>
                        </div>

                        {/* Founder cards */}
                        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:max-w-4xl lg:mx-auto">
                            {[
                                {
                                    name: 'Edmilson',
                                    role: 'Desenvolvimento & Tecnologia',
                                    desc: 'Desenvolvedor de software e empreendedor apaixonado por construção de produtos digitais. Responsável pela visão tecnológica e pelo desenvolvimento da plataforma.',
                                    img: '/assets/edmilson.png',
                                },
                                {
                                    name: 'Laura',
                                    role: 'Comunidade & Crescimento',
                                    desc: 'Cofundadora responsável pela experiência das criadoras, comunicação e crescimento da comunidade. A voz que conecta o Mimo ao mundo das criadoras.',
                                    img: '/assets/laura.png',
                                },
                            ].map(founder => (
                                <div
                                    key={founder.name}
                                    className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8"
                                >
                                    <div className="mb-5 flex items-center gap-4">
                                        <div className="h-16 w-16 overflow-hidden rounded-2xl border-2 border-purple-500/30">
                                            <img
                                                src={founder.img}
                                                alt={founder.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-extrabold text-white">{founder.name}</h3>
                                            <p className="text-sm font-semibold text-purple-400">{founder.role}</p>
                                        </div>
                                    </div>
                                    <p className="flex-1 text-sm leading-relaxed text-slate-300">{founder.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Company info */}
                        <div className="mx-auto mt-10 max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
                            <div className="grid gap-6 sm:grid-cols-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Empresa</p>
                                    <p className="mt-1 font-bold text-white">LEAD CONTEUDOS DIGITAIS LTDA</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">CNPJ</p>
                                    <p className="mt-1 font-bold text-white">60.312.273/0001-01</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contato</p>
                                    <a
                                        href="mailto:suporte@mimochat.com.br"
                                        className="mt-1 block font-bold text-purple-400 transition hover:text-purple-300"
                                    >
                                        suporte@mimochat.com.br
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-center">
                            <Link
                                href="/founders"
                                className="group inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/15"
                            >
                                Ver página completa dos Founders
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    PROGRAMA DE FUNDADORAS
                ══════════════════════════════════════════════ */}
                <section id="programa" className="scroll-mt-24 mx-auto max-w-7xl px-4 py-24 sm:px-6">
                    <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-purple-600 via-fuchsia-600 to-violet-700 p-8 text-white shadow-2xl shadow-purple-300/30 sm:p-12 lg:p-16">
                        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="max-w-2xl">
                                <GradientBadge>
                                    <Star className="h-3.5 w-3.5" />
                                    Vagas limitadas
                                </GradientBadge>
                                <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                                    Programa de
                                    <br />
                                    Fundadoras
                                </h2>
                                <p className="mt-5 text-lg leading-relaxed text-purple-100">
                                    Estamos na fase inicial da plataforma e convidando criadoras especiais para
                                    crescer junto com o Mimo. As primeiras a entrar terão benefícios permanentes que
                                    nunca serão disponibilizados depois.
                                </p>

                                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                                    {founderBenefits.map(benefit => (
                                        <div
                                            key={benefit.text}
                                            className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
                                        >
                                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                                                <benefit.icon className="h-3.5 w-3.5" />
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed text-purple-50">
                                                {benefit.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-5 text-center lg:min-w-[240px]">
                                <div className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
                                    <p className="text-5xl font-black">🏆</p>
                                    <p className="mt-3 text-xl font-extrabold">Seja Fundadora</p>
                                    <p className="mt-2 text-sm text-purple-200">
                                        Inscrição gratuita. Análise individual.
                                    </p>
                                </div>
                                <Link
                                    href="/creators"
                                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-extrabold text-purple-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-purple-50 hover:shadow-xl"
                                >
                                    Quero participar
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <p className="text-xs text-purple-200/80">
                                    A inscrição não garante aprovação. Analisamos cada perfil individualmente.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    ÁREA CREATORS
                ══════════════════════════════════════════════ */}
                <section id="creators" className="scroll-mt-24 border-t border-purple-100/50 bg-white/50 py-24">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="mx-auto max-w-2xl text-center">
                            <SectionLabel>
                                <Sparkles className="h-3.5 w-3.5" />
                                Área Creators
                            </SectionLabel>
                            <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                                Tudo que você precisa{' '}
                                <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                                    para aprender e crescer
                                </span>
                            </h2>
                            <p className="mt-4 leading-relaxed text-slate-600">
                                A área Creators é o seu hub de conhecimento dentro do Mimo. Tutoriais em vídeo, dicas
                                de divulgação, comunidade e grupos de criadoras — tudo em um só lugar.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {creatorLinks.map(item => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="group flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-purple-200 hover:shadow-lg"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 text-purple-700 transition group-hover:scale-110">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-slate-900">{item.label}</h3>
                                        <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                                    </div>
                                    <div className="mt-auto flex items-center gap-1 text-xs font-bold text-purple-600">
                                        Acessar
                                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </Link>
                            ))}
                        </div>

                        <div className="mt-10 flex justify-center">
                            <Link
                                href="/creators"
                                className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 text-sm font-extrabold text-white shadow-xl shadow-purple-300/40 transition hover:-translate-y-0.5"
                            >
                                Explorar a área Creators completa
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    SEGURANÇA & CONFIANÇA
                ══════════════════════════════════════════════ */}
                <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
                    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                        <div className="space-y-6">
                            <SectionLabel>
                                <Lock className="h-3.5 w-3.5" />
                                Segurança & Conformidade
                            </SectionLabel>
                            <h2 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                                Construído para{' '}
                                <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                                    durar
                                </span>
                            </h2>
                            <p className="leading-relaxed text-slate-600">
                                Tomamos decisões difíceis para garantir que o Mimo seja um lugar seguro e legítimo.
                                Isso inclui verificação de perfis, conformidade legal e parcerias com infraestruturas
                                financeiras regulamentadas.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                {
                                    icon: ShieldCheck,
                                    title: 'LGPD',
                                    desc: 'Lei Geral de Proteção de Dados aplicada. Seus dados não são compartilhados.',
                                },
                                {
                                    icon: CreditCard,
                                    title: 'Asaas & AbacatePay',
                                    desc: 'Processadores de pagamento regulados pelo Banco Central do Brasil.',
                                },
                                {
                                    icon: BadgeCheck,
                                    title: 'Empresa registrada',
                                    desc: 'CNPJ ativo: 60.312.273/0001-01 — LEAD CONTEUDOS DIGITAIS LTDA.',
                                },
                                {
                                    icon: Users,
                                    title: 'Verificação de perfil',
                                    desc: 'Todas as criadoras passam por análise antes de serem ativadas na plataforma.',
                                },
                            ].map(item => (
                                <div
                                    key={item.title}
                                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                                >
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                                        <item.icon className="h-5 w-5" />
                                    </div>
                                    <h4 className="font-extrabold text-slate-900">{item.title}</h4>
                                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    FAQ
                ══════════════════════════════════════════════ */}
                <section className="border-t border-purple-100/50 bg-white/60 py-24">
                    <div className="mx-auto max-w-3xl px-4 sm:px-6">
                        <div className="mb-12 text-center">
                            <SectionLabel>
                                <MessageCircle className="h-3.5 w-3.5" />
                                Dúvidas frequentes
                            </SectionLabel>
                            <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
                                Perguntas e respostas
                            </h2>
                        </div>

                        <div className="space-y-3">
                            {faqItems.map((item, i) => (
                                <div
                                    key={i}
                                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                                    >
                                        <span className="text-sm font-bold text-slate-900">{item.q}</span>
                                        <ChevronDown
                                            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {openFaq === i && (
                                        <div className="border-t border-slate-100 px-6 pb-5 pt-4">
                                            <p className="text-sm leading-relaxed text-slate-600">{item.a}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════
                    CTA FINAL
                ══════════════════════════════════════════════ */}
                <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-12 text-white shadow-2xl sm:p-16 lg:p-20">
                        {/* Glow */}
                        <div className="pointer-events-none absolute inset-0">
                            <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-purple-600/20 blur-[80px]" />
                            <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-fuchsia-600/20 blur-[80px]" />
                        </div>

                        <div className="relative z-10 mx-auto max-w-2xl text-center">
                            <p className="text-5xl">✨</p>
                            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                                Pronta para começar?
                            </h2>
                            <p className="mt-5 text-lg leading-relaxed text-purple-200">
                                Entre para a comunidade de criadoras fundadoras, aprenda a usar o Mimo e comece a
                                receber pelos seus mimos — no seu tempo, do seu jeito.
                            </p>

                            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                <Link
                                    href="/creators"
                                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-8 py-4 text-sm font-extrabold text-white shadow-xl shadow-purple-500/30 transition hover:-translate-y-0.5 sm:w-auto"
                                >
                                    Participar do Programa de Fundadoras
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15 sm:w-auto"
                                >
                                    Já tenho conta — Entrar
                                </Link>
                            </div>

                            <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-purple-300">
                                {[
                                    '✓ Sem mensalidade',
                                    '✓ Sem taxa de entrada',
                                    '✓ Empresa com CNPJ',
                                    '✓ LGPD compliant',
                                ].map(item => (
                                    <span key={item} className="font-semibold">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* ── FOOTER ───────────────────────────────────────────── */}
            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Brand */}
                        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
                            <div className="flex items-center gap-2.5">
                                <Image
                                    src="/icon-192x192.png"
                                    alt="Mimo Chat"
                                    width={32}
                                    height={32}
                                    className="rounded-lg object-cover"
                                />
                                <span className="font-extrabold text-slate-900">Mimo Chat</span>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-500">
                                O app de mensagens criado para monetização de conversas. Feito por criadoras, para
                                criadoras.
                            </p>
                            <a
                                href="https://www.instagram.com/mimochat.oficial/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 transition hover:text-pink-700"
                            >
                                <InstagramIcon className="h-4 w-4" />
                                @mimochat.oficial
                            </a>
                        </div>

                        {/* Links */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                                Plataforma
                            </h4>
                            <ul className="space-y-2">
                                {[
                                    { label: 'Área Creators', href: '/creators' },
                                    { label: 'Programa Founders', href: '/founders' },
                                    { label: 'Institucional', href: '/institucional' },
                                    { label: 'Central de Ajuda', href: '/ajuda' },
                                ].map(item => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="text-xs text-slate-500 transition hover:text-purple-600"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Legal</h4>
                            <ul className="space-y-2">
                                {[
                                    { label: 'Termos de Uso', href: '/termos-de-uso' },
                                    { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
                                ].map(item => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className="text-xs text-slate-500 transition hover:text-purple-600"
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Contato</h4>
                            <ul className="space-y-2">
                                <li>
                                    <a
                                        href="mailto:suporte@mimochat.com.br"
                                        className="text-xs text-purple-600 transition hover:text-purple-700"
                                    >
                                        suporte@mimochat.com.br
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-8 text-[10px] text-slate-500 sm:flex-row">
                        <div className="space-y-0.5 text-center sm:text-left">
                            <p className="font-bold text-slate-600">LEAD CONTEUDOS DIGITAIS LTDA</p>
                            <p>CNPJ: 60.312.273/0001-01 | EEL CONTEUDOS DIGITAIS</p>
                        </div>
                        <p>© {new Date().getFullYear()} Mimo Chat. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
