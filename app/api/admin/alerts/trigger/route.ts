import { NextRequest, NextResponse } from 'next/server';
import { sendAdminAlert } from '@/lib/adminAlerts';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, payload, secret } = body;

        // Validação simples de segurança interna
        const expectedSecret = process.env.INTERNAL_API_SECRET || 'mimo_internal_secret_2026';
        if (secret && secret !== expectedSecret) {
            return NextResponse.json({ error: 'Secret de segurança inválido' }, { status: 401 });
        }

        if (!type || !payload || !payload.title || !payload.body) {
            return NextResponse.json({ error: 'Parâmetros type e payload (com title e body) são obrigatórios.' }, { status: 400 });
        }

        await sendAdminAlert(type, payload);

        return NextResponse.json({ success: true, message: `Alerta "${type}" processado.` });
    } catch (error: any) {
        console.error('[POST /api/admin/alerts/trigger] Erro ao disparar alerta:', error);
        return NextResponse.json({ error: 'Erro interno ao processar alerta.' }, { status: 500 });
    }
}
