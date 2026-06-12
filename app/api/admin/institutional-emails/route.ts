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

// GET /api/admin/institutional-emails - Obtém e-mails cadastrados e mensagens recebidas
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

        // Buscar parâmetros de filtro
        const { searchParams } = new URL(request.url);
        const filterEmail = searchParams.get('email') || '';
        const search = searchParams.get('q') || '';
        const status = searchParams.get('status') || '';

        // Construir a query
        const query: any = {
            recipientEmail: { $ne: 'suporte@mimochat.com.br' } // Excluir tickets de suporte
        };

        // Filtrar por um e-mail institucional específico cadastrado
        if (filterEmail.trim()) {
            query.recipientEmail = filterEmail.trim().toLowerCase();
        }

        // Filtro de status
        if (status && ['novo', 'em_atendimento', 'lido', 'resolvido', 'arquivado'].includes(status)) {
            query.status = status;
        }

        // Filtro de texto (busca no remetente, assunto ou mensagem)
        if (search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.$or = [
                { senderEmail: searchRegex },
                { senderName: searchRegex },
                { subject: searchRegex },
                { message: searchRegex }
            ];
        }

        // Buscar as mensagens recebidas ordenadas pelas mais recentes
        const messages = await HelpTicket.find(query).sort({ createdAt: -1 }).lean();

        return NextResponse.json({
            success: true,
            emails: institutionalEmails,
            redirections: settings?.emailRedirections || [],
            messages
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
        const { email } = body;

        if (!email || !email.trim()) {
            return NextResponse.json({ error: 'O e-mail é obrigatório.' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();

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

        const forwardingEmail = body.forwardingEmail;

        if (!settings.institutionalEmails.includes(cleanEmail)) {
            settings.institutionalEmails.push(cleanEmail);
        }

        // Atualizar redirecionamento correspondente
        settings.emailRedirections = settings.emailRedirections.filter(r => r.sourceEmail !== cleanEmail);
        if (forwardingEmail && forwardingEmail.trim()) {
            settings.emailRedirections.push({
                sourceEmail: cleanEmail,
                targetEmail: forwardingEmail.trim().toLowerCase()
            });
        }

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
