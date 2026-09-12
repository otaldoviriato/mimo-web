import { connectToDatabase } from './db';
import { CreditCampaign } from '@/models/CreditCampaign';
import { CreditGrant } from '@/models/CreditGrant';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { AppSettings } from '@/models/AppSettings';
import { isOnboardingCompleted } from '@/lib/onboarding';

export async function grantWelcomeCredit(
    userId: string,
    email: string,
    ip?: string,
    phone?: string,
    cpf?: string,
    campaignParams?: Record<string, string> | null
): Promise<{ success: boolean; amount?: number; grantId?: string; reason?: string; error?: string }> {
    await connectToDatabase();

    // 1. Busca configurações ativas de boas-vindas no AppSettings
    const settings = await AppSettings.findOne({ key: 'global' }).lean();
    const isPromoEnabled = settings?.welcomeBonusEnabled ?? false;

    let campaign = await CreditCampaign.findOne({
        type: 'welcome_credit',
        $or: [
            { endsAt: null },
            { endsAt: { $gte: new Date() } }
        ]
    });

    // Se nem o AppSettings nem o CreditCampaign estiverem ativados, encerra
    if (!isPromoEnabled && (!campaign || !campaign.enabled)) {
        console.log(`[Campaign] Nenhuma campanha de boas-vindas ativa encontrada.`);
        return { success: false, reason: 'no_active_campaign' };
    }

    const bonusAmountCents = isPromoEnabled
        ? (settings?.welcomeBonusAmountCents ?? 300)
        : (campaign?.amount ?? 300);

    // 2. Validação do tipo do usuário (somente cliente pode receber)
    const user = await User.findOne({ clerkId: userId }).select('isProfessional onboardingStep email phone taxId birthDate name username photoUrl balance promotionalBalance');
    if (!user) {
        return { success: false, reason: 'user_not_found' };
    }

    if (user.isProfessional === true) {
        return { success: false, reason: 'user_is_professional' };
    }

    // Só concede o crédito se o usuário tiver concluído o onboarding
    const isCompleted = isOnboardingCompleted(user);
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

    // Sincroniza ou cria registro de CreditCampaign
    if (!campaign) {
        campaign = await CreditCampaign.create({
            name: 'Bônus de Boas-Vindas Campanha',
            type: 'welcome_credit',
            enabled: isPromoEnabled,
            amount: bonusAmountCents,
            limitByIp: settings?.welcomeBonusLimitByIp ?? true,
            limitByEmail: true,
            limitByCpf: false,
            limitByPhone: false,
            appMessageTitle: 'Bônus de Boas-Vindas',
            appMessageDescription: `Você recebeu R$ ${(bonusAmountCents / 100).toFixed(2)} de saldo de boas-vindas!`,
            balanceLabel: 'Bônus de Boas-Vindas',
            startsAt: new Date(),
        });
    } else if (isPromoEnabled && (campaign.amount !== bonusAmountCents || !campaign.enabled)) {
        await CreditCampaign.updateOne(
            { _id: campaign._id },
            { $set: { amount: bonusAmountCents, enabled: true } }
        );
        campaign.amount = bonusAmountCents;
        campaign.enabled = true;
    }

    // 4. Validação de idempotência por usuário (apenas 1 concessão por usuário)
    const existingGrant = await CreditGrant.findOne({ userId });
    if (existingGrant) {
        return { success: false, reason: 'already_granted' };
    }

    // 5. Validações Antifraude (IP, Email, Telefone, CPF)
    const shouldLimitByIp = isPromoEnabled ? (settings?.welcomeBonusLimitByIp !== false) : campaign.limitByIp;
    if (shouldLimitByIp && ip) {
        const ipExists = await CreditGrant.findOne({
            firstIp: ip
        });
        if (ipExists) {
            console.log(`[Campaign] Bônus rejeitado: IP ${ip} já utilizado para concessão.`);
            return { success: false, reason: 'limit_by_ip' };
        }
    }

    const metadataEmail = email || user.email;
    const metadataPhone = phone || user.phone;
    const metadataCpf = cpf || user.taxId;

    if (campaign.limitByEmail && metadataEmail) {
        const emailExists = await CreditGrant.findOne({
            'metadata.email': metadataEmail.toLowerCase().trim()
        });
        if (emailExists) return { success: false, reason: 'limit_by_email' };
    }

    if (campaign.limitByPhone && metadataPhone) {
        const phoneExists = await CreditGrant.findOne({
            'metadata.phone': metadataPhone
        });
        if (phoneExists) return { success: false, reason: 'limit_by_phone' };
    }

    if (campaign.limitByCpf && metadataCpf) {
        const cpfExists = await CreditGrant.findOne({
            'metadata.cpf': metadataCpf
        });
        if (cpfExists) return { success: false, reason: 'limit_by_cpf' };
    }

    // 6. Concede o crédito
    const amount = bonusAmountCents;
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

        // Incrementa o saldo do usuário (balance e promotionalBalance, e customerPromoAvailableCents se migrado)
        await User.updateOne(
            { clerkId: userId },
            [{
                $set: {
                    balance: { $add: [{ $ifNull: ['$balance', 0] }, amount] },
                    promotionalBalance: { $add: [{ $ifNull: ['$promotionalBalance', 0] }, amount] },
                    customerPromoAvailableCents: {
                        $cond: [
                            { $ne: [{ $type: '$marketplaceWalletMigratedAt' }, 'missing'] },
                            { $add: [{ $ifNull: ['$customerPromoAvailableCents', 0] }, amount] },
                            '$customerPromoAvailableCents',
                        ],
                    },
                },
            }]
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
