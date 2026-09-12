import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { User } from '@/models/User';
import { isStaffOrAdmin } from '@/lib/internalStaff';

export const dynamic = 'force-dynamic';

function sanitizeSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (userId && (await isStaffOrAdmin(userId))) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Administradores e membros da equipe não são rastreados em visitas de campanhas.',
            });
        }

        const body = await request.json();
        const {
            visitorId,
            site,
            creative,
            event,
        } = body;

        if (!visitorId) {
            return NextResponse.json({ error: 'visitorId é obrigatório' }, { status: 400 });
        }

        const utm = (body.utm && typeof body.utm === 'object') ? body.utm : {};
        const utmSource = String(utm.utm_source || body.utm_source || '').trim();
        const utmMedium = String(utm.utm_medium || body.utm_medium || '').trim();
        const utmCampaign = String(utm.utm_campaign || body.utm_campaign || '').trim();
        const utmContent = String(utm.utm_content || body.utm_content || '').trim();
        const zoneId = String(body.zone || body.zone_id || utm.zone_id || '').trim();
        const clickId = String(body.clickId || body.click_id || utm.click_id || '').trim();
        const variationId = String(body.variation || body.variation_id || utmContent || '').trim();
        const rawSlug = String(body.slug || '').trim();

        await connectToDatabase();

        const rawLandingPage = String(body.landingPage || body.pathname || '').trim();
        let cleanLandingPage = rawLandingPage;
        if (!cleanLandingPage) {
            if (rawSlug === 'descubra') cleanLandingPage = '/descubra';
            else if (rawSlug && rawSlug !== 'organico') cleanLandingPage = `/c/${rawSlug}`;
            else cleanLandingPage = '/';
        }
        if (!cleanLandingPage.startsWith('/')) cleanLandingPage = `/${cleanLandingPage}`;
        if (cleanLandingPage.length > 1 && cleanLandingPage.endsWith('/')) {
            cleanLandingPage = cleanLandingPage.slice(0, -1);
        }

        // Determina identificador e nome da campanha priorizando a rota da Landing Page (ponto de entrada)
        let targetSlug = '';
        let campaignName = '';
        let network: 'exoclick' | 'direct' | 'other' = 'direct';

        if (utmSource) {
            const cleanSource = utmSource.toLowerCase();
            if (cleanSource === 'exoclick') network = 'exoclick';
            else if (cleanSource === 'direct' || cleanSource === 'organico') network = 'direct';
            else network = 'other';
        }

        const attributedSlug = rawSlug && !['descubra', 'organico'].includes(rawSlug)
            ? sanitizeSlug(rawSlug)
            : utmCampaign
                ? sanitizeSlug(utmCampaign)
                : '';

        if (attributedSlug) {
            targetSlug = attributedSlug;
            campaignName = utmCampaign
                ? `Campanha: ${utmCampaign}`
                : `Campanha: ${rawSlug}`;
        } else if (cleanLandingPage === '/descubra' || rawSlug === 'descubra') {
            targetSlug = 'descubra';
            campaignName = 'Landing Page: /descubra';
        } else if (cleanLandingPage.startsWith('/c/')) {
            const slugPart = cleanLandingPage.replace('/c/', '');
            targetSlug = sanitizeSlug(slugPart || rawSlug);
            campaignName = `Landing Page: /c/${targetSlug}`;
        } else if (rawSlug && rawSlug !== 'descubra' && rawSlug !== 'organico') {
            targetSlug = sanitizeSlug(rawSlug);
            campaignName = `Landing Page: /c/${targetSlug}`;
            if (!rawLandingPage) cleanLandingPage = `/c/${targetSlug}`;
        } else if (cleanLandingPage !== '/') {
            targetSlug = sanitizeSlug(cleanLandingPage.replace(/^\//, ''));
            campaignName = `Ponto de Entrada: ${cleanLandingPage}`;
        } else if (utmCampaign || utmSource) {
            targetSlug = sanitizeSlug(`${utmSource || 'campanha'}-${utmCampaign || 'utm'}`);
            campaignName = `Origem: ${utmSource?.toUpperCase() || 'UTM'}${utmCampaign ? ' - ' + utmCampaign : ''}`;
        } else {
            targetSlug = 'organico';
            campaignName = 'Direto / Orgânico';
            network = 'direct';
        }

        if (!targetSlug) {
            targetSlug = 'organico';
            campaignName = 'Direto / Orgânico';
            network = 'direct';
        }

        const normalizedLanding = cleanLandingPage.replace(/^\//, '').replace(/\/$/, '').toLowerCase();

        // 1. Localiza campanhas em status 'tracking' (rastreamento temporal ativo)
        const trackingCampaigns = await Campaign.find({ status: 'tracking' }).sort({ startedAt: -1 });

        let campaign: any = trackingCampaigns.find(c => {
            const ep = String(c.entryPoint || '').trim().replace(/^\//, '').replace(/\/$/, '').toLowerCase();
            return ep === normalizedLanding || (normalizedLanding === 'descubra' && (!ep || ep === 'descubra'));
        });

        // Se houver campanha em tracking ativa e a rota for /descubra, vincula à campanha em tracking
        if (!campaign && normalizedLanding === 'descubra' && trackingCampaigns.length > 0) {
            campaign = trackingCampaigns[0];
        }

        // Se não houver campanha em rastreamento temporal para esta rota, busca por slug específico ou UTM
        if (!campaign) {
            if (targetSlug && targetSlug !== 'organico') {
                campaign = await Campaign.findOne({ slug: targetSlug });
            }
            if (!campaign && utmCampaign) {
                campaign = await Campaign.findOne({ externalCampaignId: utmCampaign });
            }
        }

        // 2. Se não encontrou nenhuma campanha manual correspondente cadastrada, JAMAIS cria automaticamente
        if (!campaign) {
            return NextResponse.json({
                success: true,
                ignored: true,
                reason: 'Nenhuma campanha manual cadastrada para esta rota',
            });
        }

        // 3. Upsert atômico do registro de visita
        const now = new Date();
        const visitResult: any = await CampaignVisit.findOneAndUpdate(
            { campaignId: campaign._id, visitorId },
            {
                $setOnInsert: {
                    landingViewedAt: now,
                    clickId: clickId || null,
                    site: site || null,
                    zone: zoneId || null,
                    creative: creative || null,
                    variation: variationId || null,
                    landingPage: cleanLandingPage,
                    utm: {
                        ...(utmSource ? { utm_source: utmSource } : {}),
                        ...(utmMedium ? { utm_medium: utmMedium } : {}),
                        ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
                        ...(utmContent ? { utm_content: utmContent } : {}),
                        ...(zoneId ? { zone_id: zoneId } : {}),
                        ...(clickId ? { click_id: clickId } : {}),
                    },
                    targetProfessionalId: campaign.targetProfessionalId || null,
                },
                ...(event === 'cta_clicked' ? { $set: { ctaClickedAt: now } } : {}),
            },
            { upsert: true, returnDocument: 'after', rawResult: true }
        );

        const isNewVisit = !visitResult?.lastErrorObject?.updatedExisting;
        if (isNewVisit) {
            const actualCount = await CampaignVisit.countDocuments({ campaignId: campaign._id });
            await Campaign.updateOne({ _id: campaign._id }, { $set: { uniqueVisitorsCount: actualCount } });
        }

        const visit = visitResult?.value || visitResult;

        let targetProfessional = null;
        if (campaign.targetProfessionalId) {
            targetProfessional = await User.findOne({ clerkId: campaign.targetProfessionalId })
                .select('clerkId username name photoUrl coverUrl bio')
                .lean();
        }

        return NextResponse.json({
            success: true,
            campaign: {
                _id: campaign._id,
                name: campaign.name,
                slug: campaign.slug,
                status: campaign.status,
                network: campaign.network,
                landingHeadline: campaign.landingHeadline,
                landingBody: campaign.landingBody,
                landingImageUrl: campaign.landingImageUrl,
                internalDestination: campaign.internalDestination,
                targetProfessionalId: campaign.targetProfessionalId,
            },
            visitId: visit._id,
            targetProfessional,
        });
    } catch (error: unknown) {
        console.error('Erro ao registrar visita de campanha:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
