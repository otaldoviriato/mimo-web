'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    User, Crown, Check, CheckCircle2, ShieldCheck, CreditCard, Calendar,
    Camera, ChevronLeft, UserCheck, Loader2, X, Plus, AlertCircle
} from 'lucide-react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';
import { useMyProfile } from '@/hooks/useQueries';
import { ImageCropper } from '@/components/ImageCropper';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Step = 'welcome' | 'identity' | 'profile' | 'done';
type Dir  = 'forward' | 'backward';

// Steps do fluxo profissional (excluindo o welcome que é compartilhado)
const PRO_STEPS: Step[] = ['identity', 'profile', 'done'];

// Mapa de step → step anterior para interceptação do gesto de voltar
const PREV_ONBOARD: Partial<Record<Step, Step>> = {
    identity: 'welcome',
    profile:  'identity',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeSeg(str: string) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function generateSuggestions(name: string): string[] {
    if (!name.trim()) return [];
    const parts = name.split(/\s+/).map(normalizeSeg).filter(Boolean);
    if (!parts.length) return [];
    const out: string[] = [];
    if (parts.length >= 2) {
        out.push(`${parts[0]}_${parts[1]}`);
        out.push(`${parts[0]}.${parts[1]}`);
        out.push(`${parts[0]}${parts[1]}`);
    } else {
        const b = parts[0];
        out.push(`${b}_chat`);
        out.push(`${b}.mimo`);
        out.push(`${b}${Math.floor(100 + Math.random() * 900)}`);
    }
    return [...new Set(out)].slice(0, 3);
}

function maskCpf(raw: string) {
    const c = raw.replace(/\D/g, '').slice(0, 11);
    if (c.length <= 3) return c;
    if (c.length <= 6) return `${c.slice(0, 3)}.${c.slice(3)}`;
    if (c.length <= 9) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6)}`;
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9, 11)}`;
}

function maskDate(raw: string) {
    const c = raw.replace(/\D/g, '').slice(0, 8);
    if (c.length <= 2) return c;
    if (c.length <= 4) return `${c.slice(0, 2)}/${c.slice(2)}`;
    return `${c.slice(0, 2)}/${c.slice(2, 4)}/${c.slice(4)}`;
}

// ─── Componente Principal ────────────────────────────────────────────────────

// Chave usada no localStorage para persistir o step atual do onboarding.
// Só é removida quando o usuário conclui o cadastro clicando em "Concluir Cadastro".
const STEP_KEY = 'mimo_onboarding_step';

