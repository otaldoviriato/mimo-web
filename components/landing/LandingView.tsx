'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    ShieldCheck,
    Lock,
    Unlock,
    MessageCircle,
    ArrowRight,
    Zap,
    CheckCircle2,
    Crown,
    CreditCard,
    BadgeCheck,
    ChevronRight,
    HelpCircle,
} from 'lucide-react';
import { MediaUnlockSimulator } from './MediaUnlockSimulator';

interface LandingViewProps {
    authRedirectUrl?: string;
    ctaTrackingAttr?: boolean;
}

const FEATURED_CREATORS = [
    {
        name: 'Débora Silveira',
        age: 23,
        city: 'São Paulo - SP',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
        bio: 'Conversas íntimas, áudios sinceros e fotos exclusivas do meu dia a dia.',
        responseTime: 'Responde em ~3 min',
        isOnline: true,
        pricePerChar: 'R$ 0,05',
    },
    {
        name: 'Camila Rocha',
        age: 22,
        city: 'Rio de Janeiro - RJ',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
        cover: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80',
        bio: 'Carinhosa, atenciosa e adoro mandar áudios de boa noite para quem é fiel.',
        responseTime: 'Responde em ~5 min',
        isOnline: true,
        pricePerChar: 'R$ 0,05',
    },
    {
        name: 'Larissa Mendonça',
        age: 25,
        city: 'Curitiba - PR',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        bio: 'Gosto de conversas profundas e mimos sem frescura no privado.',
        responseTime: 'Responde em ~8 min',
        isOnline: true,
        pricePerChar: 'R$ 0,05',
    },
    {
        name: 'Beatriz Lima',
        age: 24,
        city: 'Belo Horizonte - MG',
        avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80',
        cover: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=600&q=80',
        bio: 'Mando fotos inéditas e respondo todas as mensagens no chat.',
        responseTime: 'Responde em ~10 min',
        isOnline: true,
        pricePerChar: 'R$ 0,05',
    },
];

