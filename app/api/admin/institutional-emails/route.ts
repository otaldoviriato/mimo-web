import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { HelpTicket } from '@/models/HelpTicket';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function checkIsAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' });
    if (!settings) {
        return userId === FALLBACK_ADMIN;
    }
    return settings.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
}

// GET /api/admin/institutional-emails - Obtém e-mails cadastrados
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const isAdmin = await checkIsAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const settings = await AppSettings.findOne({ key: 'global' });
        const institutionalEmails = settings?.institutionalEmails || ['viriatoceo@mimochat.com.br'];

        return NextResponse.json({
            success: true,
            emails: institutionalEmails,
            redirections: settings?.emailRedirections || []
        });
    } catch (error: any) {
        console.error('Erro na API de e-mails institucionais (GET):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// POST /api/admin/institutional-emails - Cadastra um novo e-mail institucional
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const isAdmin = await checkIsAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const body = await request.json();
        const { email, displayName, forwardingEmail } = body;

        if (!email || !email.trim()) {
            return NextResponse.json({ error: 'O e-mail institucional é obrigatório.' }, { status: 400 });
        }

        if (!displayName || !displayName.trim()) {
            return NextResponse.json({ error: 'O nome do remetente é obrigatório.' }, { status: 400 });
        }

        if (!forwardingEmail || !forwardingEmail.trim()) {
            return NextResponse.json({ error: 'O e-mail privado de redirecionamento é obrigatório.' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanForwarding = forwardingEmail.trim().toLowerCase();
        const cleanDisplayName = displayName.trim();

        // Validar se o e-mail pertence ao domínio da Mimo
        if (!cleanEmail.endsWith('@mimochat.com.br') && !cleanEmail.endsWith('@mimochat.com')) {
            return NextResponse.json({ error: 'O e-mail deve pertencer ao domínio @mimochat.com.br ou @mimochat.com' }, { status: 400 });
        }

        // Não permitir cadastrar o e-mail de suporte geral como institucional avulso
        if (cleanEmail === 'suporte@mimochat.com.br') {
            return NextResponse.json({ error: 'O e-mail de suporte já é reservado para os Tickets de Ajuda.' }, { status: 400 });
        }

        const settings = await AppSettings.findOne({ key: 'global' });
        if (!settings) {
            return NextResponse.json({ error: 'Configurações globais não encontradas.' }, { status: 500 });
        }

        if (!settings.institutionalEmails.includes(cleanEmail)) {
            settings.institutionalEmails.push(cleanEmail);
        }

        // Atualizar redirecionamento correspondente
        settings.emailRedirections = settings.emailRedirections.filter(r => r.sourceEmail !== cleanEmail);
        settings.emailRedirections.push({
            sourceEmail: cleanEmail,
            targetEmail: cleanForwarding,
            displayName: cleanDisplayName
        });

        await settings.save();

        return NextResponse.json({
            success: true,
            emails: settings.institutionalEmails,
            redirections: settings.emailRedirections
        });
    } catch (error: any) {
        console.error('Erro na API de e-mails institucionais (POST):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}

// DELETE /api/admin/institutional-emails - Remove um e-mail institucional
export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();

        const isAdmin = await checkIsAdmin(userId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'O e-mail a ser removido é obrigatório.' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();

        const settings = await AppSettings.findOne({ key: 'global' });
        if (!settings) {
            return NextResponse.json({ error: 'Configurações globais não encontradas.' }, { status: 500 });
        }

        // Remover do array
        settings.institutionalEmails = settings.institutionalEmails.filter(e => e !== cleanEmail);
        settings.emailRedirections = settings.emailRedirections.filter(r => r.sourceEmail !== cleanEmail);
        await settings.save();

        return NextResponse.json({
            success: true,
            emails: settings.institutionalEmails,
            redirections: settings.emailRedirections
        });
    } catch (error: any) {
        console.error('Erro na API de e-mails institucionais (DELETE):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