export default function OnboardingPage() {
    const router = useTransitionRouter();
    const { data: userData, refetch } = useMyProfile();

    // Controla se a lógica de inicialização já rodou. Evita que atualizações
    // do userData durante o fluxo (ex: após validar CPF) causem redirect para /chats.
    const initialized = useRef(false);

    // ── Cropper de foto ──
    const [cropperSrc,   setCropperSrc]   = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // ── Status de disponibilidade do username ──
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Estado de carregamento das sugestões de username ──
    const [sugsLoading, setSugsLoading] = useState(false);

    // Cache da última verificação de identidade bem-sucedida nesta sessão.
    // Formato: { cpf: string (só dígitos), birth: string (DD/MM/AAAA) }
    // Se o usuário voltar e tentar com os mesmos valores, avançamos direto sem nova chamada à API.
    const verifiedIdentity = useRef<{ cpf: string; birth: string } | null>(null);

    // ── Máquina de estado da animação ──
    const [step,    setStep]    = useState<Step>('welcome');
    const [outStep, setOutStep] = useState<Step | null>(null);
    const [dir,     setDir]     = useState<Dir>('forward');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Refs usados pelo interceptor de gesto de voltar para acessar sempre
    // o estado mais recente sem criar stale closures no listener de popstate.
    const stepRef = useRef<Step>(step);
    const goRef   = useRef<(next: Step, d?: Dir) => void>(() => {});

    // ── Estado do step "welcome" ──
    // Controla a animação de dismiss (saída do onboarding para cima, revelando o app base)
    const [isDismissing, setIsDismissing] = useState(false);

    const [role,        setRole]        = useState<'client' | 'professional' | null>(null);
    const [roleLoading, setRoleLoading] = useState(false);
    const [roleError,   setRoleError]   = useState('');

    // ── Estado do step "identity" ──
    const [cpf,         setCpf]         = useState('');
    const [birth,       setBirth]       = useState('');
    const [idStatus,    setIdStatus]    = useState<'idle' | 'checking' | 'verified' | 'needs_correction' | 'error'>('idle');
    const [idStatusMsg, setIdStatusMsg] = useState('');
    const idTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Estado do step "profile" ──
    const [displayName,  setDisplayName]  = useState('');
    const [username,     setUsername]     = useState('');
    const [suggestions,  setSuggestions]  = useState<string[]>([]);
    const [photoFile,    setPhotoFile]    = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [coverFile,    setCoverFile]    = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [cropperType,  setCropperType]  = useState<'photo' | 'cover'>('photo');
    const coverInputRef = useRef<HTMLInputElement>(null);
    const [profLoading,  setProfLoading]  = useState(false);
    const [profError,    setProfError]    = useState('');

    // Inicializa dados do perfil existente e determina o step de entrada.
    // Roda apenas uma vez (controlled via ref) para não interferir no fluxo.
    useEffect(() => {
        if (!userData || initialized.current) return;
        initialized.current = true;

        if (userData.name) {
            setDisplayName(userData.name);
            // refreshSuggestions verifica disponibilidade na API antes de sugerir
            // e pré-preenche o campo com a primeira opção disponível (prefill=true)
            refreshSuggestions(userData.name, true);
        }
        if (userData.photoUrl) setPhotoPreview(userData.photoUrl);

        const needsIdentity = userData.isProfessional !== undefined && (!userData.taxId || !userData.birthDate);

        // 1. Usuário que ainda precisa verificar identidade (via API do servidor)
        if (needsIdentity) {
            setStep('identity');
            localStorage.setItem(STEP_KEY, 'identity');
            return;
        }

        // 2. Restaura o step persistido caso o usuário tenha recarregado a página
        //    ou aberto uma nova aba enquanto estava no meio do onboarding.
        const saved = localStorage.getItem(STEP_KEY) as Step | null;
        if (saved === 'identity' || saved === 'profile') {
            setStep(saved);
            return;
        }

        // 3. Usuário totalmente configurado e sem step pendente → vai para o app direto
        //    (sem animação de dismiss, pois o usuário não passou pelo fluxo completo nesta sessão)
        if (userData.isProfessional !== undefined && !needsIdentity) {
            router.replace('/chats');
        }

        // 4. isProfessional === undefined → mostra welcome (novo cadastro, fluxo normal)
    }, [userData]);

    // ── Navegação entre steps com animação ──────────────────────────────────

    const go = (next: Step, d: Dir = 'forward') => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setDir(d);
        setOutStep(step);
        setStep(next);
        timerRef.current = setTimeout(() => setOutStep(null), 380);
        // Persiste o step para que recarregamentos retornem à posição correta.
        // 'welcome' e 'done' não precisam ser salvos.
        if (next === 'identity' || next === 'profile') {
            localStorage.setItem(STEP_KEY, next);
        }
    };

    // ── Interceptor de gesto de voltar (Android/iOS) ────────────────────────

    // Sincroniza os refs com o estado atual após cada render.
    // Padrão React para side-effects em event listeners sem stale closures.
    useEffect(() => {
        stepRef.current = step;
        goRef.current   = go;
    });

    // Empurra uma entrada "guarda" no histórico toda vez que o usuário entra
    // num step que tem navegação de retorno. O gesto de back vai consumir
    // essa entrada extra em vez de sair da rota /onboarding.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (step === 'identity' || step === 'profile' || step === 'done') {
            window.history.pushState(
                { onboardingGuard: true, step },
                '',
                window.location.pathname
            );
        }
    }, [step]);

    // Listener montado uma única vez: interpreta o consumo da guarda como
    // navegação interna entre steps em vez de saída da rota.
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handlePopState = () => {
            const current = stepRef.current;
            const prev    = PREV_ONBOARD[current];

            if (prev !== undefined) {
                // Volta para o step anterior dentro do onboarding
                goRef.current(prev, 'backward');
                // A guarda do novo step (prev) será empurrada pelo useEffect [step] acima,
                // se necessário — não é preciso fazer aqui.
            } else if (current === 'done') {
                // Bloqueia back na tela de conclusão: perfil já foi salvo, não faz sentido voltar.
                window.history.pushState(
                    { onboardingGuard: true, step: 'done' },
                    '',
                    window.location.pathname
                );
            }
            // 'welcome': não interfere — o próximo gesto sai do onboarding naturalmente.
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // ── Saída do onboarding ──────────────────────────────────────────────────

    // Anima o onboarding subindo para fora da tela (como se saísse da pilha)
    // e depois navega para /chats — evita que /chats entre pela direita como tela nova.
    const navigateToApp = () => {
        setIsDismissing(true);
        setTimeout(() => {
            localStorage.removeItem(STEP_KEY);
            router.replace('/chats');
        }, 300);
    };

    // ── Utilitários de username e foto ───────────────────────────────────────

    // Verifica disponibilidade de um username na API (404 = livre, 200 = ocupado)
    const checkUsername = useCallback(async (val: string) => {
        if (!val || val.length < 2 || !/^[a-z0-9._-]+$/.test(val)) {
            setUsernameStatus('idle');
            return;
        }
        setUsernameStatus('checking');
        try {
            const res = await fetch(`/api/users/username/${encodeURIComponent(val)}`);
            setUsernameStatus(res.status === 404 ? 'available' : 'taken');
        } catch {
            setUsernameStatus('idle');
        }
    }, []);

    // Gera sugestões a partir do nome, filtra as que já estão ocupadas no banco
    // e opcionalmente pré-preenche o campo de username com a primeira disponível.
    const refreshSuggestions = useCallback(async (name: string, prefill = false) => {
        const raw = generateSuggestions(name);
        if (!raw.length) { setSuggestions([]); return; }
        setSugsLoading(true);
        try {
            const results = await Promise.all(
                raw.map(async s => ({
                    username: s,
                    available: (await fetch(`/api/users/username/${encodeURIComponent(s)}`)).status === 404,
                }))
            );
            const available = results.filter(r => r.available).map(r => r.username);
            setSuggestions(available);
            if (prefill && available.length > 0) {
                setUsername(available[0]);
                setUsernameStatus('available'); // já sabemos que está disponível
            }
        } catch {
            // Em caso de erro de rede, mostra as sugestões sem filtro
            setSuggestions(raw);
            if (prefill && raw.length > 0) setUsername(raw[0]);
        } finally {
            setSugsLoading(false);
        }
    }, []);

    // Callback do ImageCropper — direciona resultado para foto ou capa conforme cropperType
    const handleCropDone = (croppedFile: File) => {
        if (cropperType === 'cover') {
            setCoverFile(croppedFile);
            setCoverPreview(URL.createObjectURL(croppedFile));
        } else {
            setPhotoFile(croppedFile);
            setPhotoPreview(URL.createObjectURL(croppedFile));
        }
        setCropperSrc(null);
    };

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleRoleConfirm = async () => {
        if (!role) return;
        setRoleLoading(true);
        setRoleError('');
        try {
            const isProfessional = role === 'professional';
            const res = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isProfessional }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao definir perfil');
            await refetch();
            go('identity');
        } catch (err: any) {
            setRoleError(err.message || 'Erro de conexão. Tente novamente.');
        } finally {
            setRoleLoading(false);
        }
    };

    // Verifica identidade inline (sem transição de tela) ao completar os campos.
    // Cacheia o resultado para não chamar a API duas vezes com os mesmos dados.
    const tryAutoVerify = useCallback(async (cleanCpf: string, birthVal: string) => {
        if (cleanCpf.length !== 11) return;
        const m = birthVal.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!m) return;
        const [, d, mo, y] = m;
        if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return;

        // Cache hit — mesmo CPF e data já verificados nesta sessão
        if (verifiedIdentity.current?.cpf === cleanCpf && verifiedIdentity.current?.birth === birthVal) {
            setIdStatus('verified');
            setIdStatusMsg('Identidade verificada com sucesso!');
            return;
        }

        setIdStatus('checking');
        setIdStatusMsg('');
        try {
            const res = await fetch('/api/users/me/identity-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf: cleanCpf, birthDate: `${y}-${mo}-${d}` }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.debugMessage) {
                    console.warn('[Identity verification] Detalhe técnico:', data.debugMessage);
                }
                const actionableErrorTypes = ['identity_mismatch', 'cpf_status', 'cpf_already_registered'];
                if (actionableErrorTypes.includes(data.errorType)) {
                    setIdStatus('needs_correction');
                    setIdStatusMsg(data.error || 'Confira o CPF e a data de nascimento e tente novamente.');
                    return;
                }
                throw new Error(data.error || 'Identificamos um problema ao validar seus dados. Tente novamente mais tarde.');
            }
            await refetch().catch(() => {});
            verifiedIdentity.current = { cpf: cleanCpf, birth: birthVal };
            setIdStatus('verified');
            setIdStatusMsg('Identidade verificada com sucesso!');
        } catch (err: any) {
            setIdStatus('error');
            setIdStatusMsg(err.message || 'Não foi possível verificar. Tente novamente.');
        }
    }, [refetch]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!photoPreview) { setProfError('Adicione uma foto de perfil para continuar.'); return; }
        if (!username.trim()) { setProfError('Informe um nome de usuário.'); return; }
        if (!/^[a-z0-9._-]+$/.test(username)) {
            setProfError('Use apenas letras minúsculas, números, pontos, traços ou sublinhados.');
            return;
        }
        if (usernameStatus === 'checking') { setProfError('Aguarde a verificação do nome de usuário.'); return; }
        if (usernameStatus === 'taken')    { setProfError('Este nome de usuário já está em uso. Escolha outro.'); return; }

        setProfLoading(true);
        setProfError('');
        try {
            let finalPhotoUrl = userData?.photoUrl || '';
            if (photoFile) {
                const fd = new FormData();
                fd.append('photo', photoFile);
                const r = await fetch('/api/users/me/photo', { method: 'POST', body: fd });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || 'Erro no upload da foto');
                finalPhotoUrl = d.photoUrl;
            }

            let finalCoverUrl = userData?.coverUrl || '';
            if (coverFile) {
                const fd = new FormData();
                fd.append('cover', coverFile);
                const r = await fetch('/api/users/me/cover', { method: 'POST', body: fd });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error || 'Erro no upload da foto de capa');
                finalCoverUrl = d.coverUrl;
            }

            const r2 = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: displayName, username, photoUrl: finalPhotoUrl, coverUrl: finalCoverUrl }),
            });
            const d2 = await r2.json();
            if (!r2.ok) throw new Error(d2.error || 'Erro ao atualizar o perfil');

            await refetch();
            // Cadastro concluído — remove o step salvo para liberar o acesso normal ao app
            localStorage.removeItem(STEP_KEY);
            go('done');
        } catch (err: any) {
            setProfError(err.message || 'Erro ao salvar. Tente novamente.');
        } finally {
            setProfLoading(false);
        }
    };

    // ── Partes reutilizáveis de UI ────────────────────────────────────────────

    // Header padrão do app — idêntico ao de Conversas, Buscar e Carteira
    const STEP_BADGE: Record<Step, string> = {
        welcome:  'Cadastro',
        identity: 'Identidade',
        profile:  'Perfil',
        done:     'Concluído',
    };

    const renderHeader = (forStep: Step, onBack?: () => void) => {
        const idx = PRO_STEPS.indexOf(forStep);
        return (
            <div className="shared-header bg-gradient-to-r from-purple-600 to-purple-700 px-5 h-[72px] shrink-0 flex items-center justify-between z-10 sticky top-0 shadow-md">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/15 active:bg-white/25 transition-colors -ml-1"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="w-8 h-8 object-contain shrink-0"
                    />
                    <h1 className="text-2xl font-black text-white tracking-tighter">Mimo</h1>
                    <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">
                        {STEP_BADGE[forStep]}
                    </span>
                </div>

                {/* Indicador de progresso nos steps do profissional */}
                {idx >= 0 && (
                    <div className="flex items-center gap-1.5">
                        {PRO_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-[5px] rounded-full bg-white transition-all duration-300 ${
                                    i <= idx ? 'w-[18px] opacity-100' : 'w-[5px] opacity-30'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Botão CTA primário — roxo sólido, idêntico ao Button.tsx primary
    const PrimaryButton = ({
        children,
        onClick,
        disabled,
        type = 'button',
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        type?: 'button' | 'submit';
    }) => (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`w-full py-4 rounded-2xl text-sm font-extrabold text-white transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer ${
                disabled
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-200'
            }`}
        >
            {children}
        </button>
    );

    // ── Steps ────────────────────────────────────────────────────────────────

    // ── Welcome ──────────────────────────────────────────────────────────────
    const renderWelcome = () => (
        <div className="flex flex-col h-full bg-white">
            {renderHeader('welcome')}

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-8 pb-2">
                {/* Título e subtítulo */}
                <h1 className="text-[26px] font-black text-gray-900 leading-tight tracking-tight">
                    Bem-vindo ao<br />MimoChat 👋
                </h1>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    Escolha como você quer usar o aplicativo para continuar.
                </p>

                {roleError && (
                    <div className="mt-4 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2.5 rounded-xl">
                        {roleError}
                    </div>
                )}

                {/* Cards de seleção de papel */}
                <div className="flex flex-col gap-3 mt-6">
                    {/* Cliente */}
                    <button
                        type="button"
                        onClick={() => setRole('client')}
                        disabled={roleLoading}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer select-none active:scale-[0.985] ${
                            role === 'client'
                                ? 'bg-purple-50 border-purple-500'
                                : 'bg-white border-gray-100 shadow-sm hover:border-purple-200'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                            role === 'client' ? 'bg-purple-600' : 'bg-purple-50'
                        }`}>
                            <User className={`w-6 h-6 ${role === 'client' ? 'text-white' : 'text-purple-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold leading-tight ${role === 'client' ? 'text-purple-900' : 'text-gray-900'}`}>
                                Quero conversar
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                                Encontre pessoas, envie mensagens e apoie com mimos
                            </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                            role === 'client' ? 'bg-purple-600 border-purple-600' : 'border-gray-200 bg-white'
                        }`}>
                            {role === 'client' && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                    </button>

                    {/* Profissional */}
                    <button
                        type="button"
                        onClick={() => setRole('professional')}
                        disabled={roleLoading}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer select-none active:scale-[0.985] ${
                            role === 'professional'
                                ? 'bg-purple-50 border-purple-500'
                                : 'bg-white border-gray-100 shadow-sm hover:border-purple-200'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                            role === 'professional' ? 'bg-purple-600' : 'bg-purple-50'
                        }`}>
                            <Crown className={`w-6 h-6 ${role === 'professional' ? 'text-white' : 'text-purple-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold leading-tight ${role === 'professional' ? 'text-purple-900' : 'text-gray-900'}`}>
                                Quero receber por conversa
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                                Defina seus valores, receba mensagens e monetize no MimoChat
                            </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                            role === 'professional' ? 'bg-purple-600 border-purple-600' : 'border-gray-200 bg-white'
                        }`}>
                            {role === 'professional' && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </div>
                    </button>
                </div>
            </div>

            {/* CTA fixo no rodapé */}
            <div className="px-5 pt-3 pb-8 shrink-0">
                <PrimaryButton
                    onClick={handleRoleConfirm}
                    disabled={!role || roleLoading}
                >
                    {roleLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                        : 'Confirmar e Entrar'}
                </PrimaryButton>
                <p className="text-[10px] text-gray-400 text-center mt-2.5">
                    Ao confirmar, você concorda com nossos Termos de Uso
                </p>
            </div>
        </div>
    );

    // ── Identity ──────────────────────────────────────────────────────────────
    const renderIdentity = () => {
        const isChecking  = idStatus === 'checking';
        const isVerified  = idStatus === 'verified';
        const needsCorrection = idStatus === 'needs_correction';

        return (
            <div className="flex flex-col h-full bg-slate-50">
                {renderHeader('identity', () => go('welcome', 'backward'))}

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="px-5 py-6 flex flex-col gap-5 max-w-md mx-auto w-full">
                        {/* Ícone + título */}
                        <div>
                            <div className="w-11 h-11 bg-purple-600 rounded-[14px] flex items-center justify-center shadow-sm mb-3">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
                                Validação de Identidade
                            </h2>
                            <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
                                {role === 'professional' || userData?.isProfessional === true
                                    ? "Precisamos confirmar que você é maior de idade para liberar o perfil profissional."
                                    : "Precisamos confirmar que você é maior de idade para liberar o seu acesso."
                                }
                            </p>
                        </div>

                        {/* Banner informativo */}
                        <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3">
                            <p className="text-[11px] font-semibold text-purple-900 leading-relaxed">
                                {role === 'professional' || userData?.isProfessional === true
                                    ? "Seus dados ficam protegidos. Os repasses só vão para uma chave Pix vinculada a este CPF."
                                    : "Seus dados ficam protegidos em conformidade com as diretrizes de segurança do MimoChat."
                                }
                            </p>
                        </div>

                        {/* CPF */}
                        <div className="space-y-1.5">
                            <label htmlFor="cpf-input" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                CPF
                            </label>
                            <div className="relative">
                                <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="cpf-input"
                                    type="text"
                                    placeholder="000.000.000-00"
                                    value={cpf}
                                    onChange={e => {
                                        const masked = maskCpf(e.target.value);
                                        setCpf(masked);
                                        const clean = masked.replace(/\D/g, '');
                                        setIdStatus('idle');
                                        if (idTimerRef.current) clearTimeout(idTimerRef.current);
                                        if (clean.length === 11 && /^\d{2}\/\d{2}\/\d{4}$/.test(birth)) {
                                            idTimerRef.current = setTimeout(() => tryAutoVerify(clean, birth), 700);
                                        }
                                    }}
                                    maxLength={14}
                                    inputMode="numeric"
                                    disabled={isChecking}
                                    className={`w-full pl-10 pr-4 py-3.5 border text-gray-900 rounded-2xl text-sm font-semibold transition-all outline-none disabled:opacity-50 shadow-sm ${
                                        needsCorrection
                                            ? 'bg-amber-50/40 border-amber-300 focus:border-amber-500'
                                            : 'bg-white border-gray-200 focus:border-purple-500 focus:bg-white'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Data de nascimento */}
                        <div className="space-y-1.5">
                            <label htmlFor="birth-input" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Data de Nascimento
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="birth-input"
                                    type="text"
                                    placeholder="DD/MM/AAAA"
                                    value={birth}
                                    onChange={e => {
                                        const masked = maskDate(e.target.value);
                                        setBirth(masked);
                                        const clean = cpf.replace(/\D/g, '');
                                        setIdStatus('idle');
                                        if (idTimerRef.current) clearTimeout(idTimerRef.current);
                                        if (clean.length === 11 && /^\d{2}\/\d{2}\/\d{4}$/.test(masked)) {
                                            idTimerRef.current = setTimeout(() => tryAutoVerify(clean, masked), 700);
                                        }
                                    }}
                                    maxLength={10}
                                    inputMode="numeric"
                                    disabled={isChecking}
                                    className={`w-full pl-10 pr-4 py-3.5 border text-gray-900 rounded-2xl text-sm font-semibold transition-all outline-none disabled:opacity-50 shadow-sm ${
                                        needsCorrection
                                            ? 'bg-amber-50/40 border-amber-300 focus:border-amber-500'
                                            : 'bg-white border-gray-200 focus:border-purple-500 focus:bg-white'
                                    }`}
                                />
                            </div>
                        </div>

                        {/* Status inline da verificação — aparece abaixo dos campos */}
                        {isChecking && (
                            <div className="flex items-center gap-2.5 px-1">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-500 shrink-0" />
                                <p className="text-[12px] text-gray-500">Verificando identidade...</p>
                            </div>
                        )}
                        {isVerified && (
                            <div className="flex items-center gap-2.5 px-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <p className="text-[12px] font-semibold text-emerald-600">{idStatusMsg}</p>
                            </div>
                        )}
                        {idStatus === 'needs_correction' && (
                            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] font-semibold leading-relaxed text-amber-800">{idStatusMsg}</p>
                            </div>
                        )}
                        {idStatus === 'error' && (
                            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                                <X className="w-4 h-4 text-red-500 shrink-0" />
                                <p className="text-[11px] font-semibold text-red-600">{idStatusMsg}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* CTA habilitado só após verificação bem-sucedida */}
                <div className="px-5 pt-2 pb-8 shrink-0 bg-slate-50">
                    <div className="max-w-md mx-auto">
                        <PrimaryButton
                            type="button"
                            onClick={() => go('profile')}
                            disabled={!isVerified}
                        >
                            Continuar
                        </PrimaryButton>
                    </div>
                </div>
            </div>
        );
    };

    // ── Profile ───────────────────────────────────────────────────────────────
    const renderProfile = () => (
        <>
            {cropperSrc && (
                <ImageCropper
                    imageSrc={cropperSrc}
                    circular={true}
                    aspectRatio={1}
                    onCrop={handleCropDone}
                    onCancel={() => {
                        setCropperSrc(null);
                        if (photoInputRef.current) photoInputRef.current.value = '';
                    }}
                />
            )}

            <form onSubmit={handleProfileSubmit} className="flex flex-col h-full bg-slate-50">
                {renderHeader('profile', () => go('identity', 'backward'))}

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div className="px-5 py-6 flex flex-col gap-5 max-w-md mx-auto w-full">

                        {profError && (
                            <div className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                                {profError}
                            </div>
                        )}

                        {/* Foto de perfil — centralizada, sem capa */}
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Foto de Perfil
                            </span>
                            <input
                                ref={photoInputRef}
                                type="file"
                                id="photo-upload"
                                accept="image/*"
                                disabled={profLoading}
                                onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    if (!f.type.startsWith('image/')) { setProfError('Selecione uma imagem válida.'); return; }
                                    setCropperType('photo');
                                    setCropperSrc(URL.createObjectURL(f));
                                    setProfError('');
                                }}
                                className="hidden"
                            />
                            <label htmlFor="photo-upload" className="cursor-pointer">
                                {/* shadow-sm igual aos inputs, border-purple-100 indica interatividade */}
                                <div className="relative group p-1 bg-white rounded-full shadow-sm border-2 border-purple-100 transition-transform active:scale-95">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-50 flex items-center justify-center">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="w-8 h-8 text-purple-200" />
                                        )}
                                    </div>
                                    <div className="absolute inset-1 rounded-full bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Nome de exibição */}
                        <div className="space-y-1.5">
                            <label htmlFor="display-name" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Nome de Exibição
                            </label>
                            <input
                                id="display-name"
                                type="text"
                                placeholder="Como quer ser chamado(a)?"
                                value={displayName}
                                onChange={e => {
                                    setDisplayName(e.target.value);
                                    refreshSuggestions(e.target.value, false);
                                }}
                                required
                                disabled={profLoading}
                                className="w-full px-4 py-3.5 bg-white border border-gray-200 focus:border-purple-500 focus:bg-white text-gray-900 rounded-2xl text-sm font-semibold transition-all outline-none disabled:opacity-50 shadow-sm"
                            />
                        </div>

                        {/* Username com indicador de disponibilidade */}
                        <div className="space-y-1.5">
                            <label htmlFor="username-input" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Nome de Usuário
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold select-none pointer-events-none">@</span>
                                <input
                                    id="username-input"
                                    type="text"
                                    placeholder="seu.usuario"
                                    value={username}
                                    onChange={e => {
                                        const clean = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
                                        setUsername(clean);
                                        setUsernameStatus('idle');
                                        if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
                                        usernameTimerRef.current = setTimeout(() => checkUsername(clean), 450);
                                    }}
                                    required
                                    disabled={profLoading}
                                    className={`w-full pl-8 pr-10 py-3.5 bg-white border text-gray-900 rounded-2xl text-sm font-semibold transition-all outline-none disabled:opacity-50 shadow-sm ${
                                        usernameStatus === 'taken'
                                            ? 'border-red-400 focus:border-red-400'
                                            : 'border-gray-200 focus:border-purple-500'
                                    }`}
                                />
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {usernameStatus === 'checking'  && <Loader2      className="w-4 h-4 animate-spin text-gray-400" />}
                                    {usernameStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    {usernameStatus === 'taken'     && <X            className="w-4 h-4 text-red-500" />}
                                </div>
                            </div>

                            {usernameStatus === 'taken' && (
                                <p className="text-[11px] font-semibold text-red-500 pl-1">
                                    Este nome de usuário já está em uso
                                </p>
                            )}

                            {/* Sugestões filtradas por disponibilidade */}
                            {!profLoading && (sugsLoading || suggestions.length > 0) && (
                                <div className="pt-0.5">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                        {sugsLoading ? 'Verificando sugestões...' : 'Sugestões:'}
                                    </span>
                                    {sugsLoading ? (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                                            <span className="text-[10px] text-gray-400">buscando opções livres...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {suggestions.map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => {
                                                        setUsername(s);
                                                        setUsernameStatus('available');
                                                        if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
                                                    }}
                                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold rounded-full border border-purple-100 transition-colors cursor-pointer"
                                                >
                                                    @{s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="px-5 pt-2 pb-8 shrink-0 bg-slate-50">
                    <div className="max-w-md mx-auto">
                        <PrimaryButton
                            type="submit"
                            disabled={profLoading || usernameStatus === 'taken' || usernameStatus === 'checking'}
                        >
                            {profLoading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando perfil...</>
                                : 'Concluir Cadastro'}
                        </PrimaryButton>
                    </div>
                </div>
            </form>
        </>
    );

    // ── Done ──────────────────────────────────────────────────────────────────
    const renderDone = () => (
        <div className="flex flex-col h-full bg-white">
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
                {/* Ícone de sucesso — verde, consistente com cores semânticas do app */}
                <div className="w-20 h-20 bg-emerald-500 rounded-[26px] flex items-center justify-center shadow-lg shadow-emerald-100">
                    <UserCheck className="w-9 h-9 text-white" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tudo certo!</h2>
                    <p className="text-sm text-gray-500 max-w-[250px] mx-auto leading-relaxed">
                        {userData?.isProfessional
                            ? "Seu CPF foi validado e seu perfil profissional está pronto para começar."
                            : "Seu CPF foi validado e sua conta está pronta para você começar a conversar."
                        }
                    </p>
                </div>

                {/* Dots com as cores primárias do app (sem fuchsia) */}
                <div className="flex gap-2 items-center mt-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '110ms' }} />
                    <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '220ms' }} />
                </div>
            </div>

            {/* CTA */}
            <div className="px-5 pt-2 pb-8 shrink-0">
                <PrimaryButton onClick={navigateToApp}>
                    Começar a usar o MimoChat
                </PrimaryButton>
            </div>
        </div>
    );

    // ── Render step por nome (usado pelo motor de animação) ───────────────────
    const renderStep = (s: Step) => {
        switch (s) {
            case 'welcome':  return renderWelcome();
            case 'identity': return renderIdentity();
            case 'profile':  return renderProfile();
            case 'done':     return renderDone();
        }
    };

    // ── Render raiz ───────────────────────────────────────────────────────────
    return (
        <div className={`fixed inset-0 z-[9999] bg-white overflow-hidden ${isDismissing ? 'animate-onboard-dismiss' : ''}`}>
            {/* Layer de saída: anima para fora */}
            {outStep !== null && (
                <div
                    className={`absolute inset-0 pointer-events-none ${
                        dir === 'forward' ? 'animate-onboard-exit-forward' : 'animate-onboard-exit-backward'
                    }`}
                >
                    {renderStep(outStep)}
                </div>
            )}

            {/* Layer de entrada: anima para dentro */}
            <div
                className={`absolute inset-0 ${
                    outStep !== null
                        ? (dir === 'forward' ? 'animate-onboard-enter-forward' : 'animate-onboard-enter-backward')
                        : ''
                }`}
            >
                {renderStep(step)}
            </div>
        </div>
    );
}
