'use client';
import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, UserRound, ArrowRight, LoaderCircle } from 'lucide-react';
import { ImageCropper } from '@/components/ImageCropper';
import { validateApplicantBirthDate } from '@/lib/applicant';
import { POST_AUTH_REDIRECT_STORAGE_KEY } from '@/lib/postAuthRedirect';

type Draft = { name: string; username: string; birthDate: string; photoUrl: string };
const maskDate = (value: string) => value.replace(/\D/g, '').slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
const displayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : maskDate(value);
const isoDate = (value: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? value.split('/').reverse().join('-') : '';
const empty: Draft = { name: '', username: '', birthDate: '', photoUrl: '' };
export default function ApplicantRegistration() {
    const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
    const [draft, setDraft] = useState<Draft>(empty);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [availability, setAvailability] = useState('');
    const [crop, setCrop] = useState<string | null>(null);
    const initialized = useRef(false);
    const photoInput = useRef<HTMLInputElement>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState('');
    const enterApp = useCallback(() => {
        localStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
        window.location.replace('/chats');
    }, []);
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
            const profile = { ...empty, ...data.profile };
            setDraft({ ...profile, username: profile.username.startsWith('candidata_') ? '' : profile.username, birthDate: displayDate(profile.birthDate) });
            setReady(true);
        })().catch(err => setError(err.message));
    }, [isLoaded, isSignedIn, getToken, enterApp]);
    useEffect(() => {
        if (!ready || draft.name.trim().length < 2) return;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setSuggestionsLoading(true);
            try {
                const response = await fetch('/api/users/username-suggestions?name=' + encodeURIComponent(draft.name.trim()), { signal: controller.signal, cache: 'no-store' });
                if (!response.ok) throw new Error();
                const data = await response.json();
                if (!controller.signal.aborted) {
                    setSuggestions(data.suggestions);
                    setSuggestionsError(data.suggestions.length ? '' : 'Digite um nome de usuário para verificar a disponibilidade.');
                }
            } catch {
                if (!controller.signal.aborted) setSuggestionsError('Não foi possível buscar sugestões. Você pode digitar seu usuário.');
            } finally {
                if (!controller.signal.aborted) setSuggestionsLoading(false);
            }
        }, 400);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [draft.name, ready]);
    useEffect(() => {
        if (!ready || draft.username.length < 2) return;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await fetch('/api/users/check-username?username=' + encodeURIComponent(draft.username), { signal: controller.signal, cache: 'no-store' });
                const data = await response.json();
                if (controller.signal.aborted) return;
                setAvailability(response.ok ? (data.available ? 'Nome de usuário disponível' : 'Este nome já está em uso. Escolha outro.') : response.status === 400 ? 'Use de 2 a 30 letras, números, pontos, hífens ou underline.' : 'Não foi possível verificar agora. Tente novamente.');
            } catch {
                if (!controller.signal.aborted) setAvailability('Não foi possível verificar agora. Tente novamente.');
            }
        }, 400);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [draft.username, ready]);
    async function upload(file: File) {
        setCrop(null); setBusy(true); setError('');
        try {
            const form = new FormData(); form.append('photo', file);
            const response = await fetch('/api/users/me/photo', { method: 'POST', body: form });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a foto.');
            setDraft(current => ({ ...current, photoUrl: data.photoUrl }));
        } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
    }
    async function save() {
        const birthError = validateApplicantBirthDate(isoDate(draft.birthDate));
        if (birthError) { setError(birthError); return; }
        if (!draft.photoUrl) { setError('Envie sua foto de perfil.'); return; }
        setBusy(true); setError('');
        try {
            const response = await fetch('/api/participar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, username: draft.username, birthDate: isoDate(draft.birthDate), complete: true }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');
            if (data.profile.completed) enterApp();
            else throw new Error('Não foi possível concluir seu cadastro. Tente novamente.');
        } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
    }
    const fieldClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60";
    return <main className="relative min-h-dvh bg-white px-5 py-7 sm:bg-radial sm:from-[#eee0ff] sm:via-[#faf8fd] sm:to-white sm:px-6 sm:py-12 selection:bg-purple-600 selection:text-white">
        <div className="relative z-10 mx-auto w-full max-w-md sm:rounded-3xl sm:border sm:border-purple-100/80 sm:bg-white/95 sm:p-8 sm:shadow-xl sm:shadow-purple-950/5">
            {/* Header com identidade oficial MimoChat */}
            <header className="mb-7 text-left">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 shadow-md shadow-purple-600/20 mb-4">
                    <img
                        src="/Logo.svg"
                        alt="MimoChat"
                        className="h-7 w-7 object-contain"
                    />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Vamos montar seu perfil</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">Escolha como você quer aparecer no Mimo.</p>
            </header>

            {ready ? (
                <div>
                    <form className="space-y-6" onSubmit={event => { event.preventDefault(); void save(); }}>
                        {/* Seção Foto de Perfil */}
                        <section className="flex items-center gap-4 border-b border-slate-100 pb-6">
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
                                    <UserRound aria-hidden="true" className="mx-auto h-7 w-7 text-purple-300 transition group-hover:text-purple-400" strokeWidth={1.5} />
                                )}
                                <span className="absolute bottom-0 inset-x-0 bg-black/40 py-0.5 text-[9px] font-medium text-white opacity-0 transition group-hover:opacity-100 flex items-center justify-center gap-0.5">
                                    <Camera size={10} /> Alterar
                                </span>
                                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-purple-600 text-white shadow-sm">
                                    <Camera size={10} />
                                </span>
                            </button>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-sm font-semibold text-slate-900">Foto de perfil</h2>
                                <p className="mt-1 text-sm text-slate-600 leading-relaxed">Uma foto nítida e bem iluminada do seu rosto.</p>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => photoInput.current?.click()}
                                    className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-purple-600 transition hover:text-purple-700"
                                >
                                    {draft.photoUrl ? 'Trocar foto' : 'Adicionar foto'}
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
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="applicant-name" className="mb-2 block text-sm font-medium text-slate-800">
                                    Nome no perfil
                                </label>
                                <input
                                    id="applicant-name"
                                    className={fieldClass}
                                    placeholder="Como você quer ser chamada?"
                                    autoComplete="nickname"
                                    value={draft.name}
                                    maxLength={80}
                                    required
                                    disabled={busy}
                                    onChange={event => {
                                        setDraft(current => ({ ...current, name: event.target.value }));
                                        setSuggestions([]); setSuggestionsError(''); setSuggestionsLoading(false);
                                    }}
                                />
                            </div>

                            <div>
                                <label htmlFor="applicant-username" className="mb-2 block text-sm font-medium text-slate-800">
                                    Nome de usuário
                                </label>
                                <div className="relative">
                                    <span aria-hidden="true" className="pointer-events-none absolute left-4 top-3.5 text-base font-medium text-slate-400">
                                        @
                                    </span>
                                    <input
                                        id="applicant-username"
                                        aria-describedby="username-help"
                                        className={`${fieldClass} pl-10`}
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
                                            setDraft(current => ({ ...current, username: event.target.value.toLowerCase() }));
                                            setAvailability('');
                                        }}
                                    />
                                </div>
                                <p
                                    id="username-help"
                                    aria-live="polite"
                                    className={`mt-2 text-xs leading-relaxed ${availability === 'Nome de usuário disponível' ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}
                                >
                                    {availability || 'Use letras, números, ponto, hífen ou underline.'}
                                </p>
                                <div aria-live="polite" aria-busy={suggestionsLoading}>
                                    {suggestionsLoading && <p className="mt-2 text-xs text-slate-500">Buscando nomes disponíveis...</p>}
                                    {suggestionsError && <p className="mt-2 text-xs text-slate-600">{suggestionsError}</p>}
                                    {suggestions.length > 0 && <div className="mt-3">
                                        <p className="mb-2 text-xs text-slate-600">Sugestões para você · toque para escolher</p>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestions.map(username => <button key={username} type="button" disabled={busy}
                                                aria-pressed={draft.username === username}
                                                onClick={() => { setDraft(current => ({ ...current, username })); setAvailability(''); }}
                                                className="min-h-11 max-w-full break-all rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-left text-sm font-medium text-purple-700 transition hover:bg-purple-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 aria-pressed:border-purple-600 aria-pressed:bg-purple-100 disabled:opacity-60">
                                                @{username}
                                            </button>)}
                                        </div>
                                    </div>}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="applicant-birth" className="mb-2 block text-sm font-medium text-slate-800">
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
                                <p id="birth-help" className="mt-2 text-xs leading-relaxed text-slate-600">
                                    Você precisa ter 18 anos ou mais. Essa data não aparece no perfil.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5 pt-1">
                            <button
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm shadow-purple-600/15 transition hover:bg-purple-700 active:bg-purple-800 disabled:opacity-60 cursor-pointer"
                                type="submit"
                                disabled={busy}
                            >
                                {busy && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}
                                {busy ? 'Aguarde...' : 'Concluir cadastro'}
                                {!busy && <ArrowRight size={15} />}
                            </button>
                        </div>

                    </form>
                </div>
            ) : (
                <div className="rounded-2xl border border-purple-100/80 bg-white/95 p-8 text-center shadow-lg shadow-purple-950/5 backdrop-blur-md">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    <p role={error ? 'alert' : 'status'} className="mt-3 text-xs font-medium text-slate-400">
                        {error || 'Carregando suas informações...'}
                    </p>
                </div>
            )}

            <footer className="mt-6 text-center">
                <button
                    type="button"
                    className="min-h-11 px-4 text-sm text-slate-500 transition hover:text-slate-700 cursor-pointer"
                    onClick={() => void signOut({ redirectUrl: '/participar' })}
                >
                    Sair da conta
                </button>
            </footer>
        </div>
        {crop && <ImageCropper imageSrc={crop} aspectRatio={1} circular onCrop={upload} onCancel={() => setCrop(null)} />}
    </main>;
}
