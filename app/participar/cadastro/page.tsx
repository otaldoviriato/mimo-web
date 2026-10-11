'use client';
import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { ImageCropper } from '@/components/ImageCropper';
import { suggestApplicantUsername, validateApplicantBirthDate } from '@/lib/applicant';
import { POST_AUTH_REDIRECT_STORAGE_KEY } from '@/lib/postAuthRedirect';

type Draft = { name: string; username: string; birthDate: string; photoUrl: string; manual: boolean };
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
            setDraft({ ...empty, ...data.profile, username: data.profile.username.startsWith('candidata_') ? '' : data.profile.username, manual: !data.profile.username.startsWith('candidata_'), ...saved, photoUrl: data.profile.photoUrl });
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
        setCrop(null); setBusy(true); setError('');
        try {
            const form = new FormData(); form.append('photo', file);
            const response = await fetch('/api/users/me/photo', { method: 'POST', body: form });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a foto.');
            setDraft(current => ({ ...current, photoUrl: data.photoUrl }));
        } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
    }
    async function save(complete: boolean) {
        const birthError = validateApplicantBirthDate(draft.birthDate);
        if (birthError) { setError(birthError); return; }
        if (complete && !draft.photoUrl) { setError('Envie sua foto de perfil.'); return; }
        setBusy(true); setError('');
        try {
            const response = await fetch('/api/participar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, username: draft.username, birthDate: draft.birthDate, complete }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível salvar.');
            if (data.profile.completed) enterApp();
            else setError('Cadastro salvo. Você pode continuar mais tarde.');
        } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
    }
    return <main className="min-h-dvh bg-radial from-[#eee0ff] via-[#faf8fd] to-white px-4 py-10">
        <div className="mx-auto max-w-sm">
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Faça parte do Mimo</h1>
            <p className="text-center text-sm text-slate-500 mb-6">Prepare seu perfil para a análise da equipe.</p>
            {error && <p role="alert" className="mb-4 rounded-xl bg-purple-50 p-3 text-sm text-purple-900">{error}</p>}
            {ready && <form className="bg-white rounded-2xl border border-purple-100 p-6 shadow-xl space-y-4" onSubmit={event => { event.preventDefault(); void save(true); }}>
                <label className="block text-sm font-medium text-gray-700">Foto de perfil
                    {draft.photoUrl && <img src={draft.photoUrl} alt="Sua foto de perfil" className="my-3 h-24 w-24 rounded-full object-cover" />}
                    <input type="file" accept="image/*" disabled={busy} className="mt-2 block w-full text-sm" onChange={event => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setError('Escolha uma imagem de até 10 MB.'); return; }
                        const reader = new FileReader(); reader.onload = () => setCrop(String(reader.result)); reader.readAsDataURL(file);
                        event.target.value = '';
                    }} />
                </label>
                <Input aria-label="Nome público" label="Nome público" value={draft.name} maxLength={80} required onChange={event => { const name = event.target.value; setDraft(current => ({ ...current, name, username: current.manual ? current.username : suggestApplicantUsername(name) })); setAvailability(''); }} />
                <Input aria-label="Username" label="Username" value={draft.username} minLength={2} maxLength={30} pattern="[a-z0-9._\-]+" required onChange={event => { setDraft(current => ({ ...current, username: event.target.value.toLowerCase(), manual: true })); setAvailability(''); }} />
                <p aria-live="polite" className="text-xs text-slate-500">{availability}</p>
                <Input aria-label="Data de nascimento" label="Data de nascimento" type="date" value={draft.birthDate} required onChange={event => setDraft(current => ({ ...current, birthDate: event.target.value }))} />
                <Button className="w-full" title={busy ? 'Aguarde...' : 'Concluir cadastro'} type="submit" disabled={busy} />
                <button type="button" disabled={busy} className="w-full text-sm text-purple-700 py-2" onClick={() => void save(false)}>Salvar e continuar depois</button>
            </form>}
            {!ready && !error && <p role="status">Carregando cadastro...</p>}
            <button className="mt-6 w-full text-sm text-slate-500" onClick={() => void signOut({ redirectUrl: '/participar' })}>Sair da conta</button>
        </div>
        {crop && <ImageCropper imageSrc={crop} aspectRatio={1} circular onCrop={upload} onCancel={() => setCrop(null)} />}
    </main>;
}
