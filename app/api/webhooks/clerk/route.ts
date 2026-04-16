import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';

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
        const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;

        const generatedUsername = username || email_addresses[0]?.email_address.split('@')[0];
        const name = [first_name, last_name].filter(Boolean).join(' ') || generatedUsername;

        await User.findOneAndUpdate(
            { clerkId: id },
            {
                $set: {
                    email: email_addresses[0]?.email_address,
                    username: generatedUsername,
                    name,
                    ...(image_url ? { photoUrl: image_url } : {}),
                },
                $setOnInsert: {
                    balance: 1000, // R$ 10,00 de bônus inicial (armazenado em representação decimal ou conforme schema)
                    chargeMode: false,
                    chargePerChar: 0.002,
                }
            },
            { upsert: true, new: true }
        );

        console.log(`✅ Clerk Webhook: User created: ${generatedUsername}`);
    }

    if (eventType === 'user.updated') {
        const { id, email_addresses, username, first_name, last_name, image_url } = evt.data;

        const name = [first_name, last_name].filter(Boolean).join(' ') || undefined;

        await User.findOneAndUpdate(
            { clerkId: id },
            {
                $set: {
                    email: email_addresses[0]?.email_address,
                    username: username,
                    ...(name ? { name } : {}),
                    ...(image_url ? { photoUrl: image_url } : {}),
                },
            }
        );

        console.log(`✅ Clerk Webhook: User updated: ${id}`);
    }

    if (eventType === 'user.deleted') {
        const { id } = evt.data;
        await User.findOneAndDelete({ clerkId: id });
        console.log(`✅ Clerk Webhook: User deleted: ${id}`);
    }

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
}
