// Requires tsx and mongodb-memory-server (locally or under MIMO_TEST_RUNTIME).
// node --test tests/welcome-credit.integration.cjs
const assert = require('node:assert/strict');
const { before, after, beforeEach, test } = require('node:test');
const { createRequire } = require('node:module');
const path = require('node:path');
const runtime = process.env.MIMO_TEST_RUNTIME
    ? createRequire(path.join(process.env.MIMO_TEST_RUNTIME, 'package.json')) : require;
runtime('tsx/cjs');
const { MongoMemoryReplSet } = runtime('mongodb-memory-server');
const mongoose = require('mongoose');
let replica, User, CreditGrant, CreditCampaign, Transaction, MicroTransaction, AppSettings;
let grantWelcomeCredit, getWelcomeCreditNotice, getUserEffectiveBalance;

before(async () => {
    replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ ip: '127.0.0.1' }] });
    process.env.MONGODB_URI = replica.getUri('mimo-chat-desenv');
    assert.match(process.env.MONGODB_URI, /^mongodb:\/\/127\.0\.0\.1:/);
    ({ grantWelcomeCredit, getWelcomeCreditNotice } = require('../lib/creditCampaign.ts'));
    ({ getUserEffectiveBalance } = require('../lib/wallet.ts'));
    ({ User } = require('../models/User.ts'));
    ({ CreditGrant } = require('../models/CreditGrant.ts'));
    ({ CreditCampaign } = require('../models/CreditCampaign.ts'));
    ({ Transaction } = require('../models/Transaction.ts'));
    ({ MicroTransaction } = require('../models/MicroTransaction.ts'));
    ({ AppSettings } = require('../models/AppSettings.ts'));
    await require('../lib/db.ts').connectToDatabase();
    assert.equal(mongoose.connection.name, 'mimo-chat-desenv');
    await Promise.all([User, CreditGrant, CreditCampaign, Transaction, MicroTransaction, AppSettings].map(model => model.init()));
});
after(async () => { await mongoose.disconnect(); await replica?.stop(); });
beforeEach(async () => {
    assert.equal(mongoose.connection.host, '127.0.0.1');
    for (const model of [User, CreditGrant, CreditCampaign, Transaction, MicroTransaction, AppSettings]) {
        await model.deleteMany({});
    }
    await AppSettings.create({ key: 'global', welcomeBonusEnabled: true, welcomeBonusAmountCents: 300, welcomeBonusLimitByIp: false });
    await CreditCampaign.create({ name: 'Test', enabled: true, amount: 300, limitByEmail: true, limitByIp: false, limitByCpf: false, limitByPhone: false });
});
async function user(id, migrated = false) {
    return User.create({ clerkId: id, username: id, email: `${id}@example.test`, isProfessional: false,
        marketplaceWalletMigratedAt: migrated ? new Date() : null });
}
async function grant(id) { return grantWelcomeCredit(id, `${id}@example.test`, '192.0.2.1'); }

