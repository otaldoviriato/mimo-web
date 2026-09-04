import React from 'react';
import { SimulationLanding } from '@/components/landing/SimulationLanding';
import { CampaignVisitTracker } from '@/components/CampaignVisitTracker';

interface DescubraPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const metadata = {
    title: 'MimoChat | Conversas Privadas com Criadoras Reais',
    description: 'Converse diretamente com criadoras verificadas. Mensagens, fotos e áudios exclusivos com total discrição no Pix.',
};

export default async function DescubraPage({ searchParams }: DescubraPageProps) {
    const resolvedParams = await searchParams;

    const clickId = typeof resolvedParams.click_id === 'string' ? resolvedParams.click_id : undefined;
    const site = typeof resolvedParams.site === 'string' ? resolvedParams.site : undefined;
    const zone = typeof resolvedParams.zone === 'string' ? resolvedParams.zone : undefined;
    const creative = typeof resolvedParams.creative === 'string' ? resolvedParams.creative : undefined;
    const variation = typeof resolvedParams.variation === 'string' ? resolvedParams.variation : undefined;
    const utm = Object.fromEntries(
        Object.entries(resolvedParams).filter(
            ([key, value]) => key.startsWith('utm_') && typeof value === 'string'
        ) as Array<[string, string]>
    );

    return (
        <>
            <CampaignVisitTracker
                slug="descubra"
                clickId={clickId}
                site={site}
                zone={zone}
                creative={creative}
                variation={variation}
                utm={utm}
            />
            <SimulationLanding
                authRedirectUrl="/login"
                ctaTrackingAttr={true}
            />
        </>
    );
}
