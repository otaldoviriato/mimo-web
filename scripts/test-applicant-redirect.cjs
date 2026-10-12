const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const stale = { clerkId: 'fixture', isProfessional: true, applicantEnrollment: true, onboardingStep: 'profile' };
        // Simulate reopening the app with the unfinished profile persisted on disk.
        await page.addInitScript(profile => localStorage.setItem('mimo_profile', JSON.stringify(profile)), stale);
        let release;
        let failed = false;
        let pending = new Promise(resolve => { release = resolve; });
        await page.route('**/api/users/me', async route => {
            await pending;
            await route.fulfill({ status: failed ? 503 : 200, json: failed ? { error: 'offline' } : { user: { ...stale, applicantCompletedAt: '2026-10-12T12:00:00Z', onboardingStep: 'completed' } } });
        });
        for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt) { pending = new Promise(resolve => { release = resolve; }); await page.reload(); }
            else await page.goto('http://127.0.0.1:3012/profile-state');
            await page.getByRole('heading', { name: 'Atualizando perfil' }).waitFor();
            assert.ok(page.url().endsWith('/profile-state'));
            release();
            await page.getByRole('heading', { name: 'Aplicativo pronto' }).waitFor();
            assert.ok(page.url().endsWith('/profile-state'));
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mimo_profile')).onboardingStep), 'completed');
        }
        failed = true;
        await page.reload();
        await page.getByRole('heading', { name: 'Falha ao atualizar' }).waitFor();
        assert.ok(page.url().endsWith('/profile-state'), 'request failure must not redirect based on stale cache');
        assert.deepEqual(errors, []);
        console.log('PASS: stale persisted applicant profile waits for server; completed profile opens app across reloads; network failure never redirects from cache.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
