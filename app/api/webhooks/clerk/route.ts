import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Resend } from 'resend';
import { grantWelcomeCredit } from '@/lib/creditCampaign';
import { Campaign } from '@/models/Campaign';
import { CampaignVisit } from '@/models/CampaignVisit';

import { RECEIPT_TERMS_VERSION } from '@/lib/receiptBilling';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
    // Verificar assinatura do webhook do Clerk
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
    }

    if (!webhookSecret) {
        console.error('CLERK_WEBHOOK_SECRET is not defined');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(webhookSecret);

    let evt: any;

    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as any;
    } catch (err) {
        console.error('Error verifying Clerk webhook:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const eventType = evt.type;

    await connectToDatabase();

    // Processar eventos: user.created, user.updated, user.deleted
    if (eventType === 'user.created') {
        const { id, email_addresses, username, first_name, last_name, image_url, unsafe_metadata } = evt.data;

        const generatedUsername = username || email_addresses[0]?.email_address.split('@')[0];
        const name = [first_name, last_name].filter(Boolean).join(' ');
        const email = email_addresses[0]?.email_address?.toLowerCase()?.trim();

        const isProfessional = false;
        const professionalStatus = null; // Inicializa como null (verificação de identidade pendente de envio)

        const updateSet: any = {
            email: email_addresses[0]?.email_address,
            username: generatedUsername,
            name,
            professionalStatus,
            ...(image_url ? { photoUrl: image_url } : {}),
        };
        updateSet.isProfessional = isProfessional;
        await User.findOneAndUpdate(
            { clerkId: id },
            {
                $set: updateSet,
                $setOnInsert: {
                    balance: 0,
                    promotionalBalance: 0,
                    customerCashAvailableCents: 0,
                    customerPromoAvailableCents: 0,
                    professionalPendingCents: 0,
                    professionalAvailableCents: 0,
                    professionalReservedForWithdrawalCents: 0,
                    marketplaceWalletMigratedAt: new Date(),
                    receiptTermsVersion: RECEIPT_TERMS_VERSION,
                    receiptTermsAcceptedAt: new Date(),
                }
            },
            { upsert: true, new: true }
        );

        const attribution = unsafe_metadata?.mimoCampaign;
        if (attribution?.slug && attribution?.visitorId) {
            const campaign = await Campaign.findOne({ slug: String(attribution.slug).toLowerCase() }).select('_id').lean();
            if (campaign) {
                await CampaignVisit.updateOne(
                    { campaignId: campaign._id, visitorId: String(attribution.visitorId) },
                    { $set: { userId: id, signupCompletedAt: new Date() } },
                );
            }
        }

        console.log(`✅ Clerk Webhook: User created: ${generatedUsername} (Professional: ${isProfessional}, Status: ${professionalStatus})`);

        // Se o usuário não for profissional (ou seja, for cliente), concede o crédito de boas-vindas
        if (isProfessional === false) {
            try {
                const reqHeaders = await headers();
                const ip = reqHeaders.get('x-forwarded-for')?.split(',')[0].trim() || undefined;
                await grantWelcomeCredit(id, email, ip, undefined, undefined);
            } catch (creditErr) {
                console.error('Erro ao conceder crédito de boas-vindas no webhook do Clerk:', creditErr);
            }
        }

        // Envio de e-mail de notificação para o admin desativado conforme solicitado
    }

    if (eventType === 'user.updated') {
        const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;

        const name = [first_name, last_name].filter(Boolean).join(' ') || undefined;
        const updateData: any = {
            email: email_addresses[0]?.email_address,
            username: username,
            ...(name ? { name } : {}),
            ...(image_url ? { photoUrl: image_url } : {}),
        };

        await User.findOneAndUpdate(
            { clerkId: id },
            { $set: updateData }
        );

        console.log(`✅ Clerk Webhook: User updated: ${id}`);
    }

    if (eventType === 'user.deleted') {
        const { id } = evt.data;
        await User.findOneAndUpdate(
            { clerkId: id },
            {
                $set: {
                    isSuspended: true,
                    suspendedAt: new Date(),
                    isOnline: false,
                    fcmToken: '',
                    fcmTokens: [],
                },
            },
        );
        console.log(`✅ Clerk Webhook: User deactivated and retained for audit: ${id}`);
    }

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
}
