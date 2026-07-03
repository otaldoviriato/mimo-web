import { connectToDatabase } from './db';
import { CreditCampaign } from '@/models/CreditCampaign';
import { CreditGrant } from '@/models/CreditGrant';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';

export async function grantWelcomeCredit(
    userId: string,
    email: string,
    ip?: string,
    phone?: string,
    cpf?: string
): Promise<{ success: boolean; amount?: number; grantId?: string; reason?: string; error?: string }> {
    await connectToDatabase();

    // 1. Busca a campanha ativa do tipo welcome_credit
    const campaign = await CreditCampaign.findOne({
        type: 'welcome_credit',
        enabled: true,
        startsAt: { $lte: new Date() },
        $or: [
            { endsAt: null },
            { endsAt: { $gte: new Date() } }
        ]
    });

    if (!campaign) {
        console.log(`[Campaign] Nenhuma campanha de boas-vindas ativa encontrada.`);
        return { success: false, reason: 'no_active_campaign' };
    }

    // 2. Valida o tipo do usuário (somente cliente pode receber)
    const user = await User.findOne({ clerkId: userId }).select('isProfessional onboardingStep email phone taxId name balance promotionalBalance');
    if (!user) {
        return { success: false, reason: 'user_not_found' };
    }

    if (user.isProfessional === true) {
        return { success: false, reason: 'user_is_professional' };
    }

    // Só concede o crédito se o usuário tiver concluído o onboarding
    const isCompleted = user.onboardingStep === 'completed' || (user.name && user.isProfessional !== undefined && !user.onboardingStep);
    if (!isCompleted) {
        return { success: false, reason: 'onboarding_not_completed' };
    }

    // Só concede o crédito se o usuário tiver saldo zero (tanto real quanto promocional)
    const hasZeroBalance = (user.balance || 0) === 0 && (user.promotionalBalance || 0) === 0;
    if (!hasZeroBalance) {
        return { success: false, reason: 'has_existing_balance' };
    }

    // Só concede o crédito se o usuário nunca tiver efetuado recargas pagas no sistema
    const hasPriorRecharges = await Transaction.findOne({
        userId,
        source: 'recharge',
        type: 'credit'
    }).select('_id');
    if (hasPriorRecharges) {
        return { success: false, reason: 'has_prior_recharges' };
    }

    // 3. Valida se já atingiu o limite maxTotalUsers da campanha
    if (campaign.maxTotalUsers !== null && campaign.maxTotalUsers !== undefined) {
        const totalGrants = await CreditGrant.countDocuments({ campaignId: campaign._id });
        if (totalGrants >= campaign.maxTotalUsers) {
            console.log(`[Campaign] Campanha ${campaign.name} atingiu o limite de usos (${campaign.maxTotalUsers}).`);
            return { success: false, reason: 'campaign_exhausted' };
        }
    }

    // 4. Valida se o usuário já recebeu (idempotência a nível lógico)
    const existingGrant = await CreditGrant.findOne({ campaignId: campaign._id, userId });
    if (existingGrant) {
        return { success: false, reason: 'already_granted' };
    }

    // 5. Validações Antifraude (CPF, E-mail, Telefone, IP)
    const metadataEmail = email || user.email;
    const metadataPhone = phone || user.phone;
    const metadataCpf = cpf || user.taxId;

    if (campaign.limitByEmail && metadataEmail) {
        const emailExists = await CreditGrant.findOne({
            campaignId: campaign._id,
            'metadata.email': metadataEmail.toLowerCase().trim()
        });
        if (emailExists) return { success: false, reason: 'limit_by_email' };
    }

    if (campaign.limitByPhone && metadataPhone) {
        const phoneExists = await CreditGrant.findOne({
            campaignId: campaign._id,
            'metadata.phone': metadataPhone
        });
        if (phoneExists) return { success: false, reason: 'limit_by_phone' };
    }

    if (campaign.limitByCpf && metadataCpf) {
        const cpfExists = await CreditGrant.findOne({
            campaignId: campaign._id,
            'metadata.cpf': metadataCpf
        });
        if (cpfExists) return { success: false, reason: 'limit_by_cpf' };
    }

    if (campaign.limitByIp && ip) {
        const ipExists = await CreditGrant.findOne({
            campaignId: campaign._id,
            firstIp: ip
        });
        if (ipExists) return { success: false, reason: 'limit_by_ip' };
    }

    // 6. Concede o crédito
    const amount = campaign.amount;
    let expiresAt: Date | null = null;
    if (campaign.validityHours) {
        expiresAt = new Date(Date.now() + campaign.validityHours * 60 * 60 * 1000);
    }

    try {
        // Cria o registro da concessão (a chave composta única [campaignId, userId] garante idempotência no MongoDB)
        const grant = await CreditGrant.create({
            campaignId: campaign._id,
            userId,
            amountGranted: amount,
            amountUsed: 0,
            amountRemaining: amount,
            status: 'active',
            grantedAt: new Date(),
            expiresAt,
            firstIp: ip || '',
            metadata: {
                email: metadataEmail ? metadataEmail.toLowerCase().trim() : '',
                phone: metadataPhone || '',
                cpf: metadataCpf || '',
            },
            noticeShown: false,
        });

        // Incrementa o saldo do usuário (balance e promotionalBalance)
        await User.updateOne(
            { clerkId: userId },
            {
                $inc: {
                    balance: amount,
                    promotionalBalance: amount
                }
            }
        );

        // Registra transação e microtransação
        await Transaction.create({
            userId,
            amount,
            status: 'PAID',
            type: 'promotional_credit_grant',
            source: 'campaign',
            campaignId: campaign._id.toString(),
            creditGrantId: grant._id.toString(),
            withdrawable: false,
            timestamp: new Date(),
            metadata: {
                campaignName: campaign.name,
                balanceLabel: campaign.balanceLabel
            }
        });

        await MicroTransaction.create({
            userId,
            amount,
            type: 'promotional_credit_grant',
            source: 'campaign',
            campaignId: campaign._id.toString(),
            creditGrantId: grant._id.toString(),
            withdrawable: false,
            timestamp: new Date(),
            metadata: {
                campaignName: campaign.name,
                balanceLabel: campaign.balanceLabel
            }
        });

        console.log(`[Campaign] Crédito de Boas-vindas de R$ ${(amount / 100).toFixed(2)} concedido para o usuário ${userId}`);
        return { success: true, amount, grantId: grant._id.toString() };
    } catch (err: any) {
        if (err.code === 11000) {
            console.log(`[Campaign] Concessão duplicada evitada por chave única do banco para o usuário ${userId}`);
            return { success: false, reason: 'already_granted' };
        }
        console.error(`[Campaign] Erro ao conceder crédito:`, err);
        return { success: false, reason: 'error', error: err.message };
    }
}
