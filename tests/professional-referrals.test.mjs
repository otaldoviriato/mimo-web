import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as rules from '../lib/professionalReferralRules.ts';

// Transactional in-memory adapter: no remote calls or environment files.
function fixture() {
    let state = { candidate: { _id: 'candidate', clerkId: 'candidate', isProfessional: true, applicantCompletedAt: new Date(), professionalStatus: 'approved', referredByProfessionalId: 'owner' }, owner: { _id: 'owner', clerkId: 'owner', balance: 700, professionalAvailableCents: 0 }, withdrawals: [], ledger: [] };
    let failLedger = false;
    let tail = Promise.resolve();
    const session = { endSession: async () => {}, withTransaction: callback => {
        const run = tail.then(async () => { const snapshot = structuredClone(state); try { return await callback(); } catch (error) { state = snapshot; throw error; } });
        tail = run.catch(() => {}); return run;
    } };
    const User = {
        findOne: ({ clerkId }) => ({ session: async () => clerkId === 'candidate' ? state.candidate : state.owner }),
        updateOne: async (filter, update, options) => {
            if (Array.isArray(update)) assert.equal(options.updatePipeline, true);
            if (filter._id === 'candidate') {
                if (state.candidate.professionalReferralRewardedAt) return { modifiedCount: 0 };
                Object.assign(state.candidate, update.$set);
            } else {
                // Evaluate the service's pipeline expressions against the original document.
                const evalExpr = value => {
                    if (typeof value === 'string' && value.startsWith('$')) return state.owner[value.slice(1)];
                    if (value?.$ifNull) return evalExpr(value.$ifNull[0]) ?? evalExpr(value.$ifNull[1]);
                    if (value?.$cond) return evalExpr(value.$cond[evalExpr(value.$cond[0]) ? 1 : 2]);
                    if (value?.$add) return value.$add.reduce((sum, item) => sum + evalExpr(item), 0);
                    return value;
                };
                const next = Object.fromEntries(Object.entries(update[0].$set).map(([key, value]) => [key, evalExpr(value)]));
                Object.assign(state.owner, next);
            }
            return { modifiedCount: 1 };
        },
    };
    const deps = {
        mongoose: { startSession: async () => session },
        '@/models/User': { User },
        '@/models/WithdrawRequest': { WithdrawRequest: { find: filter => ({ select: () => ({ session: () => ({ lean: async () => state.withdrawals.filter(item => item.status === filter.status) }) }) }) } },
        '@/models/FinancialLedgerEntry': { FinancialLedgerEntry: { create: async rows => { if (failLedger) throw new Error('ledger unavailable'); assert.ok(!state.ledger.some(row => row.idempotencyKey === rows[0].idempotencyKey)); state.ledger.push(...rows); } } },
        '@/lib/professionalReferralRules': rules,
    };
    const code = ts.transpileModule(readFileSync(new URL('../lib/professionalReferralReward.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: key => deps[key], Date });
    return { settle: () => exports.settleProfessionalReferralReward('candidate'), state: () => state, fail: value => { failLedger = value; }, add: (amount, extra = {}) => state.withdrawals.push({ amount, status: 'concluido', ...extra }) };
}

test('only completed net cents qualify, including legacy fee subtraction', () => {
    assert.equal(rules.completedWithdrawalNetCents({ status: 'concluido', amount: 5000, fee: 200 }), 4800);
    assert.equal(rules.completedWithdrawalNetCents({ status: 'concluido', amount: 5200, netAmount: 5000 }), 5000);
    for (const status of ['pendente', 'processando', 'rejeitado', 'cancelado']) assert.equal(rules.completedWithdrawalNetCents({ status, amount: 9000 }), 0);
});
test('10 + 20 + 20 credits once; repeated concurrent notifications do not duplicate', async () => {
    const f = fixture(); f.add(1000); f.add(2000);
    assert.equal(await f.settle(), false);
    f.add(2000, { hiddenFromUser: true });
    const results = await Promise.all([f.settle(), f.settle(), f.settle()]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(f.state().owner.professionalAvailableCents, 5700);
    assert.equal(f.state().ledger.length, 1);
    f.add(8000); assert.equal(await f.settle(), false);
});
test('fees and pending withdrawals cannot prematurely qualify a referral', async () => {
    const f = fixture(); f.add(5000, { fee: 200 }); f.add(10000, { status: 'processando' });
    assert.equal(await f.settle(), false);
    f.add(200); assert.equal(await f.settle(), true);
});
test('ledger failure rolls back the claim and balance and permits safe retry', async () => {
    const f = fixture(); f.add(5000); f.fail(true);
    await assert.rejects(f.settle(), /ledger unavailable/);
    assert.equal(f.state().candidate.professionalReferralRewardedAt, undefined);
    assert.equal(f.state().owner.balance, 700);
    f.fail(false); assert.equal(await f.settle(), true);
    assert.equal(f.state().ledger.length, 1);
});
test('migrated wallet retains canonical balance rather than stale legacy balance', async () => {
    const f = fixture(); Object.assign(f.state().owner, { marketplaceWalletMigratedAt: new Date(), professionalAvailableCents: 2300 });
    f.add(5000); await f.settle(); assert.equal(f.state().owner.balance, 7300);
});
test('unapproved, suspended and self referrals cannot earn rewards', async () => {
    for (const patch of [{ professionalStatus: 'pending' }, { isSuspended: true }, { referredByProfessionalId: 'candidate' }, { applicantCompletedAt: null }]) {
        const f = fixture(); Object.assign(f.state().candidate, patch); f.add(5000);
        assert.equal(await f.settle(), false); assert.equal(f.state().ledger.length, 0);
    }
});
test('visible lifecycle matches approval, qualification and committed reward', () => {
    assert.equal(rules.professionalReferralStatus({ professionalStatus: 'pending' }, 0), 'review');
    assert.equal(rules.professionalReferralStatus({ professionalStatus: 'approved' }, 3000), 'qualifying');
    assert.equal(rules.professionalReferralStatus({ professionalStatus: 'approved' }, 5000), 'processing');
    assert.equal(rules.professionalReferralStatus({ professionalReferralRewardedAt: new Date() }, 5000), 'rewarded');
});

test('API scopes reads and reconciliation to the authenticated owner and exposes capped public progress', async () => {
    let authenticated = true;
    const calls = [];
    const chain = value => ({ select() { return this; }, sort() { return this; }, lean: async () => value });
    const deps = {
        '@clerk/nextjs/server': { auth: async () => ({ userId: authenticated ? 'owner' : null }) },
        '@/lib/db': { connectToDatabase: async () => {} },
        '@/models/User': { User: {
            findOne: filter => { assert.equal(filter.clerkId, 'owner'); assert.equal(filter.isProfessional, true); return chain({ clerkId: 'owner', username: 'ana', professionalStatus: 'approved' }); },
            find: filter => { assert.equal(filter.referredByProfessionalId, 'owner'); return chain([{ clerkId: 'candidate', name: 'Maria', username: 'maria', professionalStatus: 'approved' }]); },
        } },
        '@/models/WithdrawRequest': { WithdrawRequest: { find: filter => { assert.equal(filter.userId.$in.join(','), 'candidate'); assert.equal(filter.status, 'concluido'); return chain([{ userId: 'candidate', amount: 10000, netAmount: 9800, status: 'concluido', pixKey: 'never expose' }]); } } },
        '@/models/FinancialLedgerEntry': { FinancialLedgerEntry: { find: filter => { assert.equal(filter.ownerId, 'owner'); return chain([]); } } },
        '@/lib/professionalReferralRules': rules,
        '@/lib/professionalReferralReward': { settleProfessionalReferralReward: async id => { calls.push(id); return true; } },
    };
    const require = createRequire(import.meta.url);
    const code = ts.transpileModule(readFileSync(new URL('../app/api/users/me/professional-referrals/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: key => deps[key] || require(key), Date, Map });
    const response = await exports.GET();
    const body = await response.json();
    assert.equal(body.sharePath, '/participar?indicacao=ana');
    assert.equal(body.referrals[0].progressCents, 5000);
    assert.equal(JSON.stringify(body).includes('pixKey'), false);
    assert.equal((await (await exports.POST()).json()).credited, 1);
    assert.deepEqual(calls, ['candidate']);
    authenticated = false;
    assert.equal((await exports.GET()).status, 403);
    assert.equal((await exports.POST()).status, 403);
});
