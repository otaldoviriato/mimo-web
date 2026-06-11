'use client';

import React, { FormEvent, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    ArrowRight, 
    ShieldCheck, 
    Sparkles, 
    Check, 
    CheckCircle2, 
    MessageCircle, 
    Zap, 
    Lock, 
    Users, 
    Wallet, 
    FileText, 
    Eye, 
    Send, 
    BadgeCheck, 
    Flame,
    ArrowUpRight,
    HelpCircle,
    User,
    LockKeyhole,
    DollarSign
} from 'lucide-react';
import { InstagramIcon } from '@/components/InstagramIcon';

// Mockup de Chat Interativo
const chatDemoMessages = [
    { id: 1, sender: 'fan', text: 'Oi! Adoro seus conteúdos no Instagram! Tem alguma prévia exclusiva do ensaio de hoje por aqui?', delay: 1000 },
    { id: 2, sender: 'creator', text: 'Oi, tudo bem? Que bom te ter aqui! Fico super feliz com o carinho. 💜', delay: 2000 },
    { id: 3, sender: 'creator', text: 'Tenho sim! Acabei de mandar o vídeo de bastidores exclusivo e algumas fotos especiais do ensaio. É só clicar para ver:', delay: 1500 },
    { id: 4, sender: 'media', mediaType: 'video', isLocked: true, price: 'R$ 29,90', title: 'Bastidores Ensaio Outfit.mp4', delay: 1000 },
];

const initialForm = {
    fullName: '',
    artisticName: '',
    instagram: '',
    whatsapp: '',
    email: '',
    age: '',
    cityState: '',
    hasOnlineExperience: '',
    howFoundMimo: '',
    reason: '',
    isAdultConfirmed: false,
    contactConsent: false,
    company: '',
};

type FormState = typeof initialForm;

const inputClass = 'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100';

