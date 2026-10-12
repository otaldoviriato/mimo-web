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
        let complete = false;
        const avatar = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#c4b5fd"/></svg>').toString('base64');
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/api/**', async route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/users/me') return route.fulfill({ json: { isProfessional: false } });
            if (url.pathname === '/api/users/me/photo') return route.fulfill({ json: { photoUrl: avatar } });
            if (url.pathname === '/api/participar' && route.request().method() === 'PATCH') { savedBody = route.request().postDataJSON(); return route.fulfill({ json: { profile: { completed: complete } } }); }
            if (url.pathname === '/api/participar') return route.fulfill({ json: { profile: { name: 'Anônimo[646]', username: 'candidata_fixture', birthDate: '', photoUrl: '', completed: false } } });
            if (url.pathname === '/api/users/username-suggestions') return route.fulfill({ json: { suggestions: ['anajulia', 'ana.julia', 'ana_julia'] } });
            if (url.pathname === '/api/users/check-username') return route.fulfill({ json: { available: url.searchParams.get('username') !== 'ocupado' } });
            return route.fulfill({ status: 404, json: {} });
        });
        await page.route('**/Logo.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: fs.readFileSync('public/Logo.svg') }));
        await page.goto('http://127.0.0.1:3012');
        await page.getByLabel('Nome no perfil', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Nome no perfil', { exact: true }).inputValue(), '');
        assert.equal(await page.locator('button[aria-pressed]').count(), 0);
        await page.getByLabel('Nome no perfil', { exact: true }).fill('Ána Júlia');
        assert.equal(await page.getByLabel('Nome de usuário', { exact: true }).inputValue(), '');
        await page.getByRole('button', { name: '@ana.julia', exact: true }).click();
        assert.equal(await page.getByLabel('Nome de usuário', { exact: true }).inputValue(), 'ana.julia');
        assert.equal(await page.locator('button[aria-pressed]').count(), 3);
        assert.equal(await page.getByText('Salvar e continuar depois', { exact: true }).count(), 0);
        await page.getByRole('button', { name: 'Adicionar foto de perfil', exact: true }).waitFor();
        assert.equal(await page.locator('input[type=file]').isVisible(), false);
        await page.getByLabel('Nome de usuário', { exact: true }).fill('ana_escolhida');
        await page.getByLabel('Nome no perfil', { exact: true }).fill('Outro Nome');
        assert.equal(await page.getByLabel('Nome de usuário', { exact: true }).inputValue(), 'ana_escolhida');
        const submit = page.getByRole('button', { name: 'Concluir cadastro', exact: true });
        assert.equal(await submit.isDisabled(), true);
        await page.locator('#applicant-birth').click();
        await page.getByRole('spinbutton', { name: 'Ano', exact: true }).press('Home');
        assert.equal(await page.getByRole('alert').filter({ hasText: '18 anos' }).count(), 0);
        await page.getByRole('button', { name: 'Confirmar data' }).click();
        await page.getByRole('alert').filter({ hasText: '18 anos' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Confirmar data' }).isEnabled(), true);
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.reload();
        await page.getByLabel('Nome no perfil', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Nome de usuário', { exact: true }).inputValue(), '');
        assert.equal(await page.getByLabel('Nome no perfil', { exact: true }).inputValue(), '');
        await page.getByLabel('Nome no perfil', { exact: true }).fill('Ána Júlia');
        await page.getByLabel('Nome de usuário', { exact: true }).fill('ana_escolhida');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        fs.mkdirSync('scratch/applicant', { recursive: true });
        await page.locator('#applicant-birth').click();
        const yearWheel = page.getByRole('spinbutton', { name: 'Ano', exact: true });
        await yearWheel.press('Home');
        const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()));
        for (let i = 0; i < year - 1995; i++) await yearWheel.press('ArrowDown');
        const monthWheel = page.getByRole('spinbutton', { name: 'Mês', exact: true });
        await monthWheel.press('Home');
        for (let i = 0; i < 7; i++) await monthWheel.press('ArrowDown');
        const dayWheel = page.getByRole('spinbutton', { name: 'Dia', exact: true });
        await dayWheel.press('Home');
        for (let i = 0; i < 14; i++) await dayWheel.press('ArrowDown');
        await page.getByRole('button', { name: 'Confirmar data' }).click();
        assert.equal(await page.locator('#applicant-birth').innerText(), '15/08/1995');
        assert.equal(await submit.isDisabled(), true);
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.locator('#applicant-birth').click();
        for (let i = 0; i < 5; i++) await yearWheel.press('ArrowUp');
        await dayWheel.press('End');
        await monthWheel.press('Home');
        await monthWheel.press('ArrowDown');
        assert.equal(await dayWheel.getAttribute('aria-valuetext'), '29');
        await yearWheel.press('ArrowDown');
        assert.equal(await dayWheel.getAttribute('aria-valuetext'), '28');
        await page.screenshot({ path: 'scratch/applicant/date-wheels.png', fullPage: true });
        await yearWheel.evaluate(element => { element.scrollTop = 0; });
        assert.equal(await page.getByRole('alert').filter({ hasText: '18 anos' }).count(), 0);
        await page.getByRole('button', { name: 'Confirmar data' }).click();
        await page.getByRole('alert').filter({ hasText: '18 anos' }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Confirmar data' }).isEnabled(), true);
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        assert.equal(await page.locator('#applicant-birth').innerText(), '15/08/1995');

        await page.locator('input[type=file]').setInputFiles({ name: 'avatar.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(avatar.split(',')[1], 'base64') });
        await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
        await page.getByAltText('Sua foto de perfil').waitFor();
        await page.getByRole('button', { name: 'Trocar foto', exact: true }).waitFor();
        await page.getByLabel('Nome de usuário', { exact: true }).fill('ocupado');
        assert.equal(await submit.isDisabled(), true);
        await page.getByText('Este nome já está em uso. Escolha outro.', { exact: true }).waitFor();
        assert.equal(await submit.isDisabled(), true);
        await page.getByLabel('Nome de usuário', { exact: true }).fill('ana_escolhida');
        assert.equal(await submit.isDisabled(), true);
        await page.getByText('Nome de usuário disponível', { exact: true }).waitFor();
        assert.equal(await submit.isEnabled(), true);
        assert.equal(await page.locator('input[type=file]').isVisible(), false);
        await page.getByRole('button', { name: '@ana.julia', exact: true }).waitFor();
        for (const [width, height] of [[320, 640], [360, 740], [390, 780], [768, 780]]) {
            await page.setViewportSize({ width, height });
            const layout = await page.evaluate(() => {
                const main = document.querySelector('main');
                return { height: main.getBoundingClientRect().height, viewport: innerHeight };
            });
            assert.ok(layout.height <= layout.viewport + 1, `form must fit ${width}x${height}: ${JSON.stringify(layout)}`);
        }
        await page.setViewportSize({ width: 390, height: 780 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: 'scratch/applicant/form-mobile.png', fullPage: true });
        await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: 'Não foi possível concluir' }).waitFor();
        assert.equal(savedBody.complete, true);
        assert.equal(savedBody.birthDate, '1995-08-15');
        assert.equal(savedBody.username, 'ana_escolhida');
        for (const width of [320, 360, 768, 1280]) {
            await page.setViewportSize({ width, height: 780 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        await page.setViewportSize({ width: 360, height: 1000 });
        await page.locator('main').evaluate(element => element.scrollTop = 0);
        complete = true;
        await page.evaluate(() => localStorage.setItem('mimo_profile', JSON.stringify({ clerkId: 'fixture', applicantEnrollment: true, onboardingStep: 'profile' })));
        await page.route('**/chats', route => route.fulfill({ contentType: 'text/html', body: '<h1>Conversas</h1>' }));
        await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click();
        await page.waitForURL('**/chats');
        assert.equal(await page.evaluate(() => localStorage.getItem('mimo_profile')), null);
        // Reproduce an abandoned /participar visit before returning to normal login.
        await page.evaluate(() => localStorage.setItem('mimo_redirect_after_login', '/participar/cadastro'));
        await page.goto('http://127.0.0.1:3012/login');
        await page.waitForURL('**/chats');
        assert.equal(await page.evaluate(() => localStorage.getItem('mimo_redirect_after_login')), null);
        assert.deepEqual(errors, []);
        if (process.argv.includes('--registration-only')) {
            console.log('PASS: registration suggestions, selection, manual edits, reload without draft, photo crop/upload, age validation, completion redirect, normal login rejects stale applicant destination, 320/360/768/1280px.');
            return;
        }
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
        console.log('PASS: three clickable suggestions, manual username, no local draft, photo placeholder, hidden native file control, birth mask, age validation, reload, mobile overflow, review banner at 320/360/768/1280px, approval removal.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
