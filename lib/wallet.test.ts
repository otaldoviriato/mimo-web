import assert from 'node:assert/strict';
import test from 'node:test';
import { getUserEffectiveBalance } from './wallet.js';

test('cliente migrado calcula soma de saldo em dinheiro e promocional', () => {
    const user = {
        isProfessional: false,
        balance: 1000,
        customerCashAvailableCents: 473,
        customerPromoAvailableCents: 50,
        marketplaceWalletMigratedAt: new Date(),
    };

    const effective = getUserEffectiveBalance(user);
    assert.equal(effective.totalBalance, 523);
    assert.equal(effective.cashBalance, 473);
    assert.equal(effective.promotionalBalance, 50);
    assert.equal(effective.isMigrated, true);
});

test('profissional migrada calcula saldo disponível da carteira', () => {
    const user = {
        isProfessional: true,
        balance: 500,
        professionalAvailableCents: 850,
        customerCashAvailableCents: 0,
        customerPromoAvailableCents: 0,
        marketplaceWalletMigratedAt: new Date(),
    };

    const effective = getUserEffectiveBalance(user);
    assert.equal(effective.totalBalance, 850);
    assert.equal(effective.cashBalance, 850);
    assert.equal(effective.promotionalBalance, 0);
    assert.equal(effective.isMigrated, true);
});

test('usuário legado não migrado utiliza saldo e bônus legados', () => {
    const user = {
        isProfessional: false,
        balance: 200,
        promotionalBalance: 50,
        marketplaceWalletMigratedAt: null,
    };

    const effective = getUserEffectiveBalance(user);
    assert.equal(effective.totalBalance, 200);
    assert.equal(effective.cashBalance, 150);
    assert.equal(effective.promotionalBalance, 50);
    assert.equal(effective.isMigrated, false);
});

test('usuário indefinido ou nulo retorna estrutura zerada com segurança', () => {
    const effective = getUserEffectiveBalance(null);
    assert.equal(effective.totalBalance, 0);
    assert.equal(effective.cashBalance, 0);
    assert.equal(effective.promotionalBalance, 0);
    assert.equal(effective.isMigrated, false);
});
