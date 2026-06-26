import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Resend } from 'resend';
import { getCreatorLandingProfileRole } from '@/lib/profileRole';

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
        const name = [first_name, last_name].filter(Boolean).join(' ') || generatedUsername;
        const email = email_addresses[0]?.email_address?.toLowerCase()?.trim();

        const roleMetadata = getCreatorLandingProfileRole(unsafe_metadata);
        const isProfessional = roleMetadata === 'professional' ? true : (roleMetadata === 'client' ? false : undefined);
        const professionalStatus = null; // Inicializa como null (verificação de identidade pendente de envio)

        const updateSet: any = {
            email: email_addresses[0]?.email_address,
            username: generatedUsername,
            name,
            professionalStatus,
            ...(image_url ? { photoUrl: image_url } : {}),
        };
        if (isProfessional !== undefined) {
            updateSet.isProfessional = isProfessional;
        }

        await User.findOneAndUpdate(
            { clerkId: id },
            {
                $set: updateSet,
                $setOnInsert: {
                    balance: 0, 
                    chargePerCharSubscribers: 0.002,
                    chargePerCharNonSubscribers: 0.005,
                }
            },
            { upsert: true, new: true }
        );

        console.log(`✅ Clerk Webhook: User created: ${generatedUsername} (Professional: ${isProfessional}, Status: ${professionalStatus})`);

        // Envio de e-mail de notificação para o admin desativado conforme solicitado
    }

    if (eventType === 'user.updated') {
        const { id, email_addresses, username, first_name, last_name, image_url, unsafe_metadata } = evt.data;

        const name = [first_name, last_name].filter(Boolean).join(' ') || undefined;
        const explicitRole = getCreatorLandingProfileRole(unsafe_metadata);
        const isProfessional = explicitRole === 'professional';

        const updateData: any = {
            email: email_addresses[0]?.email_address,
            username: username,
            ...(name ? { name } : {}),
            ...(image_url ? { photoUrl: image_url } : {}),
        };

        const currentUser = await User.findOne({ clerkId: id });
        if (currentUser) {

            if (isProfessional && !currentUser.isProfessional) {
                updateData.isProfessional = true;
                updateData.professionalStatus = null;

                // Envio de e-mail de notificação para o admin desativado conforme solicitado
            }
        }

        await User.findOneAndUpdate(
            { clerkId: id },
            { $set: updateData }
        );

        console.log(`✅ Clerk Webhook: User updated: ${id} (Professional: ${isProfessional})`);
    }

    if (eventType === 'user.deleted') {
        const { id } = evt.data;
        await User.findOneAndDelete({ clerkId: id });
        console.log(`✅ Clerk Webhook: User deleted: ${id}`);
    }

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
}
