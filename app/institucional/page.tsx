'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, 
    Shield, 
    MessageSquare, 
    Sparkles, 
    CreditCard, 
    Lock, 
    Users, 
    Zap, 
    CheckCircle2
} from 'lucide-react';
import { InstagramIcon } from '@/components/InstagramIcon';

export default function InstitucionalPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#fafafc] text-gray-700 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-hidden">
            
            {/* Elementos de Fundo (Glows de Gradiente Suaves em Tons Claros) */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-purple-100/50 blur-[130px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-50/50 blur-[130px] pointer-events-none"></div>
            <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] rounded-full bg-purple-50/45 blur-[100px] pointer-events-none"></div>

            {/* Cabeçalho / Navegação */}
            <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10">
                <nav className="flex items-center justify-between bg-white/70 backdrop-blur-md border border-gray-200/50 rounded-2xl px-6 py-4 shadow-xs">
                    <div className="flex items-center gap-3">
                        <img
                            src="/icon-192x192.png"
                            alt="MimoChat"
                            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-gray-100"
                        />
                        <span className="text-xl font-bold text-gray-900 tracking-tight">
                            MimoChat
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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative z-10">
                <div className="text-center max-w-3xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        Conexão Digital Leve e Segura
                    </div>
                    
                    <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-950 tracking-tight leading-none">
                        Monetize sua paixão. <br />
                        <span className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 bg-clip-text text-transparent">
                            Conecte-se de verdade.
                        </span>
                    </h1>
                    
                    <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
                        O MimoChat une criadores de conteúdo independentes e seus fãs através de conversas dinâmicas, galerias exclusivas e interações com mimos digitais. Tudo de forma simples, transparente e com total segurança.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link
                            href="/login"
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl transition-all duration-300 shadow-md shadow-purple-200 hover:-translate-y-0.5"
                        >
                            Quero Criar Meu Perfil
                        </Link>
                        <a
                            href="#sobre"
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition-all duration-300 shadow-xs"
                        >
                            Descobrir Como Funciona
                        </a>
                        <a
                            href="https://www.instagram.com/mimochat.oficial/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 rounded-2xl transition-all duration-300 shadow-md hover:-translate-y-0.5"
                        >
                            <InstagramIcon className="w-5 h-5" />
                            @mimochat.oficial
                        </a>
                    </div>
                </div>

                {/* Grid para Quem é (Criadores vs Fãs) */}
                <section id="sobre" className="pt-24 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Para Criadores */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-50/50 transition-all duration-300 group flex flex-col justify-between shadow-xs">
                        <div>
                            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-50 text-purple-600 mb-6 group-hover:scale-105 transition-transform border border-purple-100/50">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-950 mb-4">Para Criadores</h3>
                            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-6">
                                Tenha controle total. Hospede sua galeria privada de fotos e vídeos, envie mídias exclusivas diretamente no chat e monetize através de interações diretas e assinaturas periódicas com facilidade e privacidade.
                            </p>
                            <ul className="space-y-3 mb-8 text-sm text-gray-600">
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                                    Galerias de mídia integradas e organizadas
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                                    Desbloqueio de mídias direto na conversa (pay-to-unlock)
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                                    Proteção e blindagem de dados pessoais
                                </li>
                            </ul>
                        </div>
                        <Link 
                            href="/login" 
                            className="inline-flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors"
                        >
                            Criar minha conta profissional →
                        </Link>
                    </div>

                    {/* Para Fãs */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/50 transition-all duration-300 group flex flex-col justify-between shadow-xs">
                        <div>
                            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-6 group-hover:scale-105 transition-transform border border-indigo-100/50">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-950 mb-4">Para Fãs</h3>
                            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-6">
                                Apoie quem inspira você. Converse em tempo real com seus criadores favoritos, envie doações voluntárias em forma de "Mimos" e acesse conteúdos exclusivos com rapidez e praticidade.
                            </p>
                            <ul className="space-y-3 mb-8 text-sm text-gray-600">
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                    Visual que simula aplicativo de mensagens nativo
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                    Processamento seguro via Pix e Cartão de Crédito
                                </li>
                                <li className="flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                    Acesso imediato no navegador, sem download
                                </li>
                            </ul>
                        </div>
                        <Link 
                            href="/login" 
                            className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            Acessar como fã →
                        </Link>
                    </div>
                </section>

                {/* FUNCIONALIDADES */}
                <section className="pt-24 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <h2 className="text-3xl font-bold text-gray-950">Segurança & Funcionalidade</h2>
                        <p className="text-gray-500 text-sm sm:text-base">
                            Construímos um ambiente leve, intuitivo e com fortes pilares de proteção aos usuários.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-xs">
                            <MessageSquare className="w-6 h-6 text-purple-600 mb-3" />
                            <h4 className="font-bold text-gray-900 mb-2">Mensagens Diretas</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">Conexão leve e fluida para o envio de interações e mídias.</p>
                        </div>
                        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-xs">
                            <CreditCard className="w-6 h-6 text-purple-600 mb-3" />
                            <h4 className="font-bold text-gray-900 mb-2">Transações Seguras</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">Checkout transparente com proteção criptografada de dados e cartões.</p>
                        </div>
                        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-xs">
                            <Lock className="w-6 h-6 text-purple-600 mb-3" />
                            <h4 className="font-bold text-gray-900 mb-2">Proteção de Dados</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">Respeito total à sua privacidade, operando sob rígidos padrões legais.</p>
                        </div>
                        <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-xs">
                            <Shield className="w-6 h-6 text-purple-600 mb-3" />
                            <h4 className="font-bold text-gray-900 mb-2">Moderação Rigorosa</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">Monitoramento contra abusos e conformidade estrita com termos legais e de idade.</p>
                        </div>
                    </div>
                </section>

                {/* TRANSPARÊNCIA E OPERAÇÕES (Compliance do Asaas integrado) */}
                <section className="pt-24">
                    <div className="bg-white border border-gray-200/60 rounded-3xl p-8 sm:p-12 shadow-xs">
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="text-center space-y-3">
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-950">Transparência & Conformidade</h2>
                                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                                    Conheça as diretrizes que regem e protegem as transações e a propriedade de dados no ecossistema MimoChat.
                                </p>
                            </div>

                            <div className="space-y-6 text-sm text-gray-500 leading-relaxed">
                                <div className="border-l-3 border-purple-500 pl-4 space-y-1">
                                    <h4 className="font-bold text-gray-900">1. Natureza Tecnológica do Serviço</h4>
                                    <p>
                                        O MimoChat é um provedor de hospedagem de aplicações de internet nos termos do Art. 19 do Marco Civil da Internet (Lei nº 12.965/2014). Nós oferecemos a infraestrutura tecnológica para que criadores profissionais autônomos hospedem suas galerias de mídias e conversem com seus usuários de forma privada e segura.
                                    </p>
                                </div>

                                <div className="border-l-3 border-purple-500 pl-4 space-y-1">
                                    <h4 className="font-bold text-gray-900">2. Intermediação de Pagamentos e Segurança</h4>
                                    <p>
                                        As operações financeiras do MimoChat (Pix e Cartões de Crédito) são processadas por meio de instituições reguladas pelo Banco Central, como a Asaas e a AbacatePay. O envio de "Mimos" constitui ato voluntário de apoio financeiro (doação digital) por liberalidade, sendo consumado no recebimento da mídia ou interação e não sujeito a reembolsos.
                                    </p>
                                </div>

                                <div className="border-l-3 border-purple-500 pl-4 space-y-1">
                                    <h4 className="font-bold text-gray-900">3. Política Contra Atividades Ilícitas e Idade Mínima</h4>
                                    <p>
                                        A plataforma é de uso exclusivo para maiores de 18 anos completos. Proibimos expressamente a oferta de encontros presenciais, serviços físicos ou a promoção de qualquer atividade ilegal. Nos reservamos o direito de banir usuários que violem nossos termos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* RODAPÉ CORPORATIVO PREMIUM */}
            <footer className="bg-white border-t border-gray-200/80 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        {/* Logo e Missão */}
                        <div className="space-y-4 md:col-span-2">
                            <div className="flex items-center gap-2">
                                <img
                                    src="/icon-192x192.png"
                                    alt="MimoChat"
                                    className="w-8 h-8 rounded-lg object-cover"
                                />
                                <span className="text-lg font-bold text-gray-900">MimoChat</span>
                            </div>
                            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                                Infraestrutura inteligente de hospedagem de conteúdo e rede social privada para criadores e fãs, focada na segurança operacional e privacidade de dados.
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
                                    <Link href="/institucional" className="text-purple-600 hover:text-purple-700 transition-colors font-semibold">
                                        Sobre o MimoChat
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Suporte e Informações */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Suporte</h4>
                            <ul className="space-y-2 text-xs">
                                <li>
                                    <Link href="/ajuda" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors">
                                        Central de Ajuda & FAQ
                                    </Link>
                                </li>
                                <li className="text-gray-500">
                                    E-mail de contato: <br />
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
                            © {new Date().getFullYear()} MimoChat. Todos os direitos reservados.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