test('reproduces original Mongoose 9 rejection before any database update', async () => {
    await user('original');
    await assert.rejects(async () => User.updateOne({ clerkId: 'original' }, [{ $set: { balance: 300 } }]), /updatePipeline/);
    assert.equal((await User.findOne({ clerkId: 'original' })).balance, 0);
});
for (const migrated of [false, true]) {
    test(`signup credits R$3, history and notice; migrated=${migrated}`, async () => {
        await user('new', migrated);
        assert.equal((await grant('new')).success, true);
        const account = await User.findOne({ clerkId: 'new' });
        assert.equal(getUserEffectiveBalance(account).totalBalance, 300);
        assert.equal(account.promotionalBalance, 300);
        assert.equal(account.customerPromoAvailableCents, migrated ? 300 : 0);
        const history = await Transaction.find({ userId: 'new', source: { $in: ['recharge', 'gift', 'campaign'] }, status: 'PAID' });
        assert.equal(history.length, 1);
        assert.equal(history[0].amount, 300);
        assert.equal(history[0].type, 'promotional_credit_grant');
        assert.equal(await MicroTransaction.countDocuments({ userId: 'new' }), 1);
        assert.equal((await getWelcomeCreditNotice('new')).amount, 300);
        await CreditGrant.updateOne({ userId: 'new' }, { $set: { noticeShown: true } });
        assert.equal(await getWelcomeCreditNotice('new'), null);
    });
}
test('concurrent and repeated requests credit only once, including after spending', async () => {
    await user('parallel', true);
    await Promise.all(Array.from({ length: 5 }, () => grant('parallel')));
    assert.equal((await User.findOne({ clerkId: 'parallel' })).balance, 300);
    assert.equal(await CreditGrant.countDocuments({ userId: 'parallel' }), 1);
    assert.equal(await Transaction.countDocuments({ userId: 'parallel' }), 1);
    await User.updateOne({ clerkId: 'parallel' }, { $set: { balance: 0, promotionalBalance: 0, customerPromoAvailableCents: 0 } });
    assert.equal((await grant('parallel')).success, false);
    assert.equal((await User.findOne({ clerkId: 'parallel' })).balance, 0);
});
test('ledger failure rolls back balance, grant and history and allows a clean retry', async () => {
    await user('retry', true);
    const original = MicroTransaction.create;
    MicroTransaction.create = async () => { throw new Error('Injected ledger failure'); };
    try { assert.equal((await grant('retry')).success, false); }
    finally { MicroTransaction.create = original; }
    assert.equal((await User.findOne({ clerkId: 'retry' })).balance, 0);
    assert.equal(await CreditGrant.countDocuments({}), 0);
    assert.equal(await Transaction.countDocuments({}), 0);
    assert.equal(await getWelcomeCreditNotice('retry'), null);
    assert.equal((await grant('retry')).success, true);
    assert.equal((await User.findOne({ clerkId: 'retry' })).balance, 300);
});
test('failed legacy grant neither shows a false notice nor blocks recreated email', async () => {
    const campaign = await CreditCampaign.findOne();
    await CreditGrant.create({ campaignId: campaign._id, userId: 'deleted', amountGranted: 300, amountRemaining: 300,
        status: 'active', metadata: { email: 'recreated@example.test' } });
    assert.equal(await getWelcomeCreditNotice('deleted'), null);
    await user('recreated');
    assert.equal((await grant('recreated')).success, true);
    assert.equal((await getWelcomeCreditNotice('recreated')).amount, 300);
});
test('funded legacy grant still enforces the email restriction', async () => {
    const campaign = await CreditCampaign.findOne();
    const previous = await CreditGrant.create({ campaignId: campaign._id, userId: 'deleted', amountGranted: 300, amountRemaining: 300,
        status: 'active', metadata: { email: 'recreated@example.test' } });
    await Transaction.create({ userId: 'deleted', amount: 300, type: 'promotional_credit_grant', source: 'campaign', status: 'PAID', creditGrantId: previous._id.toString() });
    await user('recreated');
    assert.equal((await grant('recreated')).reason, 'limit_by_email');
    assert.equal((await User.findOne({ clerkId: 'recreated' })).balance, 0);
});
test('disabled promotion and invalid amount do not create credits or notices', async () => {
    await user('off');
    await AppSettings.updateOne({ key: 'global' }, { $set: { welcomeBonusEnabled: false } });
    await CreditCampaign.updateOne({}, { $set: { enabled: false } });
    assert.equal((await grant('off')).reason, 'no_active_campaign');
    await AppSettings.updateOne({ key: 'global' }, { $set: { welcomeBonusEnabled: true, welcomeBonusAmountCents: 0 } });
    assert.equal((await grant('off')).reason, 'invalid_amount');
    assert.equal(await CreditGrant.countDocuments({}), 0);
    assert.equal(await getWelcomeCreditNotice('off'), null);
});
