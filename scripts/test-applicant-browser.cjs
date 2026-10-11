// Requires Playwright in NODE_PATH; run the isolated fixture on port 3012 first.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    try {
        const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/api/**', async route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/participar') return route.fulfill({ json: { profile: { name: '', username: 'candidata_fixture', birthDate: '', photoUrl: '', completed: false } } });
            if (url.pathname === '/api/users/check-username') return route.fulfill({ json: { available: true } });
            return route.fulfill({ status: 404, json: {} });
        });
        await page.goto('http://127.0.0.1:3012');
        await page.getByLabel('Nome público', { exact: true }).fill('Ána Júlia');
        assert.equal(await page.getByLabel('Username', { exact: true }).inputValue(), 'ana_julia');
        await page.getByLabel('Username', { exact: true }).fill('ana_escolhida');
        await page.getByLabel('Nome público', { exact: true }).fill('Outro Nome');
        assert.equal(await page.getByLabel('Username', { exact: true }).inputValue(), 'ana_escolhida');
        await page.getByLabel('Data de nascimento', { exact: true }).fill('2020-01-01');
        await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: '18 anos' }).waitFor();
        await page.reload();
        await page.getByLabel('Nome público', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Username', { exact: true }).inputValue(), 'ana_escolhida');
        assert.equal(await page.getByLabel('Nome público', { exact: true }).inputValue(), 'Outro Nome');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        fs.mkdirSync('scratch/applicant', { recursive: true });
        await page.screenshot({ path: 'scratch/applicant/form-mobile.png', fullPage: true });
        await page.goto('http://127.0.0.1:3012/review');
        for (const width of [320, 360, 768, 1280]) {
            await page.setViewportSize({ width, height: 780 });
            await page.waitForFunction(() => {
                const banner = document.querySelector('[role="status"]');
                const header = document.querySelector('[data-testid="header"]');
                const nav = document.querySelector('[data-testid="nav"]');
                return banner && header && nav && header.getBoundingClientRect().top >= banner.getBoundingClientRect().bottom - 1 && Math.abs(nav.getBoundingClientRect().bottom - innerHeight) < 2;
            });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        await page.setViewportSize({ width: 360, height: 780 });
        await page.screenshot({ path: 'scratch/applicant/banner-mobile.png', fullPage: true });
        await page.getByRole('button', { name: 'Simular aprovação administrativa' }).click();
        assert.equal(await page.getByText('Seu perfil está em análise', { exact: true }).count(), 0);
        assert.deepEqual(errors, []);
        console.log('PASS: suggestions, manual username, age validation, reload, mobile overflow, review banner at 320/360/768/1280px, approval removal.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
