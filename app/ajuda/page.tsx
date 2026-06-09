'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, 
    HelpCircle, 
    Mail, 
    Send, 
    CheckCircle2, 
    AlertCircle, 
    ChevronDown, 
    ChevronUp,
    Shield,
    CreditCard,
    Lock
} from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
    icon: React.ComponentType<any>;
}

export default function AjudaPage() {
    const router = useRouter();

    // Estados do Formulário
    const [senderName, setSenderName] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Estado do FAQ (Index do FAQ aberto, null se nenhum)
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const faqs: FAQItem[] = [
        {
            question: "Como funciona o MimoChat?",
            answer: "O MimoChat é uma plataforma que conecta criadores de conteúdo profissionais e seus fãs. Os fãs podem assinar perfis para ver galerias privadas, iniciar sessões de chat privadas e enviar 'Mimos' (apoios financeiros voluntários) diretamente nas conversas.",
            icon: HelpCircle
        },
        {
            question: "Quais as formas de pagamento aceitas?",
            answer: "Apoiamos pagamentos rápidos e seguros via Pix (com liberação instantânea) e Cartão de Crédito. Todo o processamento de checkout e segurança é feito por intermediadoras autorizadas pelo Banco Central.",
            icon: CreditCard
        },
        {
            question: "O MimoChat protege a minha privacidade?",
            answer: "Sim! A privacidade e blindagem de dados é um dos nossos pilares mais rigorosos. Suas informações pessoais e dados de pagamento são criptografados de ponta a ponta e nunca são compartilhados ou expostos na plataforma.",
            icon: Shield
        },
        {
            question: "Como funcionam as assinaturas de perfis?",
            answer: "As assinaturas dão acesso ilimitado à galeria exclusiva de fotos e vídeos da profissional durante o período contratado (mensal). O valor é definido diretamente pela profissional em seu perfil dentro dos limites permitidos.",
            icon: Lock
        },
        {
            question: "Como posso entrar em contato direto?",
            answer: "Você pode nos enviar um e-mail a qualquer momento para suporte@mimochat.com.br ou usar o formulário de atendimento abaixo. Nossa equipe de suporte responde à maioria das solicitações em até 24 horas úteis.",
            icon: Mail
        }
    ];

    const toggleFaq = (index: number) => {
        if (openFaqIndex === index) {
            setOpenFaqIndex(null);
        } else {
            setOpenFaqIndex(index);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!senderEmail || !subject || !message) {
            setError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const response = await fetch('/api/help-tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    senderName,
                    senderEmail,
                    subject,
                    message,
                }),
            });

            if (response.ok) {
                setSuccess(true);
                setSenderName('');
                setSenderEmail('');
                setSubject('');
                setMessage('');
            } else {
                const data = await response.json();
                setError(data.error || 'Erro ao enviar sua mensagem. Tente novamente.');
            }
        } catch (err) {
            console.error('Erro ao enviar mensagem:', err);
            setError('Não foi possível conectar ao servidor de suporte. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafc] text-gray-700 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-x-hidden pb-16">
            
            {/* Elementos de Glow de Gradiente no Fundo */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full bg-purple-100/40 blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[40%] rounded-full bg-indigo-50/40 blur-[120px] pointer-events-none"></div>

            {/* Cabeçalho */}
            <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 relative z-10">
                <div className="flex items-center justify-between bg-white/70 backdrop-blur-md border border-gray-200/50 rounded-2xl px-5 py-4.5 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <img
                            src="/icon-192x192.png"
                            alt="MimoChat"
                            className="w-8 h-8 rounded-lg object-cover border border-gray-100"
                        />
                        <span className="font-bold text-gray-900 tracking-tight">
                            MimoChat <span className="text-purple-600 font-semibold text-xs ml-1">Ajuda</span>
                        </span>
                    </div>
                    
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100/60 rounded-xl transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 relative z-10 space-y-12">
                
                {/* Introdução */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
                        Como podemos te ajudar?
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                        Encontre respostas rápidas nas perguntas frequentes abaixo ou fale diretamente com a nossa equipe de suporte enviando uma mensagem.
                    </p>
                </div>

                {/* Seção FAQ */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 px-1">
                        <HelpCircle className="w-5 h-5 text-purple-600" />
                        Perguntas Frequentes
                    </h2>
                    
                    <div className="bg-white border border-gray-150 rounded-2xl shadow-xs overflow-hidden divide-y divide-gray-100">
                        {faqs.map((faq, index) => {
                            const Icon = faq.icon;
                            const isOpen = openFaqIndex === index;
                            return (
                                <div key={index} className="transition-colors">
                                    <button
                                        onClick={() => toggleFaq(index)}
                                        className="w-full flex items-center justify-between p-4.5 text-left hover:bg-gray-50/50 transition-colors focus:outline-none"
                                    >
                                        <div className="flex items-center gap-3 pr-4">
                                            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0 border border-purple-100/50">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800 leading-tight">
                                                {faq.question}
                                            </span>
                                        </div>
                                        {isOpen ? (
                                            <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                        )}
                                    </button>
                                    
                                    {isOpen && (
                                        <div className="p-4.5 bg-slate-50/30 border-t border-gray-50 text-xs sm:text-sm text-gray-500 leading-relaxed animate-fade-in">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Seção Contato/Formulário */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    
                    {/* Informações de Contato à Esquerda */}
                    <div className="md:col-span-1 space-y-5">
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between h-full min-h-[200px]">
                            <div className="space-y-4">
                                <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 w-fit">
                                    <Mail className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-lg">Suporte por E-mail</h3>
                                <p className="text-xs text-purple-100 leading-relaxed">
                                    Você também pode abrir um ticket enviando um e-mail direto da sua caixa postal de preferência.
                                </p>
                            </div>
                            
                            <div className="pt-6 border-t border-white/10">
                                <span className="text-[10px] uppercase tracking-wider text-purple-200 block font-semibold">E-mail Público:</span>
                                <a 
                                    href="mailto:suporte@mimochat.com.br" 
                                    className="font-bold text-sm hover:underline break-all"
                                >
                                    suporte@mimochat.com.br
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Formulário de Suporte à Direita */}
                    <div className="md:col-span-2">
                        <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-xs">
                            <h3 className="font-bold text-gray-900 mb-4.5 flex items-center gap-2">
                                <Send className="w-4 h-4 text-purple-600" />
                                Envie uma Mensagem
                            </h3>

                            {success ? (
                                <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center space-y-4 flex flex-col items-center">
                                    <div className="bg-green-100 text-green-600 p-3 rounded-full w-fit">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="font-bold text-green-900 text-base">Mensagem Enviada!</h4>
                                        <p className="text-xs text-green-600 leading-relaxed max-w-sm">
                                            Seu ticket foi gerado com sucesso. Enviamos uma confirmação e nossa equipe de suporte responderá ao seu e-mail em breve.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSuccess(false)}
                                        className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition-colors border border-purple-100/50"
                                    >
                                        Enviar outra mensagem
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center gap-2.5 text-rose-600 text-xs font-semibold">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <p>{error}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Nome */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block px-0.5">Seu Nome</label>
                                            <input
                                                type="text"
                                                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white text-sm text-gray-900 font-medium placeholder-gray-400 px-3 py-2.5 rounded-xl focus:outline-none transition-all"
                                                placeholder="Como se chama?"
                                                value={senderName}
                                                onChange={(e) => setSenderName(e.target.value)}
                                            />
                                        </div>

                                        {/* E-mail */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block px-0.5">E-mail para Retorno *</label>
                                            <input
                                                type="email"
                                                required
                                                className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white text-sm text-gray-900 font-medium placeholder-gray-400 px-3 py-2.5 rounded-xl focus:outline-none transition-all"
                                                placeholder="seu@email.com"
                                                value={senderEmail}
                                                onChange={(e) => setSenderEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Assunto */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block px-0.5">Assunto *</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white text-sm text-gray-900 font-medium placeholder-gray-400 px-3 py-2.5 rounded-xl focus:outline-none transition-all"
                                            placeholder="Qual o motivo do contato?"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                        />
                                    </div>

                                    {/* Mensagem */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block px-0.5">Mensagem *</label>
                                        <textarea
                                            required
                                            rows={4}
                                            className="w-full bg-gray-50 border border-gray-200 focus:border-purple-500 focus:bg-white text-sm text-gray-900 font-medium placeholder-gray-400 px-3 py-2.5 rounded-xl focus:outline-none transition-all resize-none"
                                            placeholder="Descreva detalhadamente como podemos te ajudar..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                        />
                                    </div>

                                    {/* Botão Enviar */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-11 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-200 flex items-center justify-center gap-2 cursor-pointer mt-1"
                                    >
                                        {loading ? (
                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Enviar Mensagem de Ajuda
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
