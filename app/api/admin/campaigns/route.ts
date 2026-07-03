import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/db';
import { CreditCampaign } from '@/models/CreditCampaign';
import { AppSettings } from '@/models/AppSettings';

const FALLBACK_ADMIN = 'user_39WqqlzJvRKuC6Xhp9ToiGmBFNM';

async function isUserAdmin(userId: string) {
    const settings = await AppSettings.findOne({ key: 'global' });
    return settings?.adminClerkIds.includes(userId) || userId === FALLBACK_ADMIN;
}

// GET /api/admin/campaigns - Listar todas as campanhas (com seed da de boas-vindas se não houver)
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        await connectToDatabase();
        if (!(await isUserAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        let campaigns = await CreditCampaign.find({}).sort({ createdAt: -1 });

        // Seed automático do Crédito de Boas-vindas caso a coleção esteja vazia
        if (campaigns.length === 0) {
            const defaultCampaign = await CreditCampaign.create({
                name: 'Crédito de Boas-vindas',
                type: 'welcome_credit',
                enabled: false,
                amount: 500, // R$ 5,00 em centavos
                targetAudience: 'client',
                validityHours: 72, // 3 dias
                startsAt: new Date(),
                endsAt: null,
                maxTotalUsers: null,
                limitByCpf: true,
                limitByEmail: true,
                limitByPhone: true,
                limitByIp: true,
                appMessageTitle: 'Crédito de boas-vindas liberado!',
                appMessageDescription: 'Você recebeu R$ 5,00 em créditos de boas-vindas para começar suas conversas.',
                balanceLabel: 'Crédito de boas-vindas',
            });
            campaigns = [defaultCampaign];
        }

        return NextResponse.json({ campaigns });
    } catch (error) {
        console.error('Erro ao listar campanhas no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
