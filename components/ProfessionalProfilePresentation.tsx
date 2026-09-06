'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Lock, Pause, Play, ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';

export interface ProfileGalleryItem {
    _id: string;
    imageUrl: string;
    mediaType?: string;
    visibility?: 'public' | 'subscribers';
    galleryType?: 'public' | 'private';
}

interface Props {
    user: {
        name?: string;
        username: string;
        photoUrl?: string;
        bio?: string;
        identityStatus?: string | null;
        messagesLastWeekCount?: number;
        isSubscriptionEnabled?: boolean;
        subscriptionPrice?: number;
        chargePerCharSubscribers?: number;
        chargePerCharNonSubscribers?: number;
    };
    publicItems: ProfileGalleryItem[];
    exclusiveItems: ProfileGalleryItem[];
    privateCount: number;
    isSubscriber: boolean;
    isOwner: boolean;
    loadingGallery: boolean;
    subscribing: boolean;
    onBack?: () => void;
    onSubscribe?: () => void;
    onOpen: (items: ProfileGalleryItem[], index: number) => void;
    headerActions?: React.ReactNode;
}

export function ProfilePhoto({ src, alt, priority = false, ambient = false }: { src: string; alt: string; priority?: boolean; ambient?: boolean }) {
    const [failed, setFailed] = useState(false);

    return src && !failed ? (
        <div className="absolute inset-0 isolate overflow-hidden">
            {ambient && <Image src={src} alt="" aria-hidden fill unoptimized sizes="100vw" className="pointer-events-none scale-110 object-cover blur-3xl brightness-[0.65]" draggable={false} />}
            <Image src={src} alt={alt} fill unoptimized priority={priority} sizes="(min-width: 1024px) 50vw, 100vw" className={`relative ${ambient ? 'object-contain' : 'object-cover'}`} draggable={false} onError={() => setFailed(true)} />
        </div>
    ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100"><Avatar size={88} /></div>
    );
}

