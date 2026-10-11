// Requires Playwright in NODE_PATH; run the isolated fixture on port 3012 first.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'msedge' });
    try {
        const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
        const errors = [];
        let savedBody;
        const avatar = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#c4b5fd"/></svg>').toString('base64');
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/api/**', async route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/users/me/photo') return route.fulfill({ json: { photoUrl: avatar } });
            if (url.pathname === '/api/participar' && route.request().method() === 'PATCH') { savedBody = route.request().postDataJSON(); return route.fulfill({ json: { profile: { completed: false } } }); }
            if (url.pathname === '/api/participar') return route.fulfill({ json: { profile: { name: '', username: 'candidata_fixture', birthDate: '', photoUrl: '', completed: false } } });
            if (url.pathname === '/api/users/check-username') return route.fulfill({ json: { available: true } });
            return route.fulfill({ status: 404, json: {} });
        });
        await page.goto('http://127.0.0.1:3012');
        await page.getByLabel('Nome público', { exact: true }).fill('Ána Júlia');
        assert.equal(await page.getByLabel('Username', { exact: true }).inputValue(), '');
        await page.getByRole('button', { name: 'Adicionar foto de perfil', exact: true }).waitFor();
        assert.equal(await page.locator('input[type=file]').isVisible(), false);
        await page.getByLabel('Username', { exact: true }).fill('ana_escolhida');
        await page.getByLabel('Nome público', { exact: true }).fill('Outro Nome');
        assert.equal(await page.getByLabel('Username', { exact: true }).inputValue(), 'ana_escolhida');
        await page.getByLabel('Data de nascimento', { exact: true }).fill('01012020');
        assert.equal(await page.getByLabel('Data de nascimento', { exact: true }).inputValue(), '01/01/2020');
        assert.equal(await page.getByLabel('Data de nascimento', { exact: true }).getAttribute('type'), 'text');
        await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: '18 anos' }).waitFor();
        await page.reload();
        await page.getByLabel('Nome público', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Username', { exact: true }).inputValue(), 'ana_escolhida');
        assert.equal(await page.getByLabel('Nome público', { exact: true }).inputValue(), 'Outro Nome');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        fs.mkdirSync('scratch/applicant', { recursive: true });
        await page.getByLabel('Data de nascimento', { exact: true }).fill('15081995');
        await page.locator('input[type=file]').setInputFiles({ name: 'avatar.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(avatar.split(',')[1], 'base64') });
        await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
        await page.getByAltText('Sua foto de perfil').waitFor();
        await page.getByRole('button', { name: 'Trocar foto', exact: true }).waitFor();
        assert.equal(await page.locator('input[type=file]').isVisible(), false);
        await page.getByRole('button', { name: 'Salvar e continuar depois', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'Cadastro salvo' }).waitFor();
        assert.equal(savedBody.birthDate, '1995-08-15');
        assert.equal(savedBody.username, 'ana_escolhida');
        for (const width of [320, 360, 768, 1280]) {
            await page.setViewportSize({ width, height: 780 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        await page.setViewportSize({ width: 360, height: 1000 });
        await page.locator('main').evaluate(element => element.scrollTop = 0);
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
        console.log('PASS: empty/manual username, photo placeholder, hidden native file control, birth mask, age validation, reload, mobile overflow, review banner at 320/360/768/1280px, approval removal.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
