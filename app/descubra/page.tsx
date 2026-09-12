import React from 'react';
import { AdultExoclickLanding } from '@/components/landing/AdultExoclickLanding';

export const metadata = {
    title: 'MimoChat | Troque nudes com mulheres reais',
    description: 'Converse sem censura com mulheres reais, troque fotos e vídeos exclusivos com total privacidade e bônus de boas-vindas liberado.',
};

export default function DescubraPage() {
    return (
        <AdultExoclickLanding
            authRedirectUrl="/login"
            ctaTrackingAttr={true}
        />
    );
}
