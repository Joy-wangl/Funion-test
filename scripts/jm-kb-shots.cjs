/* 京麦详情·推荐素材选用无头截图验证 */
const { chromium } = require('D:/PM.funion/.playwright/package');
const path = require('path');

const OUT = path.resolve(__dirname, '../.shots-tmp');

const shots = [
  { name: 'jm01-edit-tile', skipShot: true, steps: async (page) => {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.locator('.top-tabs-item', { hasText: '智能运营中心' }).first().click();
    await page.waitForTimeout(400);
    await page.locator('.side .nav-parent', { hasText: '商品创建' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('.subnav', { hasText: '京麦' }).first().click();
    await page.waitForTimeout(600);
    await page.locator('.create-ops a:visible', { hasText: '详情' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('.cpd-top-acts .sg-btn:visible', { hasText: '编辑' }).first().click();
    await page.waitForTimeout(400);
    const sec = page.locator('div.sgd-sec').filter({ hasText: '主图（方图）' }).first();
    await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await sec.screenshot({ path: path.join(OUT, 'jm01-edit-tile.png') });
  } },
  { name: 'jm02-drawer', steps: async (page) => {
    await page.locator('div.sgd-sec').filter({ hasText: '主图（方图）' }).first().locator('.cpd-upload-kb').click();
    await page.waitForTimeout(500);
  } },
  { name: 'jm03-select', steps: async (page) => {
    await page.locator('.kbp-card').nth(0).click();
    await page.waitForTimeout(150);
    // 跨编码累计勾选：依次切 TB-5102 / TB-5101 各选一张
    await page.locator('.kbp-code', { hasText: 'TB-5102' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('.kbp-card').nth(0).click();
    await page.waitForTimeout(150);
    await page.locator('.kbp-code', { hasText: 'TB-5101' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('.kbp-card').nth(0).click();
    await page.waitForTimeout(300);
  } },
  { name: 'jm04-applied', skipShot: true, steps: async (page) => {
    await page.locator('.kbp-ok').click();
    await page.waitForTimeout(500);
    const sec = page.locator('div.sgd-sec').filter({ hasText: '主图（方图）' }).first();
    await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await sec.screenshot({ path: path.join(OUT, 'jm04-applied.png') });
  } },
  { name: 'jm05-video-all', steps: async (page) => {
    const sec = page.locator('div.sgd-sec').filter({ hasText: '商品视频' }).first();
    await sec.scrollIntoViewIfNeeded();
    await sec.locator('.cpd-upload-kb').click();
    await page.waitForTimeout(400);
    await page.locator('.kbp-code', { hasText: 'TB-5101' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('.kbp-tab', { hasText: '全部' }).first().click();
    await page.waitForTimeout(300);
  } },
  { name: 'jm06-close', steps: async (page) => {
    await page.locator('.kbp-close').first().click();
    await page.waitForTimeout(300);
  } },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  for (const s of shots) {
    try {
      await s.steps(page);
      if (!s.skipShot) await page.screenshot({ path: path.join(OUT, s.name + '.png'), fullPage: false });
      console.log('OK', s.name);
    } catch (e) {
      console.error('FAIL', s.name, e.message);
    }
  }
  await browser.close();
})();
