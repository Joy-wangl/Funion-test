/* 验证：淘宝/视频号详情编辑态——属性值图标移除 ◉ 圆点、🗑 表情改为规范删除 SVG icon */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
const P = '.page.show';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const r = {};

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');
  const sub = page.locator('.ops-center .side .subnav:has-text("淘宝")');
  if (!(await sub.isVisible())) {
    await page.click('.ops-center .side .nav-parent:has-text("商品创建")');
    await sub.waitFor({ state: 'visible' });
  }
  await sub.click();
  await page.waitForSelector(`${P} .create-page td.create-ops a`);
  await page.locator(`${P} .create-page td.create-ops a:has-text("详情")`).first().click();
  await page.waitForSelector(`${P} .cpd-top-acts`);
  await page.locator(`${P} .cpd-top-acts .sg-btn:text-is("编辑")`).click();
  await page.waitForTimeout(200);

  const firstCard = page.locator(`${P} .cpd-spec-card`).first();
  /* 每个属性值仅 1 个删除 icon（SVG），首卡 2 值 → 2 个 */
  r.oneIconPerValue = (await firstCard.locator('.cpd-spec-input .cpd-ico').count()) === 2;
  r.iconIsSvg = (await firstCard.locator('.cpd-spec-input .cpd-ico svg').count()) === 2;
  r.noCircle = !((await firstCard.locator('.cpd-spec-input').allTextContents()).join('')).includes('◉');
  r.noEmoji = !((await firstCard.locator('.cpd-spec-input').allTextContents()).join('')).includes('🗑');
  r.dangerColor = (await firstCard.locator('.cpd-spec-input .cpd-ico.danger').count()) === 2;
  await page.screenshot({ path: `${OUT}/cpd-spec-icon.png`, fullPage: true });

  r.errors = errors.length === 0;
  if (errors.length) console.log('CONSOLE ERRORS:', errors);
  const fail = Object.entries(r).filter(([, v]) => !v);
  console.log(fail.length ? `FAIL ${fail.length}:` : 'ALL PASS', JSON.stringify(r, null, 1));
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
