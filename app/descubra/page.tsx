import React from 'react';
import { AdultExoclickLanding } from '@/components/landing/AdultExoclickLanding';

export const metadata = {
    title: 'MimoChat | Converse e desbloqueie fotos e vídeos',
    description: 'Converse no Mimo e escolha quais fotos e vídeos desbloquear. Experimente uma demonstração de desbloqueio de mídia.',
};

export default function DescubraPage() {
    return (
        <AdultExoclickLanding
            authRedirectUrl="/login"
            ctaTrackingAttr={true}
        />
    );
}

