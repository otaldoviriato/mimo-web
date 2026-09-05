import { User } from '@/models/User';

export interface UserEffectiveBalance {
    totalBalance: number;
    cashBalance: number;
    promotionalBalance: number;
    isMigrated: boolean;
}

/**
 * Calcula o saldo efetivo canônico do usuário considerando se a conta
 * já foi migrada para a arquitetura de carteiras do marketplace ou se ainda usa o modelo legado.
 */
export function getUserEffectiveBalance(user: {
    isProfessional?: boolean;
    balance?: number | null;
    promotionalBalance?: number | null;
    customerCashAvailableCents?: number | null;
    customerPromoAvailableCents?: number | null;
    professionalAvailableCents?: number | null;
    marketplaceWalletMigratedAt?: Date | string | null;
} | null | undefined): UserEffectiveBalance {
    if (!user) {
        return {
            totalBalance: 0,
            cashBalance: 0,
            promotionalBalance: 0,
            isMigrated: false,
        };
    }

    const isMigrated = Boolean(user.marketplaceWalletMigratedAt);

    if (isMigrated) {
        if (user.isProfessional) {
            const proAvailable = Math.max(0, Math.round(Number(user.professionalAvailableCents) || 0));
            return {
                totalBalance: proAvailable,
                cashBalance: proAvailable,
                promotionalBalance: 0,
                isMigrated: true,
            };
        }

        const cash = Math.max(0, Math.round(Number(user.customerCashAvailableCents) || 0));
        const promo = Math.max(0, Math.round(Number(user.customerPromoAvailableCents) || 0));
        return {
            totalBalance: cash + promo,
            cashBalance: cash,
            promotionalBalance: promo,
            isMigrated: true,
        };
    }

    const legacyTotal = Math.max(0, Math.round(Number(user.balance) || 0));
    const rawPromo = Math.max(0, Math.round(Number(user.promotionalBalance) || 0));
    const legacyPromo = Math.min(legacyTotal, rawPromo);
    const legacyCash = Math.max(0, legacyTotal - legacyPromo);

    return {
        totalBalance: legacyTotal,
        cashBalance: legacyCash,
        promotionalBalance: legacyPromo,
        isMigrated: false,
    };
}

/**
 * Realiza a auto-cura atômica do saldo legado (balance e promotionalBalance)
 * caso haja divergência em relação ao saldo da nova carteira do marketplace.
 * NUNCA salva o documento inteiro (usa $set pontual).
 */
export async function autoHealUserBalanceIfDivergent(user: any): Promise<UserEffectiveBalance> {
    const effective = getUserEffectiveBalance(user);

    if (!user || !effective.isMigrated) {
        return effective;
    }

    const currentLegacyBalance = Math.round(Number(user.balance) || 0);
    const currentLegacyPromo = Math.round(Number(user.promotionalBalance) || 0);

    if (currentLegacyBalance !== effective.totalBalance || currentLegacyPromo !== effective.promotionalBalance) {
        try {
            await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        balance: effective.totalBalance,
                        promotionalBalance: effective.promotionalBalance,
                    },
                }
            );
            user.balance = effective.totalBalance;
            user.promotionalBalance = effective.promotionalBalance;
        } catch (err) {
            console.error('[WALLET_AUTO_HEAL] Falha ao auto-curar saldo legado:', err);
        }
    }

    return effective;
}
