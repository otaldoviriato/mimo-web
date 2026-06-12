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

// GET /api/admin/outbox - Retorna o histórico de e-mails enviados (Caixa de Saída)
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

        // Buscar lista de e-mails institucionais
        const settings = await AppSettings.findOne({ key: 'global' });
        const institutionalEmails = settings?.institutionalEmails || ['viriatoceo@mimochat.com.br'];
        
        const ourEmails = ['suporte@mimochat.com.br', ...institutionalEmails.map(e => e.toLowerCase().trim())];

        // Buscar e-mails salvos como caixa de saída (marcados com isOutbox: true ou pelo legado notes='__outbox__')
        const messages = await HelpTicket.find({
            $or: [
                { isOutbox: true },
                { notes: '__outbox__' }
            ]
        }).sort({ createdAt: -1 }).lean();

        return NextResponse.json({ success: true, messages });
    } catch (error: any) {
        console.error('Erro na API de Caixa de Saída (GET):', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
