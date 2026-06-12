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

// GET /api/admin/help-tickets - Listagem de tickets com suporte a busca e filtros
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

        // Parâmetros da busca
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('q') || '';
        const status = searchParams.get('status') || '';
        const isFavorite = searchParams.get('favorite');
        const isRead = searchParams.get('read');

        // Construção do objeto de query do Mongoose - Apenas tickets destinados ao suporte
        const query: any = { recipientEmail: 'suporte@mimochat.com.br' };

        // Filtro de status
        if (status && ['novo', 'em_atendimento', 'lido', 'resolvido', 'arquivado'].includes(status)) {
            query.status = status;
        }

        // Filtro de favoritos
        if (isFavorite === 'true') {
            query.isFavorite = true;
        } else if (isFavorite === 'false') {
            query.isFavorite = false;
        }

        // Filtro de lidos/não lidos
        if (isRead === 'true') {
            query.isRead = true;
        } else if (isRead === 'false') {
            query.isRead = false;
        }

        // Filtro por texto (busca no remetente, assunto ou mensagem)
        if (search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.$or = [
                { senderEmail: searchRegex },
                { senderName: searchRegex },
                { subject: searchRegex },
                { message: searchRegex }
            ];
        }

        // Buscar tickets ordenados por data de criação descrescente (mais recentes primeiro)
        const tickets = await HelpTicket.find(query).sort({ createdAt: -1 }).lean();

        return NextResponse.json({ success: true, tickets });
    } catch (error: any) {
        console.error('Erro na API administrativa de listagem de tickets (GET):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
