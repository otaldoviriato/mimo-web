const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const mongoose = require('mongoose');
const WalletModel = mongoose.model('PixTestWallet', new mongoose.Schema({ clerkId: String, balance: Number, customerCashAvailableCents: Number }));

function load(file, mocks = {}, globals = {}) {
    const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    const names = Object.keys(globals);
    new Function('require', 'module', 'exports', ...names, source)(
        (name) => { if (name in mocks) return mocks[name]; throw new Error(`Unexpected import: ${name}`); },
        module, module.exports, ...Object.values(globals),
    );
    return module.exports;
}
const api = load('lib/abacatePix.ts');
const paymentId = 'pix_char_Example123';

test('recognizes existing Pix without provider metadata and excludes Asaas', () => {
    const tx = { type: 'PIX', source: 'recharge', abacatePayId: paymentId };
    assert.equal(api.isAbacatePix(tx), true);
    assert.equal(api.isAbacatePix({ ...tx, metadata: { provider: 'asaas' } }), false);
    assert.equal(api.isAbacatePix({ ...tx, type: 'CC' }), false);
});
test('extracts Pix ID from supported payloads without mistaking webhook log ID', () => {
    for (const data of [{ pixQrCode: { id: paymentId } }, { transparent: { id: paymentId } }, { payment: { id: paymentId } }, { id: paymentId }]) {
        assert.equal(api.getAbacatePixWebhookId({ id: 'log_123', data }), paymentId);
    }
    assert.equal(api.getAbacatePixWebhookId({ id: 'log_123' }), undefined);
    assert.equal(api.getAbacatePixWebhookId(null), undefined);
});
test('provider check uses authenticated no-cache v1 endpoint and rejects errors/mismatches', async () => {
    let response = { ok: true, status: 200, json: async () => ({ data: { status: 'PAID' } }) };
    const isolated = load('lib/abacatePix.ts', {}, {
        process: { env: { ABACATEPAY_API_KEY: 'test-key' } },
        fetch: async (url, options) => {
            assert.equal(url, `https://api.abacatepay.com/v1/pixQrCode/check?id=${paymentId}`);
            assert.equal(options.headers.Authorization, 'Bearer test-key');
            assert.equal(options.cache, 'no-store');
            return response;
        },
    });
    assert.equal(await isolated.checkAbacatePix(paymentId), 'PAID');
    response = { ok: false, status: 401, json: async () => ({ error: 'secret detail' }) };
    await assert.rejects(isolated.checkAbacatePix(paymentId), /HTTP 401/);
    response = { ok: true, status: 200, json: async () => ({ data: { status: 'PAID', id: 'wrong' } }) };
    await assert.rejects(isolated.checkAbacatePix(paymentId), /mismatch/);
});

