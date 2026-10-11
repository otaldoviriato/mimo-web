const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedReferral = text; } } }));
        await page.goto('http://127.0.0.1:3012/referrals');
        for (const width of [320, 360, 768, 1280]) {
            await page.setViewportSize({ width, height: 780 });
            await page.getByText('Aguardando qualificação', { exact: true }).waitFor();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        await page.getByRole('button', { name: 'Copiar link', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'Link copiado!' }).waitFor();
        assert.equal(await page.evaluate(() => window.copiedReferral), 'http://127.0.0.1:3012/participar?indicacao=ana');
        assert.equal(await page.getByRole('progressbar').getAttribute('value'), '3000');
        await page.getByText('Perfil em análise', { exact: true }).waitFor();
        await page.getByText('Bônus liberado', { exact: true }).waitFor();
        await page.setViewportSize({ width: 360, height: 780 });
        fs.mkdirSync('scratch/referrals', { recursive: true });
        await page.screenshot({ path: 'scratch/referrals/mobile.png', fullPage: true });
        assert.deepEqual(errors, []);
        console.log('PASS: referral states, progress, copy link and layout at 320/360/768/1280px.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
