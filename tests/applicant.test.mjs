import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { validateApplicantBirthDate, suggestApplicantUsername } from '../lib/applicant.ts';
import { encodeApplicantIntent, readApplicantIntent, APPLICANT_COOKIE } from '../lib/applicantIntent.ts';
import { calculateOnboardingStep } from '../lib/onboarding.ts';
import { isReservedRoute } from '../lib/routes.ts';

process.env.CLERK_SECRET_KEY = 'local-test-key-only';

test('age uses complete calendar dates in Brazil, including eighteenth birthday', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    assert.equal(validateApplicantBirthDate('2008-10-11', now), null);
    for (const date of ['2008-10-12', '2009-01-01', '2027-01-01', '2000-02-30', '2001-02-29', '', null, '11/10/2008']) assert.ok(validateApplicantBirthDate(date, now));
    assert.equal(validateApplicantBirthDate('2008-10-11', new Date('2026-10-11T02:59:59Z')) !== null, true);
    assert.equal(validateApplicantBirthDate('2008-10-11', new Date('2026-10-11T03:00:00Z')), null);
    assert.equal(validateApplicantBirthDate('2008-02-29', new Date('2026-02-28T12:00:00Z')) !== null, true);
    assert.equal(validateApplicantBirthDate('2008-02-29', new Date('2026-03-01T12:00:00Z')), null);
});
test('username normalization and reserved route protection', () => {
    assert.equal(suggestApplicantUsername('  Ána   Júlia Silva '), 'ana_julia');
    assert.equal(suggestApplicantUsername(''), '');
    assert.equal(isReservedRoute('/participar'), true);
});
test('referral intent is signed, survives reuse, and rejects edits or expiration', () => {
    const intent = { startedAt: Date.now(), referredByProfessionalId: 'stable-id' };
    const cookie = encodeApplicantIntent(intent);
    assert.deepEqual(readApplicantIntent(cookie), intent);
    assert.equal(readApplicantIntent(cookie + '.extra'), null);
    assert.equal(readApplicantIntent(cookie.replace(/^./, 'X')), null);
    assert.equal(readApplicantIntent(encodeApplicantIntent({ startedAt: Date.now() - 31 * 86400000 })), null);
    assert.equal(readApplicantIntent(), null);
});
test('app access is independent from approval and legacy onboarding is preserved', () => {
    assert.equal(calculateOnboardingStep({ isProfessional: true, applicantEnrollment: true }), 'profile');
    for (const professionalStatus of ['pending', 'approved', 'rejected']) {
        assert.equal(calculateOnboardingStep({ isProfessional: true, applicantEnrollment: true, applicantCompletedAt: new Date(), professionalStatus }), 'completed');
    }
    assert.equal(calculateOnboardingStep({ isProfessional: false }), 'completed');
    assert.equal(calculateOnboardingStep({ isProfessional: true }), 'identity');
});

// Execute real route handlers with an in-memory database and verified Clerk session.
// No environment files, database connections, uploads, or remote calls are used.
function fixture() {
    let user = null;
    let inserts = 0;
    let accountCreated = Date.now();
    let authenticated = true;
    const intent = encodeApplicantIntent({ startedAt: accountCreated - 1000, referredByProfessionalId: 'referrer-id' });
    const User = {
        findOne: async () => user,
        exists: async ({ username }) => username === 'taken',
        findById: async () => user,
        findOneAndUpdate: async (filter, update) => {
            if (!user) { inserts++; user = { _id: 'id', createdAt: new Date(), ...update.$setOnInsert }; }
            if (filter.applicantCompletedAt && user.applicantCompletedAt) return null;
            Object.assign(user, update.$set);
            return user;
        },
    };
    const require = createRequire(import.meta.url);
    const dependencies = {
        '@/lib/db': { connectToDatabase: async () => {} },
        '@/models/User': { User },
        '@/lib/applicantIntent': { APPLICANT_COOKIE, readApplicantIntent },
        '@/lib/applicant': { validateApplicantBirthDate },
        '@/lib/routes': { isReservedRoute },
        '@clerk/nextjs/server': { auth: async () => ({ userId: authenticated ? 'new-user' : null }), clerkClient: async () => ({ users: { getUser: async () => ({ createdAt: accountCreated, primaryEmailAddressId: 'email', emailAddresses: [{ id: 'email', emailAddress: 'test@example.test', verification: { status: 'verified' } }] }) } }) },
    };
    const source = readFileSync(new URL('../app/api/participar/route.ts', import.meta.url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: key => dependencies[key] || require(key), Date, console });
    const request = body => ({ cookies: { get: () => ({ value: intent }) }, json: async () => body });
    return { handlers: exports, request, user: () => user, inserts: () => inserts, setUser: value => { user = value; }, ageAccount: () => { accountCreated -= 86400000; }, unauthenticate: () => { authenticated = false; } };
}
test('authenticated enrollment binds referral once and repeating enrollment creates no duplicate', async () => {
    const f = fixture();
    assert.equal((await f.handlers.POST(f.request())).status, 200);
    assert.equal(f.user().professionalStatus, 'pending');
    assert.equal(f.user().referredByProfessionalId, 'referrer-id');
    f.user().name = 'Draft';
    await f.handlers.POST(f.request());
    assert.equal(f.inserts(), 1);
    assert.equal(f.user().name, 'Draft');
});

