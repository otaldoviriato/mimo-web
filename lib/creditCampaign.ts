import { connectToDatabase } from './db';
import { CreditCampaign } from '@/models/CreditCampaign';
import { CreditGrant } from '@/models/CreditGrant';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { MicroTransaction } from '@/models/MicroTransaction';
import { AppSettings } from '@/models/AppSettings';
import { isOnboardingCompleted } from '@/lib/onboarding';
import mongoose, { type ClientSession } from 'mongoose';

export async function grantWelcomeCredit(
    userId: string,
    email: string,
    ip?: string,
    phone?: string,
    cpf?: string,
    campaignParams?: Record<string, string> | null
): Promise<{ success: boolean; amount?: number; grantId?: string; reason?: string; error?: string }> {
    await connectToDatabase();

    try {
        // A concessão só fica visível depois do commit de saldo e lançamentos.
        return await mongoose.connection.transaction(session =>
            grantWelcomeCreditInSession(userId, email, ip, phone, cpf, session)
        );
    } catch (error: unknown) {
        console.error('[Campaign] Falha na concessão atômica de boas-vindas:', error);
        return { success: false, reason: 'error', error: error instanceof Error ? error.message : String(error) };
    }
}

async function grantWelcomeCreditInSession(
    userId: string, email: string, ip: string | undefined,
    phone: string | undefined, cpf: string | undefined, session: ClientSession
): Promise<{ success: boolean; amount?: number; grantId?: string; reason?: string }> {

    // 1. Busca configurações ativas de boas-vindas no AppSettings
    const settings = await AppSettings.findOne({ key: 'global' }).session(session).lean();
    const isPromoEnabled = settings?.welcomeBonusEnabled ?? false;

    let campaign = await CreditCampaign.findOne({
        type: 'welcome_credit',
        $or: [
            { endsAt: null },
            { endsAt: { $gte: new Date() } }
        ]
    }).session(session);

    // Se nem o AppSettings nem o CreditCampaign estiverem ativados, encerra
    if (!isPromoEnabled && (!campaign || !campaign.enabled)) {
        console.log(`[Campaign] Nenhuma campanha de boas-vindas ativa encontrada.`);
        return { success: false, reason: 'no_active_campaign' };
    }

    const bonusAmountCents = isPromoEnabled
        ? (settings?.welcomeBonusAmountCents ?? 300)
        : (campaign?.amount ?? 300);
    if (!Number.isSafeInteger(bonusAmountCents) || bonusAmountCents <= 0) {
        return { success: false, reason: 'invalid_amount' };
    }

    // 2. Validação do tipo do usuário (somente cliente pode receber)
    const user = await User.findOne({ clerkId: userId }).select(
        'isProfessional onboardingStep email phone taxId birthDate name username photoUrl balance promotionalBalance marketplaceWalletMigratedAt customerCashAvailableCents customerPromoAvailableCents'
    ).session(session);
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
    const hasZeroBalance = (user.balance || 0) === 0 && (user.promotionalBalance || 0) === 0
        && (user.customerCashAvailableCents || 0) === 0 && (user.customerPromoAvailableCents || 0) === 0;
    if (!hasZeroBalance) {
        return { success: false, reason: 'has_existing_balance' };
    }

    // Só concede o crédito se o usuário nunca tiver efetuado recargas pagas no sistema
    const hasPriorRecharges = await Transaction.findOne({
        userId,
        source: 'recharge',
        status: 'PAID'
    }).select('_id').session(session);
    if (hasPriorRecharges) {
        return { success: false, reason: 'has_prior_recharges' };
    }

    // Sincroniza ou cria registro de CreditCampaign
    if (!campaign) {
        [campaign] = await CreditCampaign.create([{
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
        }], { session });
    } else if (isPromoEnabled && (campaign.amount !== bonusAmountCents || !campaign.enabled)) {
        await CreditCampaign.updateOne(
            { _id: campaign._id },
            { $set: { amount: bonusAmountCents, enabled: true } },
            { session }
        );
        campaign.amount = bonusAmountCents;
        campaign.enabled = true;
    }

    // 4. Validação de idempotência por usuário (apenas 1 concessão por usuário)
    const existingGrant = await CreditGrant.findOne({ userId }).session(session);
    if (existingGrant) {
        return { success: false, reason: 'already_granted' };
    }

    // 5. Validações Antifraude (IP, Email, Telefone, CPF)
    const shouldLimitByIp = isPromoEnabled ? (settings?.welcomeBonusLimitByIp !== false) : campaign.limitByIp;
    if (shouldLimitByIp && ip) {
        const ipExists = await hasFundedGrant({
            firstIp: ip
        }, session);
        if (ipExists) {
            console.log(`[Campaign] Bônus rejeitado: IP ${ip} já utilizado para concessão.`);
            return { success: false, reason: 'limit_by_ip' };
        }
    }

    const metadataEmail = email || user.email;
    const metadataPhone = phone || user.phone;
    const metadataCpf = cpf || user.taxId;

    if (campaign.limitByEmail && metadataEmail) {
        const emailExists = await hasFundedGrant({
            'metadata.email': metadataEmail.toLowerCase().trim()
        }, session);
        if (emailExists) return { success: false, reason: 'limit_by_email' };
    }

    if (campaign.limitByPhone && metadataPhone) {
        const phoneExists = await hasFundedGrant({
            'metadata.phone': metadataPhone
        }, session);
        if (phoneExists) return { success: false, reason: 'limit_by_phone' };
    }

    if (campaign.limitByCpf && metadataCpf) {
        const cpfExists = await hasFundedGrant({
            'metadata.cpf': metadataCpf
        }, session);
        if (cpfExists) return { success: false, reason: 'limit_by_cpf' };
    }

    // 6. Concede o crédito
    const amount = bonusAmountCents;
    let expiresAt: Date | null = null;
    if (campaign.validityHours) {
        expiresAt = new Date(Date.now() + campaign.validityHours * 60 * 60 * 1000);
    }

    // Cria o registro da concessão (a chave composta única [campaignId, userId] garante idempotência no MongoDB)
    const [grant] = await CreditGrant.create([{
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
        creditedAt: new Date(),
    }], { session });

    // Incrementa o saldo do usuário (balance e promotionalBalance, e customerPromoAvailableCents se migrado)
    const creditedUser = await User.updateOne(
        { clerkId: userId },
        [{
            $set: {
                balance: { $add: [{ $ifNull: ['$balance', 0] }, amount] },
                promotionalBalance: { $add: [{ $ifNull: ['$promotionalBalance', 0] }, amount] },
                customerPromoAvailableCents: {
                    $cond: [
                        { $ne: [{ $ifNull: ['$marketplaceWalletMigratedAt', null] }, null] },
                        { $add: [{ $ifNull: ['$customerPromoAvailableCents', 0] }, amount] },
                        '$customerPromoAvailableCents',
                    ],
                },
            },
        }],
        { session, updatePipeline: true }
    );
    if (creditedUser.matchedCount !== 1) throw new Error('Welcome credit user no longer exists');

    // Registra transação e microtransação
    await Transaction.create([{
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
    }], { session });

    await MicroTransaction.create([{
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
    }], { session });

    console.log(`[Campaign] Crédito de Boas-vindas de R$ ${(amount / 100).toFixed(2)} concedido para o usuário ${userId}`);
    return { success: true, amount, grantId: grant._id.toString() };
}

