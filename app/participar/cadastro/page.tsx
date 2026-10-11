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
    const fieldClass = "w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-base text-slate-900 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100 placeholder:text-slate-400 disabled:opacity-60";
    return <main className="h-dvh overflow-y-auto bg-[#faf9fc] px-5 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-md">
            <header className="mb-7">
                <span className="text-xl font-black tracking-tight text-purple-600">mimo<span className="text-purple-300">.</span></span>
                <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-purple-600">Seu primeiro passo</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Um perfil com a sua cara.</h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">Escolha como você quer aparecer no Mimo. Depois, nossa equipe vai analisar seu perfil.</p>
            </header>
            {ready && <form className="space-y-6" onSubmit={event => { event.preventDefault(); void save(true); }}>
                <section className="flex items-center gap-4 rounded-3xl border border-purple-100 bg-white p-4">
                    <button type="button" disabled={busy} onClick={() => photoInput.current?.click()} aria-label={draft.photoUrl ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'} className="relative h-20 w-20 shrink-0 rounded-full bg-purple-50 text-purple-400 ring-4 ring-white focus-visible:outline-2 focus-visible:outline-purple-500">
                        {draft.photoUrl ? <img src={draft.photoUrl} alt="Sua foto de perfil" className="h-full w-full rounded-full object-cover" /> : <UserRound aria-hidden="true" className="mx-auto h-9 w-9" strokeWidth={1.5} />}
                        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-purple-600 text-white"><Camera size={13} /></span>
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-900">Sua foto de perfil</h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Uma foto nítida, em que seu rosto apareça bem.</p>
                        <button type="button" disabled={busy} onClick={() => photoInput.current?.click()} className="mt-2 text-sm font-semibold text-purple-600 hover:text-purple-800">{busy ? 'Aguarde...' : draft.photoUrl ? 'Trocar foto' : 'Adicionar foto'}</button>
                    </div>
                    <input ref={photoInput} aria-label="Arquivo da foto de perfil" type="file" accept="image/*" disabled={busy} className="hidden" onChange={event => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (!file) return;
                        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setError('Escolha uma imagem de até 10 MB.'); return; }
                        const reader = new FileReader(); reader.onload = () => setCrop(String(reader.result)); reader.readAsDataURL(file);
                    }} />
                </section>
                <div className="space-y-5">
                    <div><label htmlFor="applicant-name" className="mb-2 block text-sm font-semibold text-slate-700">Nome público</label>
                        <input id="applicant-name" className={fieldClass} placeholder="Como você quer ser chamada?" autoComplete="nickname" value={draft.name} maxLength={80} required disabled={busy} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} />
                    </div>
                    <div><label htmlFor="applicant-username" className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
                        <div className="relative"><span aria-hidden="true" className="pointer-events-none absolute left-4 top-3.5 text-slate-400">@</span><input id="applicant-username" aria-describedby="username-help" className={`${fieldClass} pl-9`} placeholder="crie_seu_username" autoCapitalize="none" autoComplete="off" spellCheck={false} value={draft.username} minLength={2} maxLength={30} pattern="[a-z0-9._\-]+" required disabled={busy} onChange={event => { setDraft(current => ({ ...current, username: event.target.value.toLowerCase(), manual: true })); setAvailability(''); }} /></div>
                        <p id="username-help" aria-live="polite" className={`mt-2 text-xs ${availability === 'Username disponível' ? 'text-emerald-600' : 'text-slate-500'}`}>{availability || 'Escolha um nome único. Use letras, números, ponto ou underline.'}</p>
                    </div>
                    <div><label htmlFor="applicant-birth" className="mb-2 block text-sm font-semibold text-slate-700">Data de nascimento</label>
                        <input id="applicant-birth" aria-describedby="birth-help" className={fieldClass} type="text" inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} autoComplete="bday" value={draft.birthDate} required disabled={busy} onChange={event => setDraft(current => ({ ...current, birthDate: maskDate(event.target.value) }))} />
                        <p id="birth-help" className="mt-2 text-xs text-slate-500">Você precisa ter 18 anos ou mais. Essa data não é pública.</p>
                    </div>
                </div>
                {error && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                {notice && <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700"><Check size={16} />{notice}</p>}
                <div className="space-y-3 pt-1">
                    <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-4 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60" type="submit" disabled={busy}>{busy ? 'Aguarde...' : 'Concluir cadastro'}{!busy && <ArrowRight size={17} />}</button>
                    <button type="button" disabled={busy} className="w-full py-2 text-sm font-medium text-slate-500 hover:text-purple-700" onClick={() => void save(false)}>Salvar e continuar depois</button>
                </div>
                <p className="flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={15} />Seu perfil passa por análise antes de ser publicado.</p>
            </form>}
            {!ready && <p role={error ? 'alert' : 'status'} className="py-6 text-sm text-slate-500">{error || 'Carregando cadastro...'}</p>}
            <footer className="mt-8 border-t border-slate-200/70 pt-5 text-center"><button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => void signOut({ redirectUrl: '/participar' })}>Sair da conta</button></footer>
        </div>
        {crop && <ImageCropper imageSrc={crop} aspectRatio={1} circular onCrop={upload} onCancel={() => setCrop(null)} />}
    </main>;
}
