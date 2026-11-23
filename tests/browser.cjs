const assert = require('node:assert/strict');
const { mkdir, readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { chromium } = require('playwright');

const target = process.env.LOOPSTOCK_URL || 'http://127.0.0.1:4173';
const shots = resolve(__dirname, '../../shots');

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: process.env.HEADED !== '1' });
  const errors = [];
  function watch(page) {
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(request.url() + ': ' + request.failure().errorText));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
  }

  try {
    await mkdir(shots, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
    watch(page);
    assert.equal((await page.goto(target)).status(), 200);
    await page.locator('#fallback').waitFor();
    assert.equal(await page.locator('#fallback').textContent(), '42');
    const fragmentTargets = await page.locator('a[href^="#"]').evaluateAll(links =>
      links.map(link => Boolean(document.getElementById(link.hash.slice(1)))));
    assert.ok(fragmentTargets.every(Boolean));
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to planner');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'planner');
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: resolve(shots, '01-overview.png') });

    await page.getByRole('link', { name: 'Try the campus demo' }).click();
    assert.equal(await page.locator('#reused').textContent(), '508');
    assert.equal(await page.locator('#minimum').textContent(), '282');
    await page.getByRole('button', { name: 'Stress test' }).click();
    assert.equal(await page.locator('#fallback').textContent(), '149');
    assert.equal(await page.locator('#minimum').textContent(), '389');
    await page.getByText('Wave breakdown').click();
    assert.equal(await page.locator('#table-body tr').count(), 6);
    await page.locator('#planner').evaluate(element => element.scrollIntoView());
    await page.screenshot({ path: resolve(shots, '02-stress-test.png') });

    await page.getByRole('button', { name: 'Use this stock' }).click();
    assert.equal(await page.locator('#stock').inputValue(), '389');
    assert.equal(await page.locator('#fallback').textContent(), '0');
    const downloadReady = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export plan CSV' }).click();
    const download = await downloadReady;
    assert.equal(download.suggestedFilename(), 'loopstock-plan.csv');
    const csv = await readFile(await download.path(), 'utf8');
    assert.match(csv, /stress,1,70,389,80,3,60,/);
    assert.equal(csv.trim().split('\r\n').length, 13);
    await page.screenshot({ path: resolve(shots, '03-stock-applied.png') });

    await page.getByLabel('Demand by wave').fill('12, nope, 9');
    assert.ok(await page.getByRole('button', { name: 'Export plan CSV' }).isDisabled());
    await page.getByRole('button', { name: 'Run plan' }).click();
    assert.equal(await page.locator('#demand').getAttribute('aria-invalid'), 'true');
    await page.getByLabel('Demand by wave').fill('12, 0, 9');
    await page.getByLabel('Starting cups').fill('5');
    await page.getByRole('button', { name: 'Run plan' }).click();
    assert.equal(await page.locator('#total').textContent(), '21');
    assert.equal(await page.locator('#plan-context').textContent(), 'Current plan · 3 service waves');
    await page.getByRole('link', { name: 'Try the campus demo' }).click();
    assert.equal(await page.locator('#fallback').textContent(), '42');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    watch(mobile);
    await mobile.goto(target);
    await mobile.getByRole('link', { name: 'Try the campus demo' }).tap();
    await mobile.getByRole('button', { name: 'Stress test' }).tap();
    assert.equal(await mobile.locator('#fallback').textContent(), '149');
    for (const width of [390, 320]) {
      await mobile.setViewportSize({ width, height: 844 });
      assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
    await mobile.getByRole('button', { name: 'Use this stock' }).tap();
    assert.equal(await mobile.locator('#fallback').textContent(), '0');
    await mobile.getByText('Wave breakdown').tap();
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await mobile.close();
    assert.deepEqual(errors, []);
    console.log('PASS: desktop + mobile demo, keyboard/anchors, stress, recommended stock, CSV, invalid/custom demand and no browser errors.');
    console.log('Chromium ' + browser.version() + ', 3 screenshots saved.');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