export function ProfessionalProfilePresentation({ user, publicItems, exclusiveItems, privateCount, isSubscriber, isOwner, loadingGallery, subscribing, onBack, onSubscribe, onOpen, headerActions }: Props) {
    const [photoIndex, setPhotoIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [revealed, setRevealed] = useState<Record<string, boolean>>({});
    const galleryRef = useRef<HTMLDivElement>(null);
    const photoIndexRef = useRef(0);
    const [autoplayStopped, setAutoplayStopped] = useState(false);
    const bioId = useId();
    const bioRef = useRef<HTMLParagraphElement>(null);
    const [bioOverflows, setBioOverflows] = useState(false);
    const bio = user.bio?.trim();
    const hasExclusive = exclusiveItems.length > 0 || privateCount > 0;
    const name = user.name || `@${user.username}`;
    const canAccess = isSubscriber || isOwner;
    const regularRate = user.chargePerCharNonSubscribers;
    const subscriberRate = user.chargePerCharSubscribers;
    const discountPercentage = typeof regularRate === 'number' && regularRate > 0
        && typeof subscriberRate === 'number' && subscriberRate >= 0 && subscriberRate < regularRate
        ? Math.round((1 - subscriberRate / regularRate) * 100)
        : 0;

    useEffect(() => {
        const gallery = galleryRef.current;
        if (!gallery) return;
        const observer = new ResizeObserver(() => {
            gallery.scrollLeft = photoIndexRef.current * gallery.clientWidth;
        });
        observer.observe(gallery);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (autoplayStopped || publicItems.length < 2) return;
        const desktop = window.matchMedia('(min-width: 1024px)');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const timer = window.setInterval(() => {
            const gallery = galleryRef.current;
            if (!gallery || !desktop.matches || reducedMotion.matches || document.hidden) return;
            const nextIndex = (photoIndexRef.current + 1) % publicItems.length;
            gallery.scrollTo({ left: nextIndex * gallery.clientWidth, behavior: 'smooth' });
        }, 5000);
        return () => window.clearInterval(timer);
    }, [autoplayStopped, publicItems.length]);

    useEffect(() => {
        const element = bioRef.current;
        if (!element || expanded) return;
        const observer = new ResizeObserver(() => setBioOverflows(element.scrollHeight > element.clientHeight + 1));
        observer.observe(element);
        return () => observer.disconnect();
    }, [bio, expanded]);

    const moveToPhoto = (index: number) => {
        galleryRef.current?.scrollTo({ left: index * galleryRef.current.clientWidth, behavior: 'smooth' });
    };

    const stopAutoplay = (event: { target: EventTarget }) => {
        if (event.target instanceof Element && event.target.closest('[data-autoplay-control]')) return;
        setAutoplayStopped(true);
    };

    return (
        <div onPointerDownCapture={stopAutoplay} onKeyDownCapture={stopAutoplay} onFocusCapture={stopAutoplay} onWheelCapture={stopAutoplay} className="mx-auto w-full max-w-2xl shrink-0 bg-white sm:mt-6 sm:overflow-hidden sm:rounded-3xl lg:mt-0 lg:grid lg:h-full lg:min-h-0 lg:max-w-none lg:grid-cols-2 lg:rounded-none">
            <section aria-label="Fotos públicas" aria-roledescription="carrossel" className="relative min-w-0 bg-slate-100 lg:h-full lg:min-h-0 lg:bg-slate-950">
                <div ref={galleryRef} className={`flex min-h-56 snap-x snap-mandatory overflow-x-auto no-scrollbar lg:h-full lg:min-h-0 ${publicItems.length ? 'h-[min(52svh,440px)]' : 'h-56'}`} onScroll={(event) => {
                    const element = event.currentTarget;
                    const index = Math.round(element.scrollLeft / element.clientWidth);
                    photoIndexRef.current = index;
                    setPhotoIndex(index);
                }}>
                    {publicItems.length ? publicItems.map((item, index) => (
                        <button key={item._id} type="button" onClick={() => onOpen(publicItems, index)} aria-label={`Abrir foto ${index + 1} de ${name}`} className="relative h-full w-full shrink-0 snap-center focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-purple-600">
                            <ProfilePhoto src={item.imageUrl} alt={`${name}, foto ${index + 1}`} priority={index === 0} ambient />
                        </button>
                    )) : (
                        <div className="flex w-full items-center justify-center"><Avatar size={96} /></div>
                    )}
                </div>
                {headerActions ? (
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 pointer-events-none">
                        {headerActions}
                    </div>
                ) : onBack ? (
                    <button type="button" onClick={onBack} aria-label="Voltar" className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><ChevronLeft size={23} /></button>
                ) : null}
                {publicItems.length > 1 && (
                    <>
                        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between pointer-events-none">
                            <button type="button" disabled={photoIndex === 0} onClick={() => moveToPhoto(photoIndex - 1)} aria-label="Foto anterior" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white disabled:invisible"><ChevronLeft size={22} /></button>
                            <button type="button" disabled={photoIndex >= publicItems.length - 1} onClick={() => moveToPhoto(photoIndex + 1)} aria-label="Próxima foto" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white disabled:invisible"><ChevronRight size={22} /></button>
                        </div>
                        <div aria-live={autoplayStopped ? 'polite' : 'off'} aria-atomic="true" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white lg:bottom-8">{photoIndex + 1} / {publicItems.length}</div>
                        <button type="button" data-autoplay-control onClick={() => setAutoplayStopped(!autoplayStopped)} aria-label={autoplayStopped ? 'Reproduzir fotos automaticamente' : 'Pausar troca automática de fotos'} className="absolute bottom-6 right-6 hidden h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60 lg:flex motion-reduce:hidden">{autoplayStopped ? <Play size={17} /> : <Pause size={17} />}</button>
                    </>
                )}
            </section>

            <div aria-label="Detalhes do perfil" tabIndex={0} className="min-w-0 space-y-7 px-5 py-6 sm:px-8 sm:py-8 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:px-10 lg:pt-12 lg:pb-[calc(7rem+env(safe-area-inset-bottom))] xl:px-16">
                <section aria-label="Apresentação">
                    <div className="flex items-center gap-2">
                        <h1 className="min-w-0 break-words text-3xl font-bold tracking-tight text-slate-900">{name}</h1>
                        {user.identityStatus === 'approved' && <ShieldCheck aria-label="Identidade verificada" className="h-6 w-6 shrink-0 text-purple-600" />}
                    </div>
                    <p className="mt-1 break-all text-sm text-slate-500">@{user.username}</p>
                    {(user.messagesLastWeekCount ?? 0) > 0 && <p className="mt-3 text-xs text-slate-500">Atividade nos últimos 7 dias</p>}
                    {bio && (
                        <div className="mt-5">
                            <p id={bioId} ref={bioRef} className={`whitespace-pre-line break-words text-base leading-6 text-slate-600 ${expanded ? '' : 'line-clamp-4'}`}>{bio}</p>
                            {(bioOverflows || expanded) && <button type="button" aria-expanded={expanded} aria-controls={bioId} onClick={() => setExpanded(!expanded)} className="mt-2 min-h-11 text-sm font-semibold text-purple-600 hover:text-purple-800">{expanded ? 'Mostrar menos' : 'Ler mais'}</button>}
                        </div>
                    )}
                </section>

                {(user.isSubscriptionEnabled || isSubscriber) && (
                    <section aria-label="Assinatura" className="rounded-2xl border border-purple-100 bg-purple-50/40 p-5">
                        <p className="text-xs font-semibold text-purple-600">{isSubscriber ? 'Você é assinante' : isOwner ? 'Sua assinatura' : 'Assinatura'}</p>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Prioridade nas respostas</h2>
                        {discountPercentage > 0 && <p className="mt-2 text-sm font-medium leading-6 text-purple-700">{discountPercentage}% de desconto no custo das mensagens.</p>}
                        {hasExclusive && <p className="mt-2 text-sm leading-6 text-slate-600">Inclui acesso às fotos exclusivas para assinantes.</p>}
                        {typeof user.subscriptionPrice === 'number' && <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{user.subscriptionPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<span className="text-sm font-normal tracking-normal text-slate-500"> / 30 dias</span></p>}
                        {!isSubscriber && !isOwner && user.isSubscriptionEnabled && <Button title="Assinar perfil" variant="outline" onClick={onSubscribe} loading={subscribing || loadingGallery} className="mt-4 w-full" />}
                        {isSubscriber && <p className="mt-3 text-sm font-medium text-purple-700">Assinatura ativa</p>}
                        <p className="mt-4 text-xs leading-5 text-slate-500">A assinatura não inclui o custo das mensagens, cobrado separadamente.</p>
                    </section>
                )}

                {hasExclusive && (
                    <section aria-label="Conteúdo para assinantes" className="border-t border-slate-100 pt-6">
                        <div className="mb-4 flex items-center gap-2"><Lock size={16} className="text-purple-600" /><h2 className="text-lg font-semibold text-slate-900">Fotos para assinantes</h2></div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {exclusiveItems.map((item, index) => {
                                const hidden = !canAccess || (isOwner && item.visibility === 'subscribers' && !revealed[item._id]);
                                return (
                                    <div key={item._id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100">
                                        <button type="button" aria-label={hidden ? 'Conteúdo exclusivo para assinantes' : `Abrir conteúdo exclusivo ${index + 1}`} disabled={!canAccess && !user.isSubscriptionEnabled} onClick={() => canAccess ? onOpen(exclusiveItems, index) : onSubscribe?.()} className="absolute inset-0 h-full w-full">
                                            {hidden ? <div className="flex h-full flex-col items-center justify-center gap-2 bg-purple-50 text-purple-600"><Lock size={22} /><span className="text-xs font-medium">Exclusivo</span></div> : item.mediaType === 'video' ? <video src={item.imageUrl} preload="metadata" className="h-full w-full object-cover" /> : <ProfilePhoto src={item.imageUrl} alt={`Foto exclusiva ${index + 1}`} />}
                                        </button>
                                        {isOwner && item.visibility === 'subscribers' && <button type="button" aria-label={hidden ? 'Revelar foto na galeria' : 'Ocultar foto na galeria'} onClick={() => setRevealed(previous => ({ ...previous, [item._id]: !previous[item._id] }))} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-purple-700">{hidden ? <Eye size={18} /> : <EyeOff size={18} />}</button>}
                                    </div>
                                );
                            })}
                        </div>
                        {!canAccess && privateCount > 0 && <button type="button" onClick={() => onSubscribe?.()} disabled={!user.isSubscriptionEnabled} className="mt-3 flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl bg-purple-50 px-4 py-5 text-purple-700"><Lock size={22} /><span className="text-sm">{privateCount} {privateCount === 1 ? 'conteúdo exclusivo' : 'conteúdos exclusivos'}</span><span className="text-xs text-slate-500">Disponível para assinantes</span></button>}
                    </section>
                )}
            </div>
        </div>
    );
}
