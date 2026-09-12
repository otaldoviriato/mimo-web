'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, LockKeyhole, RotateCcw, UnlockKeyhole } from 'lucide-react';
import styles from './DiscoverLanding.module.css';
import { DiscoverProfileBackground } from './NetflixStyleLanding';

interface AdultExoclickLandingProps {
    authRedirectUrl?: string;
    ctaTrackingAttr?: boolean;
}

export function AdultExoclickLanding({ authRedirectUrl = '/login', ctaTrackingAttr = true }: AdultExoclickLandingProps) {
    const [unlocked, setUnlocked] = useState(false);
    const destination = `${authRedirectUrl}?redirect=${encodeURIComponent('/search')}`;
    const tracking = ctaTrackingAttr ? { 'data-campaign-cta': true } : {};

    return (
        <div className={styles.page}>
            <DiscoverProfileBackground />
            <header className={styles.header}>
                <Link href="/" className={styles.brand} aria-label="Mimo — início">
                    <span className={styles.logo}><Image src="/Logo.svg" alt="" width={22} height={22} priority /></span>
                    Mimo<span className={styles.brandLight}>Chat</span>
                </Link>
                <Link href={destination} {...tracking} className={styles.signIn}>Entrar <ArrowRight size={15} /></Link>
            </header>

            <main className={styles.main}>
                <div className={styles.intro}>
                    <p className={styles.eyebrow}>A conversa é só o começo.</p>
                    <h1>Tem mais<br />por trás do <span>blur.</span></h1>
                    <p className={styles.subtitle}>Fotos e vídeos para desbloquear no chat.</p>
                </div>

                <section className={styles.chat} aria-label="Demonstração de desbloqueio de mídia">
                    <div className={styles.chatHeader}>
                        <Image src="/assets/banner-model-avatar.png" alt="" width={38} height={38} className={styles.avatar} />
                        <div className={styles.chatIdentity}><strong>Letícia</strong><span>Conversa demonstrativa</span></div>
                        <LockKeyhole size={16} aria-hidden="true" />
                    </div>
                    <div className={styles.chatBody}>
                        <p className={styles.bubble}>Separei essa foto pra você <span aria-hidden="true">✨</span></p>
                        <div className={styles.media} data-unlocked={unlocked}>
                            <Image
                                src="/assets/banner-model-hero.png"
                                alt={unlocked ? 'Foto ilustrativa revelada na demonstração' : 'Prévia desfocada de uma foto bloqueada'}
                                fill priority sizes="(max-width: 600px) 90vw, 360px"
                                className={styles.photo}
                            />
                            <div className={styles.shade} />
                            <span className={styles.mediaLabel}>{unlocked ? <UnlockKeyhole size={13} /> : <LockKeyhole size={13} />} {unlocked ? 'Foto desbloqueada' : 'Foto exclusiva'}</span>
                            {!unlocked ? (
                                <button className={styles.unlock} onClick={() => setUnlocked(true)} aria-label="Experimentar desbloqueio gratuito da foto demonstrativa">
                                    <span className={styles.lockCircle}><LockKeyhole size={27} strokeWidth={1.7} /></span>
                                    <strong>Toque para desbloquear</strong>
                                    <span className={styles.demoHint}>Experimente aqui, sem cobrança</span>
                                </button>
                            ) : (
                                <div className={styles.revealed}>
                                    <span role="status"><Check size={16} /> Pronto. É assim que funciona.</span>
                                    <button onClick={() => setUnlocked(false)} aria-label="Repetir demonstração"><RotateCcw size={16} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <div className={styles.action}>
                    <Link href={destination} {...tracking} className={styles.cta}>Explorar o Mimo <ArrowRight size={20} /></Link>
                    <p>Escolha com quem conversar e o que desbloquear.</p>
                </div>
            </main>

            <footer className={styles.footer}>
                <span>18+</span><Link href="/termos-de-uso">Termos</Link><Link href="/politica-de-privacidade">Privacidade</Link><Link href="/ajuda">Ajuda</Link>
            </footer>
        </div>
    );
}

