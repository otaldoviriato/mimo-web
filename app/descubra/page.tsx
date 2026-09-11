import React from 'react';
import { NetflixStyleLanding } from '@/components/landing/NetflixStyleLanding';

export const metadata = {
    title: 'MimoChat | Recarregue. Converse. Descubra.',
    description: 'Converse com mulheres reais, troque fotos e vídeos exclusivos com total privacidade e recargas rápidas no PIX.',
};

export default function DescubraPage() {
    return (
        <NetflixStyleLanding
            authRedirectUrl="/login"
            ctaTrackingAttr={true}
        />
    );
}
