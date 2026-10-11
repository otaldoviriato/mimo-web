'use client';
import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, UserRound, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { ImageCropper } from '@/components/ImageCropper';
import { validateApplicantBirthDate } from '@/lib/applicant';
import { POST_AUTH_REDIRECT_STORAGE_KEY } from '@/lib/postAuthRedirect';

type Draft = { name: string; username: string; birthDate: string; photoUrl: string; manual: boolean };
const maskDate = (value: string) => value.replace(/\D/g, '').slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : maskDate(value);
const isoDate = (value: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split('/').reverse().join('-') : '';
const empty: Draft = { name: '', username: '', birthDate: '', photoUrl: '', manual: false };
export default function ApplicantRegistration() {
    const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth();
    const [draft, setDraft] = useState<Draft>(empty);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [availability, setAvailability] = useState('');
    const [crop, setCrop] = useState<string | null>(null);
    const initialized = useRef(false);
    const photoInput = useRef<HTMLInputElement>(null);
    const [notice, setNotice] = useState('');
    const storageKey = `mimo_applicant_draft:${userId}`;
    const enterApp = useCallback(() => {
        localStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
        localStorage.removeItem(storageKey);
        window.location.replace('/chats');
    }, [storageKey]);
    useEffect(() => {
        if (!isLoaded) return;
        if (!isSignedIn) { window.location.replace('/participar'); return; }
        if (initialized.current) return;
        initialized.current = true;
        void (async () => {
            const token = await getToken();
            if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
            const response = await fetch('/api/participar', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível carregar seu cadastro.');
            if (data.redirectTo || data.profile.completed) { enterApp(); return; }
            let saved: Partial<Draft> = {};
            try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { /* Ignore invalid local draft. */ }
            const profile = { ...empty, ...data.profile, ...saved };
            setDraft({ ...profile, username: saved.manual === false || profile.username.startsWith('candidata_') ? '' : profile.username, manual: true, birthDate: displayDate(profile.birthDate), photoUrl: data.profile.photoUrl });
            setReady(true);
        })().catch(err => setError(err.message));
    }, [isLoaded, isSignedIn, getToken, storageKey, enterApp]);
    useEffect(() => {
        if (ready) localStorage.setItem(storageKey, JSON.stringify(draft));
    }, [draft, ready, storageKey]);
    useEffect(() => {
        if (!ready || draft.username.length < 2) return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetch(`/api/users/check-username?username=${encodeURIComponent(draft.username)}`, { signal: controller.signal })
                .then(async response => { const data = await response.json(); setAvailability(response.ok && data.available ? 'Username disponível' : 'Escolha outro username'); })
                .catch(() => {});
        }, 400);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [draft.username, ready]);
    async function upload(file: File) {
        setCrop(null); setBusy(true); setError(''); setNotice('');
        try {
            const form = new FormData(); form.append('photo', file);
            const response = await fetch('/api/users/me/photo', { method: 'POST', body: form });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a foto.');
            setDraft(current => ({ ...current, photoUrl: data.photoUrl }));
        } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
    }
    async function save(complete: boolean) {
        const birthError = validateApplicantBirthDate(isoDate(draft.birthDate));
        if (birthError) { setError(birthError); return; }
        if (complete && !draft.photoUrl) { setError('Envie sua foto de perfil.'); return; }
        setBusy(true); setError(''); setNotice('');
        try {
            const response = await fetch('/api/participar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, username: draft.username, birthDate: isoDate(draft.birthDate), complete }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');
            if (data.profile.completed) enterApp();
            else setNotice('Cadastro salvo. Você pode continuar mais tarde.');
        } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
    }
    const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60";
    return <main className="relative min-h-screen bg-radial from-[#eee0ff] via-[#faf8fd] to-white px-4 py-10 sm:py-14 selection:bg-purple-600 selection:text-white">
        <div className="relative z-10 mx-auto w-full max-w-md">
            {/* Header com identidade oficial MimoChat */}
            <header className="mb-8 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg shadow-purple-600/20 mb-4">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="h-10 w-10 object-contain"
                    />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Crie seu perfil</h1>
                <p className="mt-1.5 text-sm text-slate-500">Defina como você deseja aparecer no MimoChat.</p>
            </header>

            {ready ? (
                <div className="rounded-2xl border border-purple-100/80 bg-white/95 p-6 shadow-xl shadow-purple-950/5 backdrop-blur-md sm:p-7">
                    <form className="space-y-6" onSubmit={event => { event.preventDefault(); void save(true); }}>
                        {/* Seção Foto de Perfil */}
                        <section className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => photoInput.current?.click()}
                                aria-label={draft.photoUrl ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
                                className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-purple-50 text-purple-400 ring-2 ring-purple-200/80 transition focus-visible:outline-2 focus-visible:outline-purple-500 hover:ring-purple-400"
                            >
                                {draft.photoUrl ? (
                                    <img src={draft.photoUrl} alt="Sua foto de perfil" className="h-full w-full object-cover" />
                                ) : (
                                    <UserRound aria-hidden="true" className="mx-auto h-10 w-10 text-purple-300 transition group-hover:text-purple-400" strokeWidth={1.5} />
                                )}
                                <span className="absolute bottom-0 inset-x-0 bg-black/40 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100 flex items-center justify-center gap-1">
                                    <Camera size={11} /> Alterar
                                </span>
                                <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-purple-600 text-white shadow-sm">
                                    <Camera size={12} />
                                </span>
                            </button>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm font-semibold text-slate-900">Foto de perfil</h2>
                                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">Uma foto nítida e bem iluminada do seu rosto.</p>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => photoInput.current?.click()}
                                    className="mt-2 text-xs font-semibold text-purple-600 transition hover:text-purple-700"
                                >
                                    {busy ? 'Enviando...' : draft.photoUrl ? 'Trocar foto' : 'Enviar foto'}
                                </button>
                            </div>
                            <input
                                ref={photoInput}
                                aria-label="Arquivo da foto de perfil"
                                type="file"
                                accept="image/*"
                                disabled={busy}
                                className="hidden"
                                onChange={event => {
                                    const file = event.target.files?.[0];
                                    event.target.value = '';
                                    if (!file) return;
                                    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
                                        setError('Escolha uma imagem de até 10 MB.');
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = () => setCrop(String(reader.result));
                                    reader.readAsDataURL(file);
                                }}
                            />
                        </section>

                        {/* Campos do formulário */}
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="applicant-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Nome público
                                </label>
                                <input
                                    id="applicant-name"
                                    className={fieldClass}
                                    placeholder="Ex: Júlia Santos"
                                    autoComplete="nickname"
                                    value={draft.name}
                                    maxLength={80}
                                    required
                                    disabled={busy}
                                    onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
                                />
                            </div>

                            <div>
                                <label htmlFor="applicant-username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Nome de usuário
                                </label>
                                <div className="relative">
                                    <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-sm font-medium text-slate-400">
                                        @
                                    </span>
                                    <input
                                        id="applicant-username"
                                        aria-describedby="username-help"
                                        className={`${fieldClass} pl-8`}
                                        placeholder="seu_usuario"
                                        autoCapitalize="none"
                                        autoComplete="off"
                                        spellCheck={false}
                                        value={draft.username}
                                        minLength={2}
                                        maxLength={30}
                                        pattern="[a-z0-9._\-]+"
                                        required
                                        disabled={busy}
                                        onChange={event => {
                                            setDraft(current => ({ ...current, username: event.target.value.toLowerCase(), manual: true }));
                                            setAvailability('');
                                        }}
                                    />
                                </div>
                                <p
                                    id="username-help"
                                    aria-live="polite"
                                    className={`mt-1.5 text-xs ${availability === 'Username disponível' ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}
                                >
                                    {availability || 'Use letras, números, ponto ou underline.'}
                                </p>
                            </div>

                            <div>
                                <label htmlFor="applicant-birth" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Data de nascimento
                                </label>
                                <input
                                    id="applicant-birth"
                                    aria-describedby="birth-help"
                                    className={fieldClass}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="DD/MM/AAAA"
                                    maxLength={10}
                                    autoComplete="bday"
                                    value={draft.birthDate}
                                    required
                                    disabled={busy}
                                    onChange={event => setDraft(current => ({ ...current, birthDate: maskDate(event.target.value) }))}
                                />
                                <p id="birth-help" className="mt-1.5 text-xs text-slate-400">
                                    Você precisa ter 18 anos ou mais. Esta informação não é pública.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                                {error}
                            </div>
                        )}
                        {notice && (
                            <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                                <Check size={15} />
                                {notice}
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <button
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-purple-600/25 transition hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 cursor-pointer"
                                type="submit"
                                disabled={busy}
                            >
                                {busy ? 'Salvando...' : 'Concluir cadastro'}
                                {!busy && <ArrowRight size={16} />}
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                className="w-full py-1 text-xs font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-60 cursor-pointer"
                                onClick={() => void save(false)}
                            >
                                Salvar e continuar depois
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
                            <ShieldCheck size={14} className="text-purple-500" />
                            <span>Seu perfil é verificado de forma segura antes da ativação.</span>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="rounded-2xl border border-purple-100/80 bg-white/95 p-12 text-center shadow-xl shadow-purple-950/5 backdrop-blur-md">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    <p role={error ? 'alert' : 'status'} className="mt-3 text-xs font-medium text-slate-400">
                        {error || 'Carregando suas informações...'}
                    </p>
                </div>
            )}

            <footer className="mt-6 text-center">
                <button
                    type="button"
                    className="text-xs text-slate-400 transition hover:text-slate-600 cursor-pointer"
                    onClick={() => void signOut({ redirectUrl: '/participar' })}
                >
                    Sair da conta
                </button>
            </footer>
        </div>
        {crop && <ImageCropper imageSrc={crop} aspectRatio={1} circular onCrop={upload} onCancel={() => setCrop(null)} />}
    </main>;
}
