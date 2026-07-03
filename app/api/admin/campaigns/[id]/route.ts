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

// PUT /api/admin/campaigns/[id] - Atualizar campanha por ID
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        await connectToDatabase();
        if (!(await isUserAdmin(userId))) {
            return NextResponse.json({ error: 'Acesso proibido. Apenas administradores.' }, { status: 403 });
        }

        const {
            name,
            enabled,
            amount,
            validityHours,
            startsAt,
            endsAt,
            maxTotalUsers,
            limitByCpf,
            limitByEmail,
            limitByPhone,
            limitByIp,
            appMessageTitle,
            appMessageDescription,
            balanceLabel,
        } = body;

        // Se estiver ativando esta campanha, desativa qualquer outra do mesmo tipo (welcome_credit)
        if (enabled === true) {
            const campaignToEnable = await CreditCampaign.findById(id);
            if (campaignToEnable) {
                await CreditCampaign.updateMany(
                    { _id: { $ne: id }, type: campaignToEnable.type },
                    { $set: { enabled: false } }
                );
            }
        }

        const updatedCampaign = await CreditCampaign.findByIdAndUpdate(
            id,
            {
                $set: {
                    name,
                    enabled,
                    amount,
                    validityHours,
                    startsAt: startsAt ? new Date(startsAt) : undefined,
                    endsAt: endsAt ? new Date(endsAt) : null,
                    maxTotalUsers: maxTotalUsers !== undefined ? maxTotalUsers : null,
                    limitByCpf,
                    limitByEmail,
                    limitByPhone,
                    limitByIp,
                    appMessageTitle,
                    appMessageDescription,
                    balanceLabel,
                }
            },
            { new: true }
        );

        if (!updatedCampaign) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
        }

        console.info(`[ADMIN_AUDIT] Admin ${userId} atualizou a campanha de crédito ${name} (ID: ${id}). Ativa: ${enabled}. Valor: R$ ${(amount / 100).toFixed(2)}`);

        return NextResponse.json({ success: true, campaign: updatedCampaign });
    } catch (error) {
        console.error('Erro ao atualizar campanha no admin:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