// In-memory transactional adapter: asserts session propagation and simulates commit/rollback.
// Actual MongoDB transaction behavior still requires an integration environment.
function fixture({ providerStatus = 'PAID', missingUser = false, failCredit = false, amount = 100, analyticsFail = false } = {}) {
    let state = { tx: { _id: 'tx1', userId: 'owner', abacatePayId: paymentId, type: 'PIX', source: 'recharge', amount, status: 'PENDING' }, balance: 0 };
    let chain = Promise.resolve();
    let checks = 0;
    let sessionActive = false;
    const session = { id: 'session' };
    const Transaction = {
        findOne: async (filter) => filter.userId && filter.userId !== state.tx.userId ? null : structuredClone(state.tx),
        findOneAndUpdate: async (filter, update, options) => {
            assert.equal(options.session, session);
            assert.equal(sessionActive, true);
            if (!filter.status.$in.includes(state.tx.status)) return null;
            state.tx.status = update.$set.status;
            return structuredClone(state.tx);
        },
        updateOne: async (_filter, update) => { if (state.tx.status === 'PENDING') state.tx.status = update.$set.status; },
    };
    const service = load('lib/settleAbacatePix.ts', {
        mongoose: { connection: { transaction: (callback) => {
            const run = chain.then(async () => {
                const snapshot = structuredClone(state);
                sessionActive = true;
                try { return await callback(session); }
                catch (error) { state = snapshot; throw error; }
                finally { sessionActive = false; }
            });
            chain = run.catch(() => {});
            return run;
        } } },
        '@/models/Transaction': { Transaction },
        '@/models/User': { User: { findOneAndUpdate: async (_filter, pipeline, options) => {
            assert.equal(options.session, session);
            assert.equal(sessionActive, true);
            // Construct with the installed Mongoose version without executing/network I/O.
            const query = WalletModel.findOneAndUpdate(_filter, pipeline, options);
            assert.deepEqual(query.getUpdate(), pipeline);
            if (failCredit) throw new Error('credit failed');
            if (missingUser) return null;
            const cents = pipeline[0].$set.balance.$add[1];
            assert.equal(pipeline[0].$set.customerCashAvailableCents.$cond[1].$add[1], cents);
            state.balance += cents;
            return { clerkId: 'owner' };
        } } },
        '@/lib/abacatePix': { ...api, checkAbacatePix: async () => { checks++; if (providerStatus === 'ERROR') throw new Error('unavailable'); return providerStatus; } },
        '@/lib/acquisitionAnalytics': { recordAcquisitionEvent: async () => { if (analyticsFail) throw new Error('analytics unavailable'); } },
        '@/models/CampaignVisit': { CampaignVisit: { findOneAndUpdate: async () => {} } },
    }, { console: { info() {}, error() {} } });
    return { settle: service.settleAbacatePix, state: () => state, checks: () => checks };
}
test('paid recharge credits R$100 as 10000 cents; replay does not double-credit', async () => {
    const f = fixture();
    assert.equal((await f.settle(paymentId, 'owner')).credited, true);
    assert.equal((await f.settle(paymentId)).credited, false);
    assert.equal(f.state().balance, 10000);
    assert.equal(f.state().tx.status, 'PAID');
    assert.equal(f.checks(), 1);
});
test('concurrent webhook and polling credit only once', async () => {
    const f = fixture({ amount: 10 });
    const results = await Promise.all([f.settle(paymentId), f.settle(paymentId, 'owner')]);
    assert.equal(results.filter(r => r.credited).length, 1);
    assert.equal(f.state().balance, 1000);
});
for (const options of [{ missingUser: true }, { failCredit: true }, { amount: 0 }, { amount: NaN }]) {
    test(`credit failure rolls back PAID: ${JSON.stringify(options)}`, async () => {
        const f = fixture(options);
        await assert.rejects(f.settle(paymentId));
        assert.equal(f.state().tx.status, 'PENDING');
        assert.equal(f.state().balance, 0);
    });
}
for (const status of ['PENDING', 'EXPIRED', 'CANCELLED', 'UNPAID', 'ERROR']) {
    test(`provider ${status} never credits`, async () => {
        const f = fixture({ providerStatus: status });
        if (status === 'ERROR') await assert.rejects(f.settle(paymentId));
        else assert.equal((await f.settle(paymentId)).credited, false);
        assert.equal(f.state().balance, 0);
        assert.equal(f.state().tx.status, ['EXPIRED', 'CANCELLED'].includes(status) ? 'CANCELLED' : 'PENDING');
    });
}
test('ownership enforced before provider request', async () => {
    const f = fixture();
    assert.equal(await f.settle(paymentId, 'other-user'), null);
    assert.equal(f.checks(), 0);
});
test('analytics failure cannot undo committed payment or duplicate retry', async () => {
    const f = fixture({ analyticsFail: true });
    assert.equal((await f.settle(paymentId)).credited, true);
    assert.equal((await f.settle(paymentId)).credited, false);
    assert.equal(f.state().balance, 10000);
});

for (const failure of [false, true]) {
    test(`status route reconciles legacy Abacate Pix (${failure ? 'provider unavailable' : 'paid'})`, async () => {
        let calls = 0;
        const tx = { type: 'PIX', source: 'recharge', abacatePayId: paymentId, status: 'PENDING', amount: 100 };
        const route = load('app/api/users/me/balance/pix/[id]/route.ts', {
            'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
            '@clerk/nextjs/server': { auth: async () => ({ userId: 'owner' }) },
            '@/lib/db': { connectToDatabase: async () => {} },
            '@/lib/asaas': { checkAsaasPayment: () => { throw new Error('Wrong provider'); } },
            '@/models/Transaction': { Transaction: { findOne: async () => tx } },
            '@/models/User': {},
            '@/lib/abacatePix': api,
            '@/lib/settleAbacatePix': { settleAbacatePix: async (id, userId) => {
                calls++;
                assert.equal(id, paymentId);
                assert.equal(userId, 'owner');
                if (failure) throw new Error('unavailable');
                return { transaction: { ...tx, status: 'PAID' }, credited: true };
            } },
        }, { console: { error() {} } });
        const response = await route.GET({}, { params: Promise.resolve({ id: paymentId }) });
        assert.equal(calls, 1);
        assert.equal(response.status, failure ? 503 : 200);
        if (!failure) assert.equal(response.body.status, 'PAID');
    });
}