export function LandingView({
    authRedirectUrl = '/login',
    ctaTrackingAttr = false,
}: LandingViewProps) {
    const ctaProps = ctaTrackingAttr ? { 'data-campaign-cta': true } : {};

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-purple-600 selection:text-white">
            {/* ─── Top Bar / Header ─── */}
            <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/Logo.svg"
                            alt="MimoChat"
                            width={130}
                            height={34}
                            priority
                            className="h-8 w-auto object-contain"
                        />
                    </Link>
                    <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        Perfis 100% Verificados
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`}
                        {...ctaProps}
                        className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-purple-600/20 flex items-center gap-1.5"
                    >
                        <span>Entrar no Chat</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </header>

            {/* ─── Hero Section ─── */}
            <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
                <div className="text-center max-w-3xl mx-auto space-y-6">
                    {/* Badge de Destaque */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider shadow-xs">
                        <Crown className="w-3.5 h-3.5 text-purple-600" />
                        <span>Chat Privado Oficial</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span className="text-slate-600 font-medium">Sem Robôs</span>
                    </div>

                    {/* Título Principal */}
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                        Conversas privadas e fotos exclusivas com{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                            criadoras reais
                        </span>.
                    </h1>

                    {/* Subtítulo */}
                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                        Sem mensalidades obrigatórias e sem enrolação. Recarregue no Pix a partir de valores acessíveis e pague apenas pelas mensagens e mídias que escolher receber.
                    </p>

                    {/* Pilares Rápidos no Hero */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>100% Humano e Autêntico</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                            <Lock className="w-3.5 h-3.5 text-purple-600" />
                            <span>Extrato Discreto no Pix</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Respostas por Áudio e Foto</span>
                        </div>
                    </div>

                    {/* Botões de Ação Hero */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                        <Link
                            href={`${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`}
                            {...ctaProps}
                            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Ver Criadoras Online Agora</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <a
                            href="#simulador"
                            className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-700 font-bold text-sm border border-slate-300 transition-all flex items-center justify-center gap-2"
                        >
                            <span>Testar Desbloqueio Grátis</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* ─── Seção Interativa: Simulador de Desbloqueio ─── */}
            <section id="simulador" className="py-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-purple-50/30 to-slate-50 border-y border-slate-200/80">
                <div className="max-w-4xl mx-auto space-y-10">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100/80 px-3 py-1 rounded-full">
                            <Unlock className="w-3.5 h-3.5" />
                            Simulação Interativa
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Veja na prática como funciona o desbloqueio
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                            No MimoChat, as criadoras enviam fotos e vídeos exclusivos com prévia protegida. Você desbloqueia na hora com seu saldo a partir de R$ 5,00. Faça o teste abaixo:
                        </p>
                    </div>

                    {/* Componente Interativo do Simulador */}
                    <MediaUnlockSimulator redirectUrl={authRedirectUrl} />
                </div>
            </section>

            {/* ─── Seção: Vitrine de Criadoras Online (Preview do Explorar) ─── */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-10">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Disponíveis Agora</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                            Criadoras ativas e prontas para conversar
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Perfis verificados com fotos reais e resposta rápida.
                        </p>
                    </div>

                    <Link
                        href={`${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`}
                        {...ctaProps}
                        className="inline-flex items-center gap-1 text-sm font-bold text-purple-600 hover:text-purple-700"
                    >
                        <span>Ver todas as modelos</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                {/* Grade de Modelos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {FEATURED_CREATORS.map((creator, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col group"
                        >
                            {/* Capa e Foto de Perfil */}
                            <div className="relative h-28 bg-slate-200 overflow-hidden">
                                <Image
                                    src={creator.cover}
                                    alt={`Capa de ${creator.name}`}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                    Online
                                </span>
                            </div>

                            <div className="px-5 pt-0 pb-5 flex-1 flex flex-col -mt-10">
                                <div className="relative w-16 h-16 rounded-full overflow-hidden border-3 border-white shadow-md bg-white">
                                    <Image
                                        src={creator.avatar}
                                        alt={creator.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>

                                <div className="mt-3 flex-1 space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-extrabold text-slate-900 text-base">
                                            {creator.name}, {creator.age}
                                        </h3>
                                        <span title="Perfil Verificado" className="inline-flex items-center text-purple-600">
                                            <ShieldCheck className="w-4 h-4" />
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">{creator.city}</p>
                                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                        {creator.bio}
                                    </p>

                                    <div className="pt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-slate-100">
                                        <span className="flex items-center gap-1 text-slate-700">
                                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                                            {creator.responseTime}
                                        </span>
                                        <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold">
                                            {creator.pricePerChar}/caractere
                                        </span>
                                    </div>
                                </div>

                                <Link
                                    href={`${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`}
                                    {...ctaProps}
                                    className="mt-4 w-full h-10 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>Conversar no Privado</span>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Seção: Por que o MimoChat é diferente? (Quebra de Objeções) ─── */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-200/80">
                <div className="max-w-5xl mx-auto space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                            Segurança & Discrição
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                            Criado para garantir sua total privacidade
                        </h2>
                        <p className="text-sm sm:text-base text-slate-600">
                            Entenda por que milhares de pessoas preferem conversar pelo MimoChat em vez de redes sociais convencionais.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Pilar 1 */}
                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 space-y-4 shadow-xs">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center">
                                <BadgeCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                100% Pessoas Reais
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Nada de robôs ou inteligência artificial fingindo ser mulher. Cada criadora passa por verificação rigorosa de identidade com documento e foto antes de publicar.
                            </p>
                        </div>

                        {/* Pilar 2 */}
                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 space-y-4 shadow-xs">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Totalmente Discreto no Pix
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Suas recargas são processadas via Pix ou cartão com identificação neutra e discreta no extrato bancário. Ninguém sabe o que você acessa ou com quem conversa.
                            </p>
                        </div>

                        {/* Pilar 3 */}
                        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 space-y-4 shadow-xs">
                            <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Sem Assinatura Obrigatória
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Você não fica preso a cobranças mensais automáticas. Recarregue apenas o valor que quiser gastar (a partir de R$ 10) e use o saldo no seu próprio ritmo.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Seção: Como Funciona ─── */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-12">
                <div className="text-center max-w-xl mx-auto space-y-3">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        Como começar em 3 passos simples
                    </h2>
                    <p className="text-sm text-slate-600">
                        O acesso é imediato e você não precisa preencher cadastros longos.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-3 shadow-xs">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md shadow-purple-600/20">
                            1
                        </div>
                        <h3 className="font-bold text-base text-slate-900">Escolha a Criadora</h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            Acesse a lista de criadoras online, veja fotos públicas e escolha com quem quer conversar.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-3 shadow-xs">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md shadow-purple-600/20">
                            2
                        </div>
                        <h3 className="font-bold text-base text-slate-900">Recarregue via Pix</h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            Adicione créditos na sua carteira em segundos. O saldo cai na hora e fica disponível para usar.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-3 shadow-xs">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md shadow-purple-600/20">
                            3
                        </div>
                        <h3 className="font-bold text-base text-slate-900">Converse no Privado</h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            Troque mensagens diretas, áudios e desbloqueie fotos e mídias exclusivas enviadas no chat.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── Dúvidas Frequentes Rápidas ─── */}
            <section className="py-14 px-4 sm:px-6 lg:px-8 bg-slate-100/70 border-t border-slate-200/80">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                            Perguntas frequentes
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Tudo o que você precisa saber antes de entrar.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1.5">
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                O que vai aparecer no meu extrato bancário do Pix?
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 pl-6 leading-relaxed">
                                Aparece apenas o nome neutro da processadora de pagamentos. Não há nenhuma menção ao nome da plataforma, conteúdo adulto ou nomes das criadoras.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1.5">
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                E se a criadora demorar para me responder?
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 pl-6 leading-relaxed">
                                As criadoras recebem notificações no celular a cada mensagem enviada. Você pode ativar notificações discretas no seu navegador para ser avisado no exato minuto em que ela responder.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1.5">
                            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                Preciso cadastrar cartão de crédito para acessar?
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 pl-6 leading-relaxed">
                                Não! O cadastro é 100% gratuito e você pode realizar recargas usando Pix a partir de valores baixos sempre que quiser conversar.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Banner CTA Final ─── */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-center">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl shadow-purple-900/10 space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto text-white">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-2 max-w-xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                            Pronto para começar sua conversa exclusiva?
                        </h2>
                        <p className="text-sm sm:text-base text-purple-100 leading-relaxed">
                            Crie sua conta em 30 segundos, escolha uma das criadoras online e experimente uma conversa real no privado.
                        </p>
                    </div>

                    <Link
                        href={`${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`}
                        {...ctaProps}
                        className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-white hover:bg-purple-50 text-purple-700 font-extrabold text-sm shadow-md active:scale-95 transition-all"
                    >
                        <span>Entrar no MimoChat Agora</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>

                    <p className="text-[11px] text-purple-200/80">
                        Ambiente protegido • 100% discreto • Acesso restrito para maiores de 18 anos
                    </p>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="mt-auto bg-white border-t border-slate-200 px-4 sm:px-8 py-8">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/Logo.svg"
                            alt="MimoChat"
                            width={110}
                            height={28}
                            className="h-6 w-auto object-contain opacity-80"
                        />
                        <span>• Todos os direitos reservados.</span>
                    </div>

                    <div className="flex items-center gap-4 font-medium">
                        <Link href="/termos-de-uso" className="hover:text-slate-900 transition-colors">
                            Termos de Uso
                        </Link>
                        <Link href="/politica-de-privacidade" className="hover:text-slate-900 transition-colors">
                            Privacidade
                        </Link>
                        <Link href="/ajuda" className="hover:text-slate-900 transition-colors">
                            Ajuda
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