// Registros antigos podem existir sem crédito efetivado. Só uma concessão
// confirmada ou seu lançamento financeiro deve consumir o limite antifraude.
async function hasFundedGrant(filter: Record<string, unknown>, session: ClientSession) {
    const grants = await CreditGrant.find(filter).select('_id creditedAt').session(session);
    if (grants.some(grant => grant.creditedAt)) return true;
    if (!grants.length) return false;
    return Boolean(await Transaction.exists({
        creditGrantId: { $in: grants.map(grant => grant._id.toString()) },
        type: 'promotional_credit_grant', source: 'campaign', status: 'PAID',
    }).session(session));
}

export async function getWelcomeCreditNotice(userId: string) {
    const grant = await CreditGrant.findOne({ userId, status: 'active', noticeShown: false });
    if (!grant || (grant.expiresAt && grant.expiresAt <= new Date())) return null;
    const funded = grant.creditedAt || await Transaction.exists({
        creditGrantId: grant._id.toString(), userId,
        type: 'promotional_credit_grant', source: 'campaign', status: 'PAID',
    });
    if (!funded) return null;
    return {
        grantId: grant._id.toString(), amount: grant.amountGranted,
        title: 'Você ganhou créditos de presente!',
        description: 'Liberamos créditos na sua carteira para você conversar e conhecer as criadoras agora mesmo.',
    };
}
