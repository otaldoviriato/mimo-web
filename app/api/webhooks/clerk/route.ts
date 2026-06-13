import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Resend } from 'resend';

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

        const isProfessional = unsafe_metadata?.role === 'professional';
        const professionalStatus = isProfessional ? 'pending' : null;

        await User.findOneAndUpdate(
            { clerkId: id },
            {
                $set: {
                    email: email_addresses[0]?.email_address,
                    username: generatedUsername,
                    name,
                    isProfessional,
                    professionalStatus,
                    ...(image_url ? { photoUrl: image_url } : {}),
                },
                $setOnInsert: {
                    balance: 0, 
                    chargePerCharSubscribers: 0.002,
                    chargePerCharNonSubscribers: 0.005,
                }
            },
            { upsert: true, new: true }
        );

        console.log(`✅ Clerk Webhook: User created: ${generatedUsername} (Professional: ${isProfessional}, Status: ${professionalStatus})`);

        // Enviar email de notificação se for profissional pendente
        if (isProfessional && professionalStatus === 'pending') {
            try {
                const appUrl = process.env.NEXT_PUBLIC_API_URL || 'https://www.mimochat.com.br';
                await resend.emails.send({
                    from: 'Mimo Cadastro <onboarding@resend.dev>',
                    to: 'viriatoceo@gmail.com',
                    subject: `Nova Inscrição de Criadora - @${generatedUsername}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #6d28d9; margin-top: 0;">Nova Criadora Cadastrada</h2>
                            <p style="color: #475569; font-size: 16px;">Uma nova conta de criadora foi criada e está aguardando aprovação.</p>
                            <ul style="background-color: #f8fafc; padding: 15px 25px; border-radius: 6px; list-style-type: none; margin: 20px 0;">
                                <li style="margin-bottom: 8px;"><strong>Nome:</strong> ${name}</li>
                                <li style="margin-bottom: 8px;"><strong>E-mail:</strong> ${email}</li>
                                <li style="margin-bottom: 8px;"><strong>Username:</strong> @${generatedUsername}</li>
                                <li style="margin-bottom: 0;"><strong>Data de Cadastro:</strong> ${new Date().toLocaleString('pt-BR')}</li>
                            </ul>
                            <p style="color: #475569; margin-bottom: 25px;">Acesse o painel do backoffice para avaliar o cadastro.</p>
                            <a href="${appUrl}/admin/creator-applications" style="background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; text-align: center;">Ver Inscrições no Backoffice</a>
                        </div>
                    `
                });
                console.log(`✉️ Email notification sent to admin for pending creator: ${email}`);
            } catch (emailErr) {
                console.error('Erro ao enviar e-mail de notificação para o admin:', emailErr);
            }
        }
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
