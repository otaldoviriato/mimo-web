'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, 
    Shield, 
    Eye, 
    Heart, 
    Calendar,
    ArrowRight,
    MessageSquare,
    Mail,
    Sparkles
} from 'lucide-react';
import { InstagramIcon } from '@/components/InstagramIcon';

export default function FoundersPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#fafafc] text-gray-700 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-hidden">
            
            {/* Elementos de Fundo (Glows de Gradiente Suaves em Tons Claros) */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full bg-purple-100/50 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-50/50 blur-[130px] pointer-events-none"></div>
            <div className="absolute top-[40%] right-[-5%] w-[350px] h-[350px] rounded-full bg-purple-50/40 blur-[100px] pointer-events-none"></div>

            {/* Cabeçalho / Navegação */}
            <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10">
                <nav className="flex items-center justify-between bg-white/80 backdrop-blur-md border border-gray-200/55 rounded-2xl px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <img
                            src="/icon-192x192.png"
                            alt="MimoChat Logo"
                            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-gray-100"
                        />
                        <span className="text-xl font-bold text-gray-900 tracking-tight">
                            Mimo Chat
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </button>
                        
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.01]"
                        >
                            Entrar no App
                        </Link>
                    </div>
                </nav>
            </header>

            {/* HERO SECTION */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 relative z-10">
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-7 space-y-6 text-left">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            Feito para criadoras por pessoas de verdade
                        </div>
                        
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-950 tracking-tight leading-[1.1]">
                            Conheça quem está <br className="hidden sm:inline" />
                            <span className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 bg-clip-text text-transparent">
                                construindo o Mimo
                            </span>
                        </h1>
                        
                        <p className="text-lg text-gray-600 leading-relaxed font-normal">
                            Somos Edmilson e Laura. <br />
                            Criamos o Mimo porque acreditamos que conversas têm valor e que criadoras de conteúdo merecem ser recompensadas pelo tempo e atenção que dedicam à sua audiência.
                        </p>

                        <div className="pt-4">
                            <a
                                href="#historia"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl transition-all duration-300 shadow-md shadow-purple-200 hover:-translate-y-0.5"
                            >
                                Conheça nossa história
                                <ArrowRight className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div className="lg:col-span-5 relative">
                        <div className="relative mx-auto max-w-[420px] lg:max-w-none group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-3xl blur-md opacity-20 group-hover:opacity-30 transition-all duration-500"></div>
                            <img
                                src="/assets/founders_hero.png"
                                alt="Edmilson e Laura - Fundadores do Mimo"
                                className="relative rounded-3xl shadow-xl w-full object-cover border border-white/50 transition-all duration-500 hover:scale-[1.01]"
                            />
                        </div>
                    </div>
                </section>

                {/* NOSSA HISTÓRIA */}
                <section id="historia" className="pt-32 scroll-mt-20">
                    <div className="bg-white border border-gray-150 rounded-3xl p-8 sm:p-16 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50/40 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="space-y-4">
                                <span className="text-purple-600 font-bold text-sm uppercase tracking-wider">Nossa História</span>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-950">Como tudo começou</h2>
                            </div>
                            
                            <div className="space-y-6 text-base sm:text-lg text-gray-600 leading-relaxed font-normal">
                                <p>
                                    O Mimo nasceu da observação de algo simples.
                                </p>
                                <p>
                                    Milhares de criadoras passam horas todos os dias respondendo mensagens, criando conexões e mantendo relacionamentos com sua audiência.
                                </p>
                                <p className="font-semibold text-purple-700 bg-purple-50/50 inline-block px-3 py-1 rounded-lg">
                                    Essas conversas geram valor.
                                </p>
                                <p>
                                    Mas, na maioria das vezes, esse valor nunca retorna para quem dedicou seu tempo.
                                </p>
                                <p>
                                    Foi dessa percepção que surgiu o Mimo.
                                </p>
                                <p>
                                    Queríamos criar uma plataforma onde criadoras pudessem transformar interações genuínas em uma nova fonte de renda, sem depender exclusivamente de publicidade, alcance ou algoritmos.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* QUEM SOMOS */}
                <section className="pt-32 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-purple-600 font-bold text-sm uppercase tracking-wider">Quem Somos</span>
                        <h2 className="text-3xl font-extrabold text-gray-950">Por trás do código e do crescimento</h2>
                        <p className="text-gray-500 text-sm sm:text-base">
                            Trabalhamos lado a lado para oferecer a melhor experiência para criadoras e fãs.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Card Edmilson */}
                        <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 hover:border-purple-200 transition-all duration-300 hover:shadow-lg flex flex-col items-center text-center group">
                            <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-purple-50 group-hover:border-purple-100 transition-colors shadow-sm">
                                <img 
                                    src="/assets/edmilson.png" 
                                    alt="Edmilson" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-950 mb-1">Edmilson</h3>
                            <span className="text-purple-600 font-semibold text-sm mb-4">Desenvolvimento & Tecnologia</span>
                            <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                                Desenvolvedor de software e empreendedor apaixonado por tecnologia e construção de produtos digitais. Responsável pelo desenvolvimento da plataforma e pela visão tecnológica do Mimo.
                            </p>
                        </div>

                        {/* Card Laura */}
                        <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 hover:border-purple-200 transition-all duration-300 hover:shadow-lg flex flex-col items-center text-center group">
                            <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-purple-50 group-hover:border-purple-100 transition-colors shadow-sm">
                                <img 
                                    src="/assets/laura.png" 
                                    alt="Laura" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-950 mb-1">Laura</h3>
                            <span className="text-purple-600 font-semibold text-sm mb-4">Experiência da Comunidade</span>
                            <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
                                Empreendedora e cofundadora do Mimo. Responsável pela experiência das criadoras, comunicação e crescimento da comunidade.
                            </p>
                        </div>
                    </div>
                </section>

                {/* NOSSOS VALORES */}
                <section className="pt-32 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-purple-600 font-bold text-sm uppercase tracking-wider">Nossos Valores</span>
                        <h2 className="text-3xl font-extrabold text-gray-950">O que guia nossas decisões</h2>
                        <p className="text-gray-500 text-sm sm:text-base">
                            Acreditamos inabalavelmente em princípios claros que protegem e valorizam cada participante da nossa rede.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Transparência */}
                        <div className="p-6 bg-white border border-gray-150 rounded-2xl shadow-xs transition-all duration-300 hover:border-purple-200 hover:-translate-y-1 hover:shadow-md">
                            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-purple-50 text-purple-600 mb-4">
                                <Eye className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Transparência</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">Queremos construir uma relação clara e honesta com todas as criadoras que utilizam o Mimo.</p>
                        </div>

                        {/* Segurança */}
                        <div className="p-6 bg-white border border-gray-150 rounded-2xl shadow-xs transition-all duration-300 hover:border-purple-200 hover:-translate-y-1 hover:shadow-md">
                            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-purple-50 text-purple-600 mb-4">
                                <Shield className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Segurança</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">A proteção dos dados e pagamentos é prioridade em todas as decisões da plataforma.</p>
                        </div>

                        {/* Respeito */}
                        <div className="p-6 bg-white border border-gray-150 rounded-2xl shadow-xs transition-all duration-300 hover:border-purple-200 hover:-translate-y-1 hover:shadow-md">
                            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-purple-50 text-purple-600 mb-4">
                                <Heart className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Respeito</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">Valorizamos o tempo, a privacidade e a autonomia das criadoras.</p>
                        </div>

                        {/* Construção de longo prazo */}
                        <div className="p-6 bg-white border border-gray-150 rounded-2xl shadow-xs transition-all duration-300 hover:border-purple-200 hover:-translate-y-1 hover:shadow-md">
                            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-purple-50 text-purple-600 mb-4">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-gray-900 mb-2">Longo Prazo</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">Não estamos criando algo para alguns meses. Estamos construindo uma plataforma para durar muitos anos.</p>
                        </div>
                    </div>
                </section>

                {/* O QUE ESTAMOS CONSTRUINDO */}
                <section className="pt-32">
                    <div className="bg-purple-950 text-white rounded-3xl p-8 sm:p-16 relative overflow-hidden shadow-xl">
                        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-800/30 blur-[100px] pointer-events-none"></div>
                        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[100px] pointer-events-none"></div>
                        
                        <div className="relative z-10 max-w-3xl mx-auto space-y-6 text-center">
                            <span className="text-purple-300 font-bold text-xs uppercase tracking-wider">O que estamos construindo</span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Nossa visão para o futuro</h2>
                            <p className="text-purple-100 text-base sm:text-lg leading-relaxed">
                                Acreditamos que a economia dos criadores ainda está apenas começando. Nossa missão é criar ferramentas que permitam que criadoras monetizem sua audiência de forma simples, justa e sustentável.
                            </p>
                            <p className="text-purple-200 text-sm leading-relaxed max-w-2xl mx-auto">
                                Estamos construindo o Mimo passo a passo, ouvindo feedbacks, evoluindo a plataforma e trabalhando diariamente para entregar uma experiência cada vez melhor.
                            </p>
                        </div>
                    </div>
                </section>

                {/* TRANSPARÊNCIA */}
                <section className="pt-32 max-w-3xl mx-auto text-center space-y-6">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100/50">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-950">Uma empresa feita por pessoas reais</h2>
                    <div className="space-y-4 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
                        <p>
                            Sabemos que confiança é algo que se conquista. Por isso acreditamos em transparência.
                        </p>
                        <p>
                            Por trás do Mimo existem pessoas reais, trabalhando todos os dias para construir uma plataforma segura e confiável.
                        </p>
                        <p className="text-gray-500 text-base">
                            Se você tiver dúvidas, sugestões ou precisar de ajuda, estamos sempre disponíveis para conversar.
                        </p>
                    </div>
                </section>

                {/* CTA FINAL */}
                <section className="pt-32">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-100/50 rounded-3xl p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-6 shadow-sm">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                            Quer conhecer o Mimo?
                        </h2>
                        <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                            Estamos convidando criadoras para conhecer a plataforma e acompanhar essa construção desde o início.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link
                                href="/login"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl transition-all duration-300 shadow-md shadow-purple-200 hover:-translate-y-0.5"
                            >
                                Conhecer o Mimo
                            </Link>
                            
                            <a
                                href="mailto:suporte@mimochat.com.br"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition-all duration-300 shadow-xs"
                            >
                                <Mail className="w-5 h-5 text-gray-500" />
                                Falar com a equipe
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            {/* RODAPÉ ELEGANTE */}
            <footer className="bg-white border-t border-gray-200/80 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        {/* Logo e Missão */}
                        <div className="space-y-4 md:col-span-2">
                            <div className="flex items-center gap-2">
                                <img
                                    src="/icon-192x192.png"
                                    alt="Mimo Chat"
                                    className="w-8 h-8 rounded-lg object-cover"
                                />
                                <span className="text-lg font-bold text-gray-900">Mimo Chat</span>
                            </div>
                            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                                Uma plataforma transparente e próxima, feita de pessoas reais para criar conexões de valor com segurança e respeito à autonomia dos criadores de conteúdo.
                            </p>
                        </div>

                        {/* Links Legais */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Políticas e Termos</h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <Link href="/termos-de-uso" target="_blank" className="text-gray-500 hover:text-purple-600 transition-colors">
                                        Termos de Uso
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/politica-de-privacidade" target="_blank" className="text-gray-500 hover:text-purple-600 transition-colors">
                                        Política de Privacidade
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/founders" className="text-purple-600 hover:text-purple-700 transition-colors font-semibold">
                                        Sobre o Mimo
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Suporte e Redes */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Contato e Redes</h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <Link href="/ajuda" className="text-gray-500 hover:text-purple-600 transition-colors">
                                        Página para criadoras (Ajuda)
                                    </Link>
                                </li>
                                <li className="text-gray-500">
                                    Contato: <br />
                                    <a href="mailto:suporte@mimochat.com.br" className="text-purple-600 hover:underline">
                                        suporte@mimochat.com.br
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.instagram.com/mimochat.oficial/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-pink-600 hover:text-pink-700 font-semibold transition-colors"
                                    >
                                        <InstagramIcon className="w-3.5 h-3.5" />
                                        @mimochat.oficial
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Dados Corporativos */}
                    <div className="border-t border-gray-150 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-gray-500">
                        <div className="space-y-1 text-center md:text-left">
                            <p className="font-semibold text-gray-600">LEAD CONTEUDOS DIGITAIS LTDA</p>
                            <p>CNPJ: 60.312.273/0001-01 | EEL CONTEUDOS DIGITAIS</p>
                        </div>
                        <p className="text-center md:text-right">
                            © {new Date().getFullYear()} Mimo Chat. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
