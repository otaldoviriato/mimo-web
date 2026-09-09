import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';
import { User } from '@/models/User';

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

        // Determina identificador e nome da campanha baseado em UTM ou orgânico
        let targetSlug = '';
        let campaignName = '';
        let network: 'exoclick' | 'direct' | 'other' = 'other';

        if (utmSource || utmCampaign) {
            // Tráfego pago / UTM detectado
            const cleanSource = utmSource.toLowerCase();
            if (cleanSource === 'exoclick') {
                network = 'exoclick';
            } else if (cleanSource === 'direct' || cleanSource === 'organico') {
                network = 'direct';
            } else {
                network = 'other';
            }

            if (utmCampaign) {
                targetSlug = sanitizeSlug(`${cleanSource || 'campanha'}-${utmCampaign}`);
                campaignName = `${cleanSource ? cleanSource.toUpperCase() + ' - ' : ''}${utmCampaign}`;
            } else {
                targetSlug = sanitizeSlug(cleanSource);
                campaignName = `Origem: ${utmSource.toUpperCase()}`;
            }
        } else if (rawSlug && rawSlug !== 'descubra' && rawSlug !== 'organico') {
            // Slug direto de landing page específica (/c/[slug])
            targetSlug = sanitizeSlug(rawSlug);
            campaignName = rawSlug;
            network = 'direct';
        } else {
            // Tráfego orgânico / desconhecido
            targetSlug = 'organico';
            campaignName = 'Orgânico / Desconhecido';
            network = 'direct';
        }

        if (!targetSlug) {
            targetSlug = 'organico';
            campaignName = 'Orgânico / Desconhecido';
            network = 'direct';
        }

        // 1. Procura se já existe a campanha no banco
        let campaign = await Campaign.findOne({
            $or: [
                { slug: targetSlug },
                ...(utmCampaign ? [{ externalCampaignId: utmCampaign }] : []),
                ...(rawSlug ? [{ slug: sanitizeSlug(rawSlug) }] : []),
            ]
        });

        // 2. Se não existir, cria automaticamente
        if (!campaign) {
            try {
                campaign = await Campaign.create({
                    name: campaignName,
                    slug: targetSlug,
                    status: 'active',
                    network,
                    externalCampaignId: utmCampaign || null,
                    externalVariationId: variationId || null,
                    landingHeadline: campaignName,
                    landingBody: 'Campanha detectada automaticamente através de parâmetros de rastreamento.',
                    conversionGoals: ['landing_view', 'cta_click', 'signup', 'explore_profile_view', 'first_message_sent', 'first_message_received', 'first_recharge'],
                    createdBy: 'system_auto_utm',
                });
            } catch (err: any) {
                // Em caso de colisão de índice unique concorrente, busca novamente
                campaign = await Campaign.findOne({ slug: targetSlug });
                if (!campaign) throw err;
            }
        }

        // 3. Upsert do registro de visita
        const now = new Date();
        const visit = await CampaignVisit.findOneAndUpdate(
            { campaignId: campaign._id, visitorId },
            {
                $setOnInsert: {
                    landingViewedAt: now,
                    clickId: clickId || null,
                    site: site || null,
                    zone: zoneId || null,
                    creative: creative || null,
                    variation: variationId || null,
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
            { upsert: true, new: true },
        );

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
    } catch (error: any) {
        console.error('Erro ao registrar visita de campanha:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