test('professional registration ignores legacy anonymous names but preserves chosen names', async () => {
    const f = fixture();
    await f.handlers.POST(f.request());
    f.user().name = 'Anônimo[646]';
    assert.equal((await (await f.handlers.POST(f.request())).json()).profile.name, '');
    f.user().name = 'Julia';
    assert.equal((await (await f.handlers.POST(f.request())).json()).profile.name, 'Julia');
});
test('old client accounts and unsigned requests cannot gain a professional role', async () => {
    const f = fixture(); f.ageAccount();
    assert.equal((await f.handlers.POST(f.request())).status, 409);
    assert.equal(f.inserts(), 0);
    const g = fixture(); g.unauthenticate();
    assert.equal((await g.handlers.POST(g.request())).status, 401);
    const h = fixture();
    h.setUser({ createdAt: new Date(), isProfessional: false, onboardingStep: 'completed' });
    assert.equal((await h.handlers.POST(h.request())).status, 409);
    assert.equal(h.user().isProfessional, false);
});

test('referral endpoint accepts missing/invalid referral and signs only the server-resolved stable ID', async () => {
    const require = createRequire(import.meta.url);
    const source = readFileSync(new URL('../app/api/participar/intencao/route.ts', import.meta.url), 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    const queries = [];
    const dependencies = {
        '@/lib/db': { connectToDatabase: async () => {} },
        '@/models/User': { User: { findOne: filter => { queries.push(filter); return { select: () => ({ lean: async () => filter.username === 'ana' ? { clerkId: 'stable-ana' } : null }) }; } } },
        '@/lib/applicantIntent': { APPLICANT_COOKIE, APPLICANT_MAX_AGE: 2592000, readApplicantIntent, encodeApplicantIntent },
    };
    vm.runInNewContext(code, { exports, require: key => dependencies[key] || require(key), Date, process });
    for (const indicacao of [undefined, 'does-not-exist', 'ana']) {
        const response = await exports.POST({ cookies: { get: () => undefined }, json: async () => ({ indicacao, referredByProfessionalId: 'forged' }) });
        assert.equal(response.status, 200);
        const cookie = response.cookies.get(APPLICANT_COOKIE);
        assert.equal(cookie.httpOnly, true);
        assert.equal(readApplicantIntent(cookie.value).referredByProfessionalId, indicacao === 'ana' ? 'stable-ana' : undefined);
    }
    assert.equal(queries.every(query => query.isProfessional === true && query.professionalStatus === 'approved'), true);
});
test('draft, unique username, mandatory photo, completion and retry preserve pending approval', async () => {
    const f = fixture(); await f.handlers.POST(f.request());
    const body = { name: 'Ana', username: 'ana', birthDate: '2000-01-01', complete: true, professionalStatus: 'approved' };
    assert.equal((await f.handlers.PATCH(f.request({ ...body, username: 'taken', complete: false }))).status, 409);
    assert.equal((await f.handlers.PATCH(f.request({ ...body, birthDate: '2025-01-01' }))).status, 400);
    assert.equal((await f.handlers.PATCH(f.request(body))).status, 400);
    assert.equal((await f.handlers.PATCH(f.request({ ...body, complete: false }))).status, 200);
    assert.equal(f.user().applicantCompletedAt, undefined);
    assert.equal(f.user().name, 'Ana');
    f.user().photoUrl = '/uploaded-photo.webp';
    assert.equal((await f.handlers.PATCH(f.request(body))).status, 200);
    assert.ok(f.user().applicantCompletedAt);
    await f.handlers.PATCH(f.request({ ...body, name: 'Overwrite' }));
    assert.equal(f.user().name, 'Ana');
    assert.equal(f.user().professionalStatus, 'pending');
    assert.equal(f.inserts(), 1);
});
