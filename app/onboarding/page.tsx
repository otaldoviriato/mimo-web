'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  DollarSign, 
  Image as ImageIcon, 
  Lock, 
  Unlock, 
  Globe, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Smartphone, 
  UserCheck, 
  ChevronRight, 
  Heart,
  Send,
  AlertCircle
} from 'lucide-react';

// Interfaces dos Slides
interface Slide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
}

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Estados para simulação do Slide 1 (Chat + Pix)
  const [chatStep, setChatStep] = useState(0);
  
  // Estados para simulação do Slide 2 (Desbloqueio de Mídia)
  const [isMediaUnlocked, setIsMediaUnlocked] = useState(false);
  const [mediaClickCount, setMediaClickCount] = useState(0);

  // Estados para o formulário de convite / inscrição (Slide 4)
  const [inviteCode, setInviteCode] = useState('');
  const [isInviteVerified, setIsInviteVerified] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistData, setWaitlistData] = useState({
    email: '',
    socialLink: '',
    source: ''
  });
  const [isWaitlistSubmitted, setIsWaitlistSubmitted] = useState(false);

  const slides: Slide[] = [
    {
      id: 0,
      title: "Receba a cada mensagem",
      subtitle: "Monetização Direta",
      description: "Valorize sua atenção de verdade. Cada mensagem que você responde de seus fãs gera ganhos automáticos transferidos via Pix direto para sua conta."
    },
    {
      id: 1,
      title: "Defina preços para mídias",
      subtitle: "Conteúdo Exclusivo",
      description: "Envie fotos ou vídeos desfocados no chat privado. Seus fãs pagam o valor que você mesma definir para desbloquear e visualizar na hora."
    },
    {
      id: 2,
      title: "Responda quando quiser",
      subtitle: "Liberdade & Controle",
      description: "Sem horários fixos, obrigações ou chefes. Você dita o ritmo das conversas e responde de onde estiver, mantendo o controle total da sua rotina."
    },
    {
      id: 3,
      title: "Pronta para começar?",
      subtitle: "Mimo Creator Club",
      description: "Junte-se à comunidade mais exclusiva de criadoras de conteúdo. Escolha como deseja entrar na plataforma abaixo."
    }
  ];

  // Loop de simulação de Chat (Slide 1) - Animado rapidamente em cascata
  useEffect(() => {
    if (currentSlide !== 0) {
      setChatStep(0);
      return;
    }

    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let t3: NodeJS.Timeout;

    const runAnimation = () => {
      setChatStep(0); // Passo 0: apenas a mensagem do fã (visível de imediato)
      
      t1 = setTimeout(() => {
        setChatStep(1); // Passo 1: a criadora responde após 900ms
      }, 900);

      t2 = setTimeout(() => {
        setChatStep(2); // Passo 2: o Pix cai instantaneamente (500ms depois da resposta)
      }, 1400);

      t3 = setTimeout(() => {
        runAnimation(); // Reinicia o ciclo
      }, 4800); // Fica exibindo por mais 3.4s antes de reiniciar
    };

    runAnimation();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [currentSlide]);

  // Reset de simulação de Mídia (Slide 2) ao mudar de slide
  useEffect(() => {
    if (currentSlide !== 1) {
      setIsMediaUnlocked(false);
      setMediaClickCount(0);
    }
  }, [currentSlide]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection('right');
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDirection('left');
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleVerifyInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setInviteError('Por favor, digite um código de convite.');
      return;
    }

    // Aceita códigos de teste, com foco especial no da Laura
    const formattedCode = inviteCode.trim().toUpperCase();
    if (formattedCode === 'LAURA10' || formattedCode === 'MIMO10' || formattedCode.startsWith('INVITE')) {
      setIsInviteVerified(true);
      setInviteError('');
    } else {
      setInviteError('Código de convite inválido ou expirado. Tente a lista de espera abaixo.');
    }
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistData.email || !waitlistData.socialLink) {
      return;
    }
    // Simula envio de lista de espera
    setIsWaitlistSubmitted(true);
  };

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] flex flex-col justify-between overflow-x-hidden">
      {/* Container Centralizado para Mobile (com visual ok no desktop) */}
      <div className="w-full max-w-md mx-auto flex flex-col justify-between flex-1 bg-white shadow-sm md:shadow-xl md:my-4 md:rounded-3xl md:border md:border-purple-100 overflow-hidden relative">
        
        {/* Cabeçalho da Página */}
        <header className="p-5 flex items-center justify-between border-b border-purple-50/50 bg-white/85 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white font-bold shadow-md shadow-purple-200">
              M
            </div>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] bg-clip-text text-transparent">
              Mimo
            </span>
            <span className="text-[10px] font-bold text-[#8B5CF6] bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100 uppercase tracking-wider">
              Creators
            </span>
          </div>

          {currentSlide < slides.length - 1 && (
            <button 
              onClick={() => setCurrentSlide(slides.length - 1)}
              className="text-xs font-semibold text-gray-400 hover:text-[#8B5CF6] transition-colors py-1 px-3 rounded-full hover:bg-purple-50/50"
            >
              Pular
            </button>
          )}
        </header>

        {/* Área Visual / Ilustrações dos slides */}
        <div className="w-full bg-[#FAF5FF] flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-[300px] border-b border-purple-50">
          
          {/* Fundo decorativo animado */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-10 left-10 w-48 h-48 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDuration: '8s' }}></div>
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
          </div>

          {/* Renderização Condicional da Ilustração do Slide */}
          <div className="w-full max-w-[280px] h-[250px] relative z-10 flex items-center justify-center">
            
            {/* SLIDE 0: Receba a cada mensagem (Chat + Pix) */}
            {currentSlide === 0 && (
              <div className="w-full flex flex-col gap-3.5 justify-center relative h-full">
                {/* Balão do fã (Passo >= 0) */}
                <div className={`transition-all duration-500 ease-out transform ${
                  chatStep >= 0 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
                } bg-white p-3.5 rounded-2xl rounded-tl-none shadow-md border border-gray-100 max-w-[85%] self-start`}>
                  <p className="text-xs font-medium text-gray-800 leading-tight">
                    Oi linda! Amei seu perfil. Como foi seu dia hoje? ❤️
                  </p>
                  <span className="text-[9px] text-gray-400 mt-1 block">Fã • Online</span>
                </div>

                {/* Balão da Criadora (Passo >= 1) */}
                <div className={`transition-all duration-500 ease-out transform ${
                  chatStep >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
                } bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] text-white p-3.5 rounded-2xl rounded-tr-none shadow-lg max-w-[85%] self-end`}>
                  <p className="text-xs font-medium leading-tight">
                    Oi fofo! Foi ótimo, e o seu? Quer conversar por aqui? 😘
                  </p>
                  <span className="text-[9px] text-purple-200 mt-1 block text-right">Você • Enviado</span>
                </div>

                {/* Notificação do Pix Recebido (Passo === 2) */}
                <div className={`absolute -bottom-2 inset-x-0 mx-auto transition-all duration-500 ease-out transform ${
                  chatStep === 2 ? 'opacity-100 translate-y-0 scale-105' : 'opacity-0 translate-y-8 scale-95'
                } bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400 max-w-[90%] justify-center animate-bounce`}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-100 block uppercase font-bold tracking-wider leading-none">Notificação Mimo</span>
                    <span className="text-sm font-black text-white">Pix Recebido: +R$ 2,50</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDE 1: Defina preços para mídias (Mídia Desfocada + Cadeado) */}
            {currentSlide === 1 && (
              <div className="w-full relative h-full flex items-center justify-center">
                <div className="w-48 h-60 rounded-3xl overflow-hidden relative shadow-2xl border-4 border-white transition-all duration-700">
                  
                  {/* Foto Real de Modelo por trás da camada */}
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=800&q=80"
                    alt="Mídia Exclusiva"
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${
                      isMediaUnlocked ? 'blur-none scale-100' : 'blur-xl scale-105 saturate-50'
                    }`}
                  />

                  {/* Degradê de sobreposição sutil na base se desbloqueado */}
                  {isMediaUnlocked && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4 text-white animate-fade-in">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-ping absolute" />
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500 relative" />
                        <span className="text-[10px] font-bold tracking-wider uppercase">Visualização Liberada</span>
                      </div>
                      <p className="text-xs font-semibold">Foto Exclusiva de Bom Dia</p>
                    </div>
                  )}

                  {/* Camada escurecedora e Detalhes de Bloqueio se bloqueado */}
                  {!isMediaUnlocked ? (
                    <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white mb-3 shadow-lg animate-pulse">
                        <Lock className="w-6 h-6" />
                      </div>
                      <p className="text-white text-xs font-bold px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm mb-6">
                        Mídia Bloqueada
                      </p>
                      
                      {/* Botão de desbloqueio interativo */}
                      <button 
                        onClick={() => {
                          setIsMediaUnlocked(true);
                          setMediaClickCount(prev => prev + 1);
                        }}
                        className="bg-white hover:bg-gray-50 text-gray-900 font-extrabold text-xs px-5 py-3 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-purple-100 group"
                      >
                        <Unlock className="w-3.5 h-3.5 text-[#8B5CF6] group-hover:rotate-12 transition-transform" />
                        Desbloquear • R$ 15,00
                      </button>
                    </div>
                  ) : (
                    /* Banner de sucesso temporário pós desbloqueio */
                    <div className="absolute top-4 inset-x-4 bg-emerald-500 text-white text-center py-2 px-3 rounded-xl shadow-lg animate-bounce text-[11px] font-bold flex items-center justify-center gap-1.5 border border-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Você recebeu R$ 15,00!
                    </div>
                  )}
                </div>

                {/* Mini dica flutuante */}
                {!isMediaUnlocked && (
                  <div className="absolute -bottom-2 bg-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg animate-bounce">
                    Clique no botão para testar! 👇
                  </div>
                )}
              </div>
            )}

            {/* SLIDE 2: Responda quando quiser (Liberdade & Controle) */}
            {currentSlide === 2 && (
              <div className="w-full relative h-full flex items-center justify-center">
                {/* Elemento central: Mockup de smartphone flutuante */}
                <div className="w-40 h-52 bg-white rounded-3xl shadow-2xl border-4 border-white overflow-hidden relative flex flex-col justify-between p-3 animate-float">
                  
                  {/* Status do topo */}
                  <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                    <span className="text-[8px] font-bold text-gray-400">Mimo App</span>
                    <div className="w-6 h-1.5 bg-gray-100 rounded-full"></div>
                  </div>

                  {/* Simulação de lista de chats respondidos */}
                  <div className="flex-1 flex flex-col gap-2.5 justify-center py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700">T</div>
                      <div className="flex-1">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-1"></div>
                        <div className="w-8 h-1 bg-emerald-400 rounded-full"></div>
                      </div>
                      <span className="text-[7px] text-emerald-500 font-bold">R$ 5,00</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-[10px] font-bold text-pink-700">M</div>
                      <div className="flex-1">
                        <div className="w-10 h-1.5 bg-gray-200 rounded-full mb-1"></div>
                        <div className="w-8 h-1 bg-emerald-400 rounded-full"></div>
                      </div>
                      <span className="text-[7px] text-emerald-500 font-bold">R$ 15,00</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">G</div>
                      <div className="flex-1">
                        <div className="w-14 h-1.5 bg-gray-200 rounded-full mb-1"></div>
                        <div className="w-8 h-1 bg-emerald-400 rounded-full"></div>
                      </div>
                      <span className="text-[7px] text-emerald-500 font-bold">R$ 10,00</span>
                    </div>
                  </div>

                  {/* Indicador de Offline/Online a qualquer hora */}
                  <div className="bg-purple-50 p-1.5 rounded-xl flex items-center justify-between">
                    <span className="text-[7px] font-extrabold text-purple-700 uppercase tracking-wider">Status do Perfil</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                      <span className="text-[8px] font-bold text-gray-700">Ativa</span>
                    </div>
                  </div>
                </div>

                {/* Ícones flutuantes decorativos em volta do celular */}
                <div className="absolute top-8 left-2 bg-white p-2.5 rounded-2xl shadow-lg border border-purple-50 text-[#8B5CF6] animate-float" style={{ animationDelay: '1s' }}>
                  <Globe className="w-5 h-5" />
                </div>
                <div className="absolute bottom-12 right-2 bg-white p-2.5 rounded-2xl shadow-lg border border-purple-50 text-[#8B5CF6] animate-float" style={{ animationDelay: '2s' }}>
                  <Clock className="w-5 h-5" />
                </div>
                <div className="absolute top-16 right-4 bg-white p-2.5 rounded-2xl shadow-lg border border-purple-50 text-[#8B5CF6] animate-float" style={{ animationDelay: '0.5s' }}>
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
            )}

            {/* SLIDE 3: Pronta para começar? (CTA de Indicação ou Lista de Espera) */}
            {currentSlide === 3 && (
              <div className="w-full relative h-full flex items-center justify-center">
                <div className="w-48 h-48 bg-gradient-to-br from-[#8B5CF6]/15 to-pink-500/10 rounded-full flex items-center justify-center border border-purple-100 animate-pulse">
                  <div className="w-36 h-36 bg-white rounded-full shadow-xl flex flex-col items-center justify-center text-center p-4">
                    <Sparkles className="w-10 h-10 text-[#8B5CF6] mb-2 animate-bounce" />
                    <span className="text-xs font-black text-gray-800 leading-tight">Ganhe Sendo Criadora</span>
                    <span className="text-[9px] text-[#8B5CF6] font-bold mt-1 uppercase tracking-wider">Acesso Exclusivo</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Informações Textuais do Slide */}
        <main className="p-8 text-center flex-1 flex flex-col justify-center">
          <div className="min-h-[140px] flex flex-col justify-center">
            <span className="text-xs font-black uppercase tracking-widest text-[#8B5CF6] mb-2 block">
              {slides[currentSlide].subtitle}
            </span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-3">
              {slides[currentSlide].title}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[290px] mx-auto">
              {slides[currentSlide].description}
            </p>
          </div>

          {/* Indicadores de progresso (pontinhos) */}
          <div className="flex justify-center gap-2 mt-6">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => {
                  setDirection(index > currentSlide ? 'right' : 'left');
                  setCurrentSlide(index);
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentSlide === index 
                    ? 'w-6 bg-[#8B5CF6] shadow-sm' 
                    : 'w-2.5 bg-purple-100 hover:bg-purple-200'
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </main>

        {/* Rodapé e Ações Principais */}
        <footer className="p-6 border-t border-purple-50 bg-white sticky bottom-0 z-20">
          
          {/* Se NÃO for o último slide: botões padrão de navegação */}
          {currentSlide < slides.length - 1 ? (
            <div className="flex items-center justify-between gap-4">
              {currentSlide > 0 ? (
                <button
                  onClick={handlePrev}
                  className="flex items-center justify-center w-12 h-12 rounded-2xl border border-purple-100 text-[#8B5CF6] hover:bg-purple-50 active:scale-95 transition-all"
                  aria-label="Slide anterior"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-12 h-12" /> // placeholder para manter alinhamento
              )}

              <button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-extrabold text-sm py-4 px-6 rounded-2xl shadow-lg shadow-purple-150 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Avançar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            
            /* Se FOR o último slide: Fluxo do CTA "Vamos começar?" */
            <div className="flex flex-col gap-3">
              
              {/* ESTADO 1: Tela inicial do Slide Final */}
              {!isInviteVerified && !showWaitlistForm && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  <button
                    onClick={() => setShowWaitlistForm(false)}
                    className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] hover:from-[#7C3AED] hover:to-[#5B21B6] text-white font-black text-sm py-4.5 px-6 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Tenho código de convite
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowWaitlistForm(true)}
                    className="w-full bg-white hover:bg-purple-50/50 text-[#8B5CF6] font-bold text-xs py-4 px-6 rounded-2xl border border-purple-100 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    Não tenho código de convite
                  </button>
                </div>
              )}

              {/* ESTADO 2: Verificação do Código de Convite */}
              {!isInviteVerified && !showWaitlistForm && (
                /* Formulário inline simplificado para convite */
                <form onSubmit={handleVerifyInvite} className="mt-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Código (Ex: LAURA10)"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value);
                        setInviteError('');
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] focus:bg-white transition-all placeholder:text-gray-400"
                    />
                    <button
                      type="submit"
                      className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-5 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      Validar
                    </button>
                  </div>
                  {inviteError && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {inviteError}
                    </p>
                  )}
                </form>
              )}

              {/* ESTADO 3: Convite Validado com Sucesso */}
              {isInviteVerified && (
                <div className="text-center p-4 bg-purple-50 border border-purple-100 rounded-2xl animate-fade-in flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 leading-tight">Pré-Aprovação Ativada!</h4>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Código de convite <span className="font-extrabold text-[#8B5CF6]">{inviteCode.toUpperCase()}</span> validado. Você foi aceita no Mimo!
                    </p>
                  </div>
                  <button
                    onClick={() => alert('Parabéns! Na próxima etapa você criará a conta conectando ao back-end.')}
                    className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-md transition-all mt-1"
                  >
                    Criar minha conta de Criadora
                  </button>
                </div>
              )}

              {/* ESTADO 4: Formulário de Inscrição / Lista de Espera */}
              {showWaitlistForm && !isWaitlistSubmitted && (
                <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3.5 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Formulário de Inscrição</h4>
                    <button 
                      type="button" 
                      onClick={() => setShowWaitlistForm(false)}
                      className="text-[10px] font-bold text-gray-400 hover:text-gray-600"
                    >
                      Voltar ao convite
                    </button>
                  </div>
                  <input
                    type="email"
                    placeholder="Seu melhor e-mail"
                    required
                    value={waitlistData.email}
                    onChange={(e) => setWaitlistData({...waitlistData, email: e.target.value})}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] focus:bg-white transition-all placeholder:text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Link do seu Instagram ou Privacy"
                    required
                    value={waitlistData.socialLink}
                    onChange={(e) => setWaitlistData({...waitlistData, socialLink: e.target.value})}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] focus:bg-white transition-all placeholder:text-gray-400"
                  />
                  <select
                    value={waitlistData.source}
                    onChange={(e) => setWaitlistData({...waitlistData, source: e.target.value})}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:border-[#8B5CF6] focus:bg-white transition-all text-gray-700"
                  >
                    <option value="" disabled>Como conheceu o Mimo?</option>
                    <option value="instagram">Instagram</option>
                    <option value="privacy">Privacy / OnlyFans</option>
                    <option value="friend">Indicação de amiga</option>
                    <option value="other">Outro local</option>
                  </select>
                  <button
                    type="submit"
                    className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    Enviar Inscrição
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* ESTADO 5: Inscrição na Lista de Espera Enviada com Sucesso */}
              {isWaitlistSubmitted && (
                <div className="text-center p-5 bg-purple-50 border border-purple-100 rounded-2xl animate-fade-in flex flex-col gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 leading-tight">Inscrição Enviada!</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      Sua solicitação foi registrada. Nossa equipe analisará seu perfil nas redes sociais e enviará uma resposta por e-mail em até 48 horas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWaitlistSubmitted(false);
                      setShowWaitlistForm(false);
                      setWaitlistData({ email: '', socialLink: '', source: '' });
                    }}
                    className="text-xs font-bold text-[#8B5CF6] hover:underline"
                  >
                    Voltar ao início
                  </button>
                </div>
              )}
            </div>
          )}
        </footer>
      </div>

      {/* Adição de Estilos e Animações CSS Customizadas via Tag Style */}
      <style jsx global>{`
        /* Animação de Flutuação Vertical */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        /* Fade In */
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Efeito de Gradiente Animado */
        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 5s ease infinite;
        }
      `}</style>
    </div>
  );
}
