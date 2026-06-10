'use client';

import {
    ArrowRight,
    BadgeCheck,
    Check,
    CheckCircle2,
    Clipboard,
    Heart,
    Link2,
    LockKeyhole,
    MessageCircleHeart,
    Send,
    ShieldCheck,
    Sparkles,
    UserRoundPlus,
    WalletCards,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { InstagramIcon } from '@/components/InstagramIcon';

const steps = [
    {
        icon: UserRoundPlus,
        title: 'Crie seu perfil',
        text: 'Monte sua página, adicione suas fotos e personalize sua apresentação.',
    },
    {
        icon: Link2,
        title: 'Compartilhe seu link',
        text: 'Divulgue seu perfil do Mimo nas suas redes sociais e convide seus seguidores para conversar.',
    },
    {
        icon: WalletCards,
        title: 'Receba seus mimos',
        text: 'Converse no seu tempo e acompanhe seus ganhos dentro da plataforma.',
    },
];

const examples = [
    `Gente, não estou conseguindo acompanhar todas as mensagens por aqui 💜
Agora estou respondendo pelo Mimo:
[seu link]
Lá consigo conversar com mais calma.`,
    `Vou começar a responder minhas mensagens pelo Mimo ✨
Quem quiser conversar comigo, me chama por lá:
[seu link]`,
    `Quer falar comigo com mais atenção?
Me chama no Mimo 💜
[seu link]`,
    `Estou testando uma nova forma de conversar com vocês.
Agora vou responder pelo Mimo:
[seu link]`,
];

const practices = [
    'Coloque o link do Mimo na bio do Instagram.',
    'Publique stories avisando que está respondendo por lá.',
    'Responda rápido para melhorar sua experiência com os clientes.',
    'Mantenha seu perfil bonito, atualizado e confiável.',
    'Evite promessas falsas ou conteúdo que viole as regras da plataforma.',
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

function scrollToForm() {
    document.getElementById('inscricao')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function CreatorLanding() {
    const [form, setForm] = useState<FormState>(initialForm);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
        setForm(current => ({ ...current, [field]: value }));
    }

    async function copyExample(text: string, index: number) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const copied = document.execCommand('copy');
                textarea.remove();
                if (!copied) throw new Error('Copy command failed');
            }
            setCopiedIndex(index);
            window.setTimeout(() => setCopiedIndex(null), 1800);
        } catch {
            try {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const copied = document.execCommand('copy');
                textarea.remove();
                if (!copied) throw new Error('Copy command failed');
                setCopiedIndex(index);
                window.setTimeout(() => setCopiedIndex(null), 1800);
            } catch {
                setError('Não foi possível copiar o texto. Selecione o exemplo e copie manualmente.');
            }
        }
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
        <div className="min-h-screen overflow-hidden bg-[#fcfaff] text-slate-900 selection:bg-purple-200">
            <div className="pointer-events-none fixed inset-0 opacity-70">
                <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-fuchsia-200/50 blur-3xl" />
                <div className="absolute -right-24 top-96 h-80 w-80 rounded-full bg-violet-200/50 blur-3xl" />
            </div>

            <header className="relative z-20 mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
                <nav className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
                    <a href="#inicio" className="flex items-center gap-2.5" aria-label="MimoChat para Criadoras">
                        <Image
                            src="/icon-192x192.png"
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-xl object-cover shadow-sm"
                        />
                        <div>
                            <span className="block text-base font-extrabold tracking-tight">MimoChat</span>
                            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-purple-600">
                                Para criadoras
                            </span>
                        </div>
                    </a>
                    <button
                        type="button"
                        onClick={scrollToForm}
                        className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 sm:px-5 sm:text-sm"
                    >
                        Quero me inscrever
                    </button>
                </nav>
            </header>

            <main id="inicio" className="relative z-10">
                <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.08fr_0.92fr] lg:pb-28">
                    <div className="text-center lg:text-left">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 px-3.5 py-2 text-xs font-bold text-purple-700 shadow-sm">
                            <Sparkles className="h-4 w-4" />
                            Seu tempo, suas conversas, seus mimos
                        </div>
                        <h1 className="text-5xl font-black leading-[0.96] tracking-[-0.05em] text-slate-950 sm:text-7xl">
                            Ganhe por
                            <span className="block bg-linear-to-r from-purple-600 via-fuchsia-600 to-violet-600 bg-clip-text text-transparent">
                                conversar.
                            </span>
                        </h1>
                        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl lg:mx-0">
                            Responda mensagens no seu tempo e receba seus mimos.
                        </p>
                        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                            <button
                                type="button"
                                onClick={scrollToForm}
                                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-7 py-4 text-base font-extrabold text-white shadow-xl shadow-purple-200 transition hover:-translate-y-0.5 hover:bg-purple-700 sm:w-auto"
                            >
                                Quero ser criadora
                                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </button>
                            <div className="flex max-w-xs items-center gap-2 text-left text-xs font-medium leading-relaxed text-slate-500">
                                <ShieldCheck className="h-8 w-8 shrink-0 text-purple-500" />
                                Selecionamos novas criadoras aos poucos para manter a comunidade segura e de qualidade.
                            </div>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-md">
                        <div className="absolute inset-4 rotate-6 rounded-[2.5rem] bg-linear-to-br from-purple-400 to-fuchsia-400 opacity-30 blur-sm" />
                        <div className="relative rounded-[2.5rem] border border-white bg-white/90 p-5 shadow-2xl shadow-purple-200/70 backdrop-blur">
                            <div className="rounded-[2rem] bg-linear-to-br from-purple-600 via-violet-600 to-fuchsia-500 p-7 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                                        <MessageCircleHeart className="h-7 w-7" />
                                    </div>
                                    <span className="rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
                                        No seu tempo
                                    </span>
                                </div>
                                <p className="mt-12 text-sm font-semibold text-purple-100">Uma nova mensagem para você</p>
                                <p className="mt-2 text-2xl font-black leading-tight">Converse com atenção. Receba com transparência.</p>
                                <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white p-4 text-slate-900 shadow-lg">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                                        <Heart className="h-5 w-5 fill-current" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500">Mimo recebido</p>
                                        <p className="text-base font-black text-purple-700">Acompanhe tudo no app</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-purple-100 bg-white/70 py-20 backdrop-blur-sm">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <SectionHeading
                            eyebrow="Simples de começar"
                            title="Como funciona"
                            text="Você cria seu espaço, compartilha com quem já acompanha você e conversa quando puder."
                        />
                        <div className="mt-10 grid gap-5 md:grid-cols-3">
                            {steps.map((step, index) => (
                                <article key={step.title} className="rounded-3xl border border-purple-100 bg-white p-7 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="rounded-2xl bg-purple-100 p-3 text-purple-700">
                                            <step.icon className="h-6 w-6" />
                                        </div>
                                        <span className="text-4xl font-black text-purple-100">0{index + 1}</span>
                                    </div>
                                    <h3 className="mt-6 text-xl font-extrabold">{step.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.text}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
                    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                        <div className="lg:sticky lg:top-8">
                            <SectionHeading
                                align="left"
                                eyebrow="Primeiros passos"
                                title="Como conseguir seus primeiros clientes"
                                text="O Mimo te dá a estrutura para conversar e receber seus mimos, mas os primeiros clientes normalmente vêm da sua própria audiência. Quanto mais você divulgar seu link, maior a chance de receber mensagens."
                            />
                            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-relaxed text-amber-900">
                                O Mimo não envia clientes automaticamente e não garante ganhos. A divulgação deve ser natural, sem spam.
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {examples.map((example, index) => (
                                <article key={index} className="flex min-h-64 flex-col rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600">
                                        <InstagramIcon className="h-4 w-4" />
                                        Exemplo {index + 1}
                                    </div>
                                    <p className="mt-5 flex-1 whitespace-pre-line text-sm leading-7 text-slate-700">{example}</p>
                                    <button
                                        type="button"
                                        onClick={() => copyExample(example, index)}
                                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs font-extrabold text-purple-700 transition hover:bg-purple-100"
                                    >
                                        {copiedIndex === index ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                                        {copiedIndex === index ? 'Exemplo copiado' : 'Copiar exemplo'}
                                    </button>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-slate-950 py-20 text-white sm:py-24">
                    <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
                        <div>
                            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-purple-300">Faça do seu jeito, faça bem</span>
                            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Boas práticas que fazem diferença</h2>
                            <p className="mt-4 max-w-lg leading-relaxed text-slate-400">
                                Uma presença clara e verdadeira ajuda sua audiência a confiar no seu perfil e entender onde falar com você.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {practices.map(practice => (
                                <div key={practice} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
                                    <span className="text-sm font-medium leading-relaxed text-slate-200">{practice}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
                    <div className="overflow-hidden rounded-[2rem] bg-linear-to-br from-purple-600 to-violet-700 p-7 text-white shadow-2xl shadow-purple-200 sm:p-12">
                        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="max-w-2xl">
                                <div className="mb-5 inline-flex rounded-2xl bg-white/15 p-3">
                                    <LockKeyhole className="h-7 w-7" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Segurança e análise</h2>
                                <p className="mt-4 leading-relaxed text-purple-100">
                                    Para proteger criadoras e clientes, analisamos os perfis antes da liberação. Isso ajuda a evitar fakes, menores de idade e cadastros fora do perfil da comunidade.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={scrollToForm}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-extrabold text-purple-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-purple-50"
                            >
                                Inscreva-se para análise
                                <ArrowRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </section>

                <section id="inscricao" className="scroll-mt-4 border-t border-purple-100 bg-white py-20 sm:py-28">
                    <div className="mx-auto max-w-3xl px-4 sm:px-6">
                        <SectionHeading
                            eyebrow="Inscrição"
                            title="Conte um pouco sobre você"
                            text="Preencha com atenção. Nossa equipe analisa cada perfil antes de liberar a entrada na comunidade."
                        />

                        {success ? (
                            <div className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center sm:p-12">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <BadgeCheck className="h-9 w-9" />
                                </div>
                                <h3 className="mt-5 text-2xl font-black text-emerald-950">Inscrição recebida 💜</h3>
                                <p className="mx-auto mt-3 max-w-xl leading-relaxed text-emerald-800">
                                    Nossa equipe vai analisar seu perfil e entrar em contato se fizer sentido para a comunidade.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="mt-10 space-y-8 rounded-3xl border border-slate-200 bg-[#fcfcfd] p-5 shadow-sm sm:p-8">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <Field label="Nome completo" required>
                                        <input
                                            required
                                            value={form.fullName}
                                            onChange={event => updateField('fullName', event.target.value)}
                                            className={inputClass}
                                            placeholder="Seu nome completo"
                                        />
                                    </Field>
                                    <Field label="Nome artístico/apelido" hint="Opcional">
                                        <input
                                            value={form.artisticName}
                                            onChange={event => updateField('artisticName', event.target.value)}
                                            className={inputClass}
                                            placeholder="Como você é conhecida"
                                        />
                                    </Field>
                                    <Field label="Instagram" required>
                                        <input
                                            required
                                            value={form.instagram}
                                            onChange={event => updateField('instagram', event.target.value)}
                                            className={inputClass}
                                            placeholder="@seuinstagram"
                                            autoCapitalize="none"
                                        />
                                    </Field>
                                    <Field label="WhatsApp" required>
                                        <input
                                            required
                                            value={form.whatsapp}
                                            onChange={event => updateField('whatsapp', event.target.value)}
                                            className={inputClass}
                                            placeholder="(11) 99999-9999"
                                            inputMode="tel"
                                        />
                                    </Field>
                                    <Field label="E-mail" hint="Opcional">
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={event => updateField('email', event.target.value)}
                                            className={inputClass}
                                            placeholder="voce@email.com"
                                            autoCapitalize="none"
                                        />
                                    </Field>
                                    <Field label="Idade" required>
                                        <input
                                            required
                                            type="number"
                                            min={18}
                                            max={100}
                                            value={form.age}
                                            onChange={event => updateField('age', event.target.value)}
                                            className={inputClass}
                                            placeholder="18"
                                            inputMode="numeric"
                                        />
                                    </Field>
                                    <Field label="Cidade/Estado" required>
                                        <input
                                            required
                                            value={form.cityState}
                                            onChange={event => updateField('cityState', event.target.value)}
                                            className={inputClass}
                                            placeholder="São Paulo/SP"
                                        />
                                    </Field>
                                    <Field label="Você já cria conteúdo ou atende clientes online?" required>
                                        <select
                                            required
                                            value={form.hasOnlineExperience}
                                            onChange={event => updateField('hasOnlineExperience', event.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="">Selecione</option>
                                            <option value="yes">Sim</option>
                                            <option value="no">Não</option>
                                            <option value="starting">Estou começando</option>
                                        </select>
                                    </Field>
                                </div>

                                <Field label="Como conheceu o Mimo?" required>
                                    <input
                                        required
                                        value={form.howFoundMimo}
                                        onChange={event => updateField('howFoundMimo', event.target.value)}
                                        className={inputClass}
                                        placeholder="Instagram, indicação, pesquisa..."
                                    />
                                </Field>

                                <Field label="Por que quer entrar no Mimo?" required>
                                    <textarea
                                        required
                                        rows={5}
                                        value={form.reason}
                                        onChange={event => updateField('reason', event.target.value)}
                                        className={`${inputClass} resize-none`}
                                        placeholder="Conte sobre seu perfil, sua audiência e o que espera da plataforma."
                                    />
                                </Field>

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

                                <div className="space-y-3">
                                    <Checkbox
                                        checked={form.isAdultConfirmed}
                                        onChange={checked => updateField('isAdultConfirmed', checked)}
                                        label="Confirmo que tenho 18 anos ou mais."
                                    />
                                    <Checkbox
                                        checked={form.contactConsent}
                                        onChange={checked => updateField('contactConsent', checked)}
                                        label="Aceito ser contatada pela equipe do MimoChat."
                                    />
                                </div>

                                {error && (
                                    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-4 font-extrabold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? 'Enviando inscrição...' : 'Enviar para análise'}
                                    {!submitting && <Send className="h-5 w-5" />}
                                </button>
                                <p className="text-center text-xs leading-relaxed text-slate-500">
                                    A inscrição não garante aprovação. Entraremos em contato caso seu perfil faça sentido para a comunidade.
                                </p>
                            </form>
                        )}
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
                    <span>© {new Date().getFullYear()} MimoChat. Conversas com mais atenção.</span>
                    <div className="flex items-center gap-4">
                        <Link className="font-semibold hover:text-purple-600" href="/termos-de-uso">Termos</Link>
                        <Link className="font-semibold hover:text-purple-600" href="/politica-de-privacidade">Privacidade</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100';

function SectionHeading({
    eyebrow,
    title,
    text,
    align = 'center',
}: {
    eyebrow: string;
    title: string;
    text: string;
    align?: 'left' | 'center';
}) {
    return (
        <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl text-left'}>
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-purple-600">{eyebrow}</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
            <p className="mt-4 leading-relaxed text-slate-600">{text}</p>
        </div>
    );
}

function Field({
    label,
    hint,
    required,
    children,
}: {
    label: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="block text-sm font-bold text-slate-800">
            <span>
                {label}
                {required && <span className="ml-1 text-purple-600">*</span>}
                {hint && <span className="ml-2 text-xs font-medium text-slate-400">{hint}</span>}
            </span>
            {children}
        </label>
    );
}

function Checkbox({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
            <input
                type="checkbox"
                required
                checked={checked}
                onChange={event => onChange(event.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 accent-purple-600"
            />
            <span>{label}</span>
        </label>
    );
}