export default function ParaCriadorasPage() {
    const [form, setForm] = useState<FormState>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Estado para o Mockup de Chat Interativo
    const [visibleMessages, setVisibleMessages] = useState<typeof chatDemoMessages>([]);
    const [isMediaLocked, setIsMediaLocked] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [typingText, setTypingText] = useState('');

    useEffect(() => {
        let index = 0;
        const showNextMessage = () => {
            if (index < chatDemoMessages.length) {
                setIsTyping(true);
                const nextMsg = chatDemoMessages[index];
                
                setTimeout(() => {
                    setIsTyping(false);
                    setVisibleMessages(prev => [...prev, nextMsg]);
                    index++;
                    if (index < chatDemoMessages.length) {
                        setTimeout(showNextMessage, chatDemoMessages[index].delay);
                    }
                }, 1200); // Simulando digitação
            }
        };

        // Inicia a simulação do chat
        const startTimeout = setTimeout(showNextMessage, 1000);
        return () => {
            clearTimeout(startTimeout);
        };
    }, []);

    function handleUnlockMedia() {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            setIsMediaLocked(false);
            // Mensagem de comemoração após desbloqueio
            setVisibleMessages(prev => [
                ...prev,
                { id: 5, sender: 'fan', text: 'Uau! Os bastidores ficaram incríveis! Valeu muito a pena, obrigada! 😍🔥', delay: 500 }
            ]);
        }, 1000);
    }

    function resetDemoChat() {
        setVisibleMessages([]);
        setIsMediaLocked(true);
        setIsTyping(true);
        let index = 0;
        const showNextMessage = () => {
            if (index < chatDemoMessages.length) {
                setIsTyping(true);
                const nextMsg = chatDemoMessages[index];
                setTimeout(() => {
                    setIsTyping(false);
                    setVisibleMessages(prev => [...prev, nextMsg]);
                    index++;
                    if (index < chatDemoMessages.length) {
                        setTimeout(showNextMessage, chatDemoMessages[index].delay);
                    }
                }, 1200);
            }
        };
        showNextMessage();
    }

    function scrollToForm() {
        document.getElementById('inscricao-fundadora')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
        setForm(current => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');

        const age = Number(form.age);
        if (!Number.isInteger(age) || age < 18) {
            setError('Você precisa ter 18 anos ou mais para se inscrever.');
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

            if (!response.ok) {
                throw new Error(data.error || 'Não foi possível enviar sua inscrição.');
            }

            setSuccess(true);
            setForm(initialForm);
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : 'Não foi possível enviar sua inscrição. Tente novamente.'
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#fafafc] text-gray-700 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-hidden">
            
            {/* Elementos de Fundo (Glows de Gradiente Premium) */}
            <div className="absolute top-[-10%] left-[-15%] w-[60%] h-[50%] rounded-full bg-purple-200/40 blur-[130px] pointer-events-none"></div>
            <div className="absolute top-[30%] right-[-10%] w-[50%] h-[40%] rounded-full bg-fuchsia-200/30 blur-[130px] pointer-events-none"></div>
            <div className="absolute bottom-[20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[120px] pointer-events-none"></div>

            {/* Cabeçalho / Navegação */}
            <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-30">
                <nav className="flex items-center justify-between bg-white/70 backdrop-blur-md border border-gray-200/50 rounded-2xl px-6 py-4 shadow-xs">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/icon-192x192.png"
                            alt="MimoChat"
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-xl object-cover shadow-xs border border-gray-100"
                        />
                        <div>
                            <span className="block text-lg font-bold text-gray-900 tracking-tight leading-none">Mimo Chat</span>
                            <span className="block text-[9px] font-extrabold uppercase tracking-widest text-purple-600 mt-1">Para Criadoras</span>
                        </div>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
                        <a href="#diferenciais" className="hover:text-purple-600 transition-colors">Diferenciais</a>
                        <a href="#monetizacao" className="hover:text-purple-600 transition-colors">Como Funciona</a>
                        <a href="#fundadoras" className="hover:text-purple-600 transition-colors">Programa de Fundadoras</a>
                        <a href="#creators" className="hover:text-purple-600 transition-colors">Apoio Creators</a>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Entrar no App
                        </Link>
                        <button
                            onClick={scrollToForm}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.01]"
                        >
                            Seja Fundadora
                        </button>
                    </div>
                </nav>
            </header>

            {/* HERO SECTION */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 relative z-20">
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    {/* Copywriting */}
                    <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            A Nova Era da Monetização
                        </div>
                        
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-950 tracking-tight leading-[1.05]">
                            O aplicativo de mensagens <br />
                            <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
                                feito para monetizar suas conversas.
                            </span>
                        </h1>
                        
                        <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                            Esqueça os feeds estáticos e as curtidas vazias de plataformas como OnlyFans e Privacy. 
                            O Mimo Chat é um aplicativo de conversas privado onde cada mensagem, foto e vídeo exclusivo 
                            gera receita direta no seu tempo, com a leveza de um chat de celular.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                            <button
                                onClick={scrollToForm}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl transition-all duration-300 shadow-md shadow-purple-200 hover:-translate-y-0.5 group"
                            >
                                Quero Participar da Fase Inicial
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </button>
                            <Link
                                href="/creators"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition-all duration-300 shadow-xs"
                            >
                                Conhecer a Área Creators
                            </Link>
                        </div>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 pt-6 border-t border-gray-150 text-xs font-semibold text-gray-400">
                            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-purple-600" /> Cadastro 100% Protegido</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-purple-600" /> Sem feeds obrigatórios</span>
                            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-purple-600" /> Conversas que geram valor</span>
                        </div>
                    </div>

                    {/* Mockup de Celular Interativo */}
                    <div className="lg:col-span-5 relative flex justify-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-fuchsia-500/20 rounded-[3rem] blur-xl opacity-80 pointer-events-none scale-90"></div>
                        <div className="relative w-full max-w-[340px] border-[12px] border-slate-900 bg-slate-950 rounded-[3.2rem] shadow-2xl overflow-hidden aspect-[9/18.5] flex flex-col">
                            {/* Câmera/Dynamic Island */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center">
                                <div className="w-3 h-3 rounded-full bg-slate-800 mr-2"></div>
                                <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
                            </div>

                            {/* Header do Chat */}
                            <div className="bg-slate-900 text-white pt-8 pb-3 px-4 flex items-center gap-2 border-b border-white/5">
                                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-extrabold shadow-sm relative">
                                    M
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold leading-tight flex items-center gap-1">
                                        Mimo Chat
                                        <BadgeCheck className="w-3.5 h-3.5 text-purple-400 fill-current" />
                                    </h4>
                                    <span className="text-[9px] text-gray-400 font-medium">Fã Online</span>
                                </div>
                                <button 
                                    onClick={resetDemoChat} 
                                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 px-2 py-1 bg-white/5 rounded-lg transition-all"
                                >
                                    Reiniciar
                                </button>
                            </div>

                            {/* Corpo do Chat */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0f0b15] flex flex-col justify-end text-xs scrollbar-none">
                                {visibleMessages.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className={`flex flex-col max-w-[85%] ${msg.sender === 'fan' ? 'self-start' : 'self-end'}`}
                                    >
                                        {msg.sender === 'fan' && (
                                            <span className="text-[9px] text-purple-300 font-medium mb-1 ml-1.5">Apoiador</span>
                                        )}
                                        {msg.sender === 'creator' && (
                                            <span className="text-[9px] text-gray-400 font-medium mb-1 mr-1.5 self-end">Você (Criadora)</span>
                                        )}
                                        
                                        {/* Balão de texto normal */}
                                        {msg.text && (
                                            <div className={`p-3 rounded-2xl leading-relaxed shadow-xs ${
                                                msg.sender === 'fan' 
                                                    ? 'bg-slate-900 text-white rounded-tl-xs' 
                                                    : 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-tr-xs'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        )}

                                        {/* Balão de mídia paga */}
                                        {msg.mediaType === 'video' && (
                                            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-purple-500/30 text-white rounded-tr-xs">
                                                {isMediaLocked ? (
                                                    <div className="p-4 flex flex-col items-center text-center space-y-3 relative">
                                                        {/* Imagem de Fundo Borrada Fictícia */}
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/60 via-slate-900 to-slate-950 opacity-40 blur-xs"></div>
                                                        
                                                        <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 z-10">
                                                            <Lock className="w-4 h-4" />
                                                        </div>
                                                        <div className="z-10">
                                                            <p className="text-[10px] text-gray-400 font-semibold">{msg.title}</p>
                                                            <p className="text-xs font-bold mt-0.5 text-purple-200">Conteúdo Privado</p>
                                                        </div>
                                                        <button 
                                                            onClick={handleUnlockMedia}
                                                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-[10px] transition-all duration-300 shadow-md shadow-purple-900/50 hover:scale-[1.02] active:scale-95 z-10 cursor-pointer"
                                                        >
                                                            Desbloquear por {msg.price}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="h-28 bg-purple-900/20 flex flex-col items-center justify-center p-3 text-center relative">
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1.5 animate-bounce">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider">🔓 Mídia Desbloqueada!</span>
                                                            <span className="text-[8px] text-gray-400 mt-0.5">O valor de {msg.price} foi creditado no seu saldo.</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Indicador de Digitação */}
                                {isTyping && (
                                    <div className="self-start flex items-center gap-1.5 bg-slate-900 py-2.5 px-4 rounded-full text-gray-400 shadow-xs border border-white/5">
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                )}
                            </div>

                            {/* Campo de Entrada de Mensagens */}
                            <div className="bg-slate-900 p-3 flex items-center gap-2 border-t border-white/5">
                                <div className="flex-1 bg-slate-950 border border-white/5 rounded-full px-3 py-2 text-[10px] text-gray-500 font-medium">
                                    Digite uma mensagem...
                                </div>
                                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white">
                                    <Send className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* POR QUE O MIMO É DIFERENTE? */}
                <section id="diferenciais" className="pt-32">
                    <div className="text-center max-w-3xl mx-auto space-y-4">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                            Foco total na Experiência
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
                            Por que o Mimo Chat é totalmente diferente?
                        </h2>
                        <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto">
                            Tradicionais feeds estáticos não funcionam para quem quer construir conexão humana de verdade. Veja como nos diferenciamos das velhas plataformas:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-16 max-w-5xl mx-auto">
                        {/* OnlyFans / Privacy */}
                        <div className="bg-white border border-gray-150 rounded-3xl p-8 shadow-xs relative overflow-hidden group hover:border-gray-300 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 rounded-full blur-2xl opacity-40 pointer-events-none"></div>
                            <div className="flex items-center gap-3 text-gray-400 mb-6">
                                <Users className="w-6 h-6" />
                                <span className="font-extrabold text-sm uppercase tracking-wider">OnlyFans & Privacy</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Plataformas Baseadas em Feeds</h3>
                            
                            <ul className="space-y-4 text-sm text-gray-500">
                                <li className="flex items-start gap-2.5">
                                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0 mt-2"></span>
                                    <span>**Foco em Feed e Postagem**: Exige volume de posts públicos para atrair novos fãs, transformando-se em mais uma rede social exaustiva.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0 mt-2"></span>
                                    <span>**Mensagens como Secundário**: Chats difíceis de usar, lentos e com baixa taxa de conversão e engajamento.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0 mt-2"></span>
                                    <span>**Falta de Notificações Eficientes**: O fã dificilmente sabe quando você respondeu, fazendo a conversa esfriar.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0 mt-2"></span>
                                    <span>**Ambiente Impessoal**: A sensação de estar em uma grande vitrine corporativa sem proximidade ou acolhimento.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Mimo Chat */}
                        <div className="bg-purple-950 border border-purple-800 rounded-3xl p-8 shadow-md relative overflow-hidden group hover:border-purple-600 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-700/20 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="flex items-center gap-3 text-purple-300 mb-6">
                                <Flame className="w-6 h-6 text-purple-400 animate-pulse" />
                                <span className="font-extrabold text-sm uppercase tracking-wider text-purple-300">Mimo Chat</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-4">O App de Conversa Monetizada</h3>
                            
                            <ul className="space-y-4 text-sm text-purple-100/80">
                                <li className="flex items-start gap-2.5">
                                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>**Conversas como Elemento Central**: A experiência é um chat fluido, onde o fã entra diretamente para falar com você em particular.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>**Monetização Nativa e Transparente**: Opções de cobrar por caractere nas conversas, gerando saldo pelo tempo gasto respondendo.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>**Notificações Instantâneas**: Avisos nativos em tempo real que fazem o fã voltar ao chat na hora e desbloquear mídias.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <Check className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>**Experiência de App de Verdade**: Visual moderno e intuitivo no navegador que parece o WhatsApp ou iMessage.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* COMO FUNCIONA A MONETIZAÇÃO */}
                <section id="monetizacao" className="pt-32">
                    <div className="bg-white border border-gray-150 rounded-3xl p-8 sm:p-16 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50/40 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center space-y-4">
                                <span className="text-purple-600 font-extrabold text-sm uppercase tracking-wider">Monetização de Verdade</span>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-950">Como você ganha no Mimo</h2>
                                <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
                                    Três formas de monetização integradas no chat para você gerenciar seus lucros sem complicação.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                                {/* Cobrança por caractere */}
                                <div className="space-y-4">
                                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                                        <MessageCircle className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-950">Cobrança por Caractere</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed font-normal">
                                        Seu tempo é valioso. Defina um valor por caractere para que os fãs paguem proporcionalmente pela atenção e respostas completas que você oferece no chat.
                                    </p>
                                </div>

                                {/* Fotos e Vídeos Pagos */}
                                <div className="space-y-4">
                                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                                        <LockKeyhole className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-950">Mídias "Pay-to-Unlock"</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed font-normal">
                                        Envie fotos e vídeos borrados e bloqueados diretamente na conversa. O fã decide se quer pagar o valor que você escolheu para revelar a mídia instantaneamente.
                                    </p>
                                </div>

                                {/* Mimos Voluntários */}
                                <div className="space-y-4">
                                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-950">Mimos Digitais</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed font-normal">
                                        Seus apoiadores podem enviar presentes digitais ou "Mimos" voluntários a qualquer momento como doação por Pix ou cartão de crédito em forma de gratidão.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* QUEM ESTÁ POR TRÁS & VALORES (FOUNDERS) */}
                <section className="pt-32">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-3xl blur-md opacity-10 pointer-events-none"></div>
                            <img
                                src="/assets/founders_hero.png"
                                alt="Edmilson e Laura - Fundadores"
                                className="rounded-3xl shadow-lg border border-white/50 w-full max-h-[380px] object-cover"
                            />
                        </div>

                        <div className="space-y-6">
                            <span className="text-xs font-extrabold uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                                Founders
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
                                Criado por pessoas de verdade
                            </h2>
                            <p className="text-base text-gray-600 leading-relaxed font-normal">
                                O Mimo é desenvolvido por **Edmilson** (desenvolvedor focado em tecnologia segura) e **Laura** (especialista em comunidade).
                                Nós acreditamos que a tecnologia deve servir para trazer liberdade financeira, privacidade e respeito à sua rotina como criadora.
                            </p>
                            <p className="text-sm text-gray-500">
                                Queremos nos afastar da impessoalidade das plataformas de fora e oferecer um ambiente de confiança, com suporte ativo e onde sua opinião é ouvida na construção das funcionalidades.
                            </p>
                            
                            <div className="pt-2">
                                <Link
                                    href="/founders"
                                    className="inline-flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors group"
                                >
                                    Conhecer a história completa dos Founders 
                                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PROGRAMA DE FUNDADORAS */}
                <section id="fundadoras" className="pt-32">
                    <div className="bg-purple-950 text-white rounded-3xl p-8 sm:p-16 relative overflow-hidden shadow-xl">
                        {/* Glows */}
                        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-800/30 blur-[100px] pointer-events-none"></div>
                        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/40 blur-[100px] pointer-events-none"></div>
                        
                        <div className="relative z-10 max-w-4xl mx-auto">
                            <div className="text-center space-y-4">
                                <span className="text-purple-300 font-bold text-xs uppercase tracking-wider">Early Access</span>
                                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Programa de Criadoras Fundadoras</h2>
                                <p className="text-purple-100 text-sm sm:text-base max-w-2xl mx-auto">
                                    Estamos selecionando um grupo exclusivo de criadoras para a fase de pré-lançamento do Mimo. Conheça as vantagens de construir a plataforma conosco:
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-purple-300">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1">Taxas Reduzidas Vitalícias</h4>
                                        <p className="text-xs text-purple-200 leading-relaxed font-normal">
                                            As primeiras criadoras aprovadas no programa receberão taxas administrativas reduzidas de forma vitalícia no faturamento de mídias e mensagens.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-purple-300">
                                        <MessageCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1">Suporte e Canal Direto</h4>
                                        <p className="text-xs text-purple-200 leading-relaxed font-normal">
                                            Você terá contato de WhatsApp direto com os fundadores para tirar dúvidas, receber feedback prioritário e nos ajudar a testar novos recursos do chat.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-purple-300">
                                        <BadgeCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1">Destaque de Fundadora</h4>
                                        <p className="text-xs text-purple-200 leading-relaxed font-normal">
                                            Seu perfil receberá um selo especial de pioneirismo e terá destaque inicial de algoritmo nas seções de recomendações e pesquisas futuras.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-purple-300">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1">Co-criação da Plataforma</h4>
                                        <p className="text-xs text-purple-200 leading-relaxed font-normal">
                                            Suas sugestões serão transformadas em código. Queremos que a plataforma atenda especificamente aos seus desafios e anseios como criadora.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 text-center">
                                <button
                                    onClick={scrollToForm}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 font-extrabold text-purple-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-purple-50 cursor-pointer"
                                >
                                    Solicitar Inscrição de Fundadora
                                    <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* EDUCAÇÃO / CREATORS */}
                <section id="creators" className="pt-32">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-6 shadow-xs">
                        <span className="text-purple-600 font-extrabold text-xs uppercase tracking-wider">Área Creators</span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                            Aprenda a crescer e faturar
                        </h2>
                        <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                            No Mimo, você não fica sozinha. Criamos a **Área Creators**, um espaço de apoio completo para você 
                            aprender as melhores estratégias de divulgação. Acesse scripts prontos para stories, 
                            ideias de links de bio para Instagram, tutoriais passo a passo de como configurar sua carteira e muito mais.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link
                                href="/creators"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-2xl transition-all duration-300 shadow-md shadow-purple-200 hover:-translate-y-0.5"
                            >
                                Acessar Área Creators & Tutoriais
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* CONFIANÇA, SEGURANÇA E COMPLIANCE */}
                <section className="pt-32">
                    <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 shadow-xs">
                        <div className="max-w-4xl mx-auto space-y-10">
                            <div className="text-center space-y-3">
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-950">Segurança de Dados, Transparência & LGPD</h2>
                                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                                    O Mimo Chat opera em estrito cumprimento das leis brasileiras de segurança e privacidade.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-500 leading-relaxed">
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-bold text-gray-900 mb-1">Privacidade Total e LGPD</h5>
                                            <p>Seus dados de cadastro, telefone e faturamento são blindados sob a Lei Geral de Proteção de Dados (LGPD). Seus fãs nunca têm acesso aos seus dados pessoais reais (nome civil, documentos ou contatos).</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-bold text-gray-900 mb-1">Instituições de Pagamento Reguladas</h5>
                                            <p>Nossas integrações de pagamento (Asaas, AbacatePay e outras) garantem transações criptografadas, transferências Pix instantâneas e cartões de crédito processados com total segurança bancária.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-bold text-gray-900 mb-1">Empresa Real e Identificada</h5>
                                            <p>Diferente de plataformas estrangeiras sem representação no Brasil, o Mimo é administrado por uma empresa legalizada: **LEAD CONTEUDOS DIGITAIS LTDA**, inscrita sob o **CNPJ: 60.312.273/0001-01**.</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-bold text-gray-900 mb-1">Moderação e Proteção Legal</h5>
                                            <p>Acesso exclusivo para maiores de 18 anos completos. Proibimos estritamente encontros presenciais, serviços físicos ou atividades ilícitas, promovendo uma comunidade saudável e protegida.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FORMULÁRIO DE INSCRIÇÃO */}
                <section id="inscricao-fundadora" className="scroll-mt-4 pt-32">
                    <div className="mx-auto max-w-3xl">
                        <div className="text-center space-y-4 mb-10">
                            <span className="text-xs font-extrabold uppercase tracking-widest text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                                Inscrição Rápida
                            </span>
                            <h2 className="text-3xl font-extrabold text-slate-950 sm:text-4xl">Candidate-se ao Programa de Fundadoras</h2>
                            <p className="mt-4 leading-relaxed text-slate-600 max-w-xl mx-auto">
                                Preencha com atenção. Nossa equipe analisa os perfis manualmente e entra em contato via WhatsApp para finalizar a liberação.
                            </p>
                        </div>

                        {success ? (
                            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center sm:p-12 shadow-sm">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <BadgeCheck className="h-9 w-9" />
                                </div>
                                <h3 className="mt-5 text-2xl font-black text-emerald-950">Inscrição de Fundadora Recebida! 💜</h3>
                                <p className="mx-auto mt-3 max-w-xl leading-relaxed text-emerald-800">
                                    Obrigada por enviar seus dados. Edmilson ou Laura vão analisar seu Instagram e entrar em contato pelo WhatsApp nos próximos dias.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-slate-200 bg-white/70 backdrop-blur-md p-6 shadow-sm sm:p-10">
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <label className="block text-sm font-bold text-slate-800">
                                        <span>Nome completo <span className="text-purple-600">*</span></span>
                                        <input
                                            required
                                            value={form.fullName}
                                            onChange={event => updateField('fullName', event.target.value)}
                                            className={inputClass}
                                            placeholder="Seu nome completo"
                                        />
                                    </label>
                                    
                                    <label className="block text-sm font-bold text-slate-800">
                                        <span>Nome artístico/apelido <span className="text-xs font-medium text-slate-400">(Opcional)</span></span>
                                        <input
                                            value={form.artisticName}
                                            onChange={event => updateField('artisticName', event.target.value)}
                                            className={inputClass}
                                            placeholder="Como sua comunidade te conhece"
                                        />
                                    </label>
                                    
                                    <label className="block text-sm font-bold text-slate-800">
                                        <span>Instagram <span className="text-purple-600">*</span></span>
                                        <input
                                            required
                                            value={form.instagram}
                                            onChange={event => updateField('instagram', event.target.value)}
                                            className={inputClass}
                                            placeholder="@seuinstagram"
                                            autoCapitalize="none"
                                        />
                                    </label>
                                    
                                    <label className="block text-sm font-bold text-slate-800">
                                        <span>WhatsApp <span className="text-purple-600">*</span></span>
                                        <input
                                            required
                                            value={form.whatsapp}
                                            onChange={event => updateField('whatsapp', event.target.value)}
                                            className={inputClass}
                                            placeholder="(11) 99999-9999"
                                            inputMode="tel"
                                        />
                                    </label>
                                    
                                    <label className="block text-sm font-bold text-slate-800">
                                        <span>E-mail <span className="text-xs font-medium text-slate-400">(Opcional)</span></span>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={event => updateField('email', event.target.value)}
                                            className={inputClass}
                                            placeholder="voce@email.com"
                                            autoCapitalize="none"
                                        />
                                    </label>
                                    
                                    <label className="block text-sm font-bold text-slate-800">
                                        <span>Idade <span className="text-purple-600">*</span></span>
                                        <input
                                            required
                                            type="number"
                                            min={18}
                                            max={100}
                                            value={form.age}
                                            onChange={event => updateField('age', event.target.value)}
                                            className={inputClass}
                                            placeholder="Ex: 22"
                                            inputMode="numeric"
                                        />
                                    </label>
                                    
                                    <label className="block text-sm font-bold text-slate-800">
                                        <span>Cidade/Estado <span className="text-purple-600">*</span></span>
                                        <input
                                            required
                                            value={form.cityState}
                                            onChange={event => updateField('cityState', event.target.value)}
                                            className={inputClass}
                                            placeholder="Ex: São Paulo/SP"
                                        />
                                    </label>
                                    
                                    <label className="block text-sm font-bold text-slate-800">
                                        <span>Você já cria conteúdo ou atende clientes online? <span className="text-purple-600">*</span></span>
                                        <select
                                            required
                                            value={form.hasOnlineExperience}
                                            onChange={event => updateField('hasOnlineExperience', event.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Selecione uma opção</option>
                                            <option value="yes">Sim, já tenho experiência</option>
                                            <option value="no">Não tenho experiência</option>
                                            <option value="starting">Estou começando agora</option>
                                        </select>
                                    </label>
                                </div>

                                <label className="block text-sm font-bold text-slate-800">
                                    <span>Como você conheceu o Mimo Chat? <span className="text-purple-600">*</span></span>
                                    <input
                                        required
                                        value={form.howFoundMimo}
                                        onChange={event => updateField('howFoundMimo', event.target.value)}
                                        className={inputClass}
                                        placeholder="Ex: Indicação no Instagram, pesquisa, convite..."
                                    />
                                </label>

                                <label className="block text-sm font-bold text-slate-800">
                                    <span>Por que você quer ser uma Criadora Fundadora do Mimo? <span className="text-purple-600">*</span></span>
                                    <textarea
                                        required
                                        rows={5}
                                        value={form.reason}
                                        onChange={event => updateField('reason', event.target.value)}
                                        className={`${inputClass} resize-none`}
                                        placeholder="Fale um pouco sobre você, seu nicho de atuação e suas expectativas com o app."
                                    />
                                </label>

                                {/* Honeypot para prevenção de spam de bots */}
                                <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
                                    <label>
                                        Empresa
                                        <input
                                            tabIndex={-1}
                                            autoComplete="off"
                                            value={form.company}
                                            onChange={event => updateField('company', event.target.value)}
                                        />
                                    </label>
                                </div>

                                <div className="space-y-4">
                                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            required
                                            checked={form.isAdultConfirmed}
                                            onChange={event => updateField('isAdultConfirmed', event.target.checked)}
                                            className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-purple-600 cursor-pointer"
                                        />
                                        <span>Confirmo que tenho 18 anos ou mais. <span className="text-purple-600">*</span></span>
                                    </label>
                                    
                                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            required
                                            checked={form.contactConsent}
                                            onChange={event => updateField('contactConsent', event.target.checked)}
                                            className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-purple-600 cursor-pointer"
                                        />
                                        <span>Aceito ser contatada pelo time do Mimo Chat via WhatsApp/E-mail. <span className="text-purple-600">*</span></span>
                                    </label>
                                </div>

                                {error && (
                                    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 animate-shake">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-4 font-extrabold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                >
                                    {submitting ? 'Enviando sua candidatura...' : 'Enviar Candidatura de Fundadora'}
                                    {!submitting && <Send className="h-5 w-5" />}
                                </button>
                                
                                <p className="text-center text-xs leading-relaxed text-slate-400 font-medium">
                                    O envio da candidatura não garante aprovação imediata. A seleção é feita de forma responsável pela segurança de todos.
                                </p>
                            </form>
                        )}
                    </div>
                </section>
            </main>

            {/* RODAPÉ PREMIUM COMPLETO */}
            <footer className="bg-white border-t border-gray-200/80 relative z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        {/* Logo e Missão */}
                        <div className="space-y-4 md:col-span-2">
                            <div className="flex items-center gap-2">
                                <Image
                                    src="/icon-192x192.png"
                                    alt="MimoChat"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-lg object-cover"
                                />
                                <span className="text-lg font-bold text-gray-900">Mimo Chat</span>
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

                        {/* Suporte e Contato */}
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
