/* 验证：京麦详情迭代——①移除「其它信息」②规格属性值图标换 SVG（属性图+删除）③规格→SKU 笛卡尔积联动 ④图片数量/必选限制 */
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
  const skuNames = async () => {
    const rows = page.locator(`${P} .jm-sku-table tbody tr`);
    const n = await rows.count();
    const out = [];
    for (let i = 0; i < n; i++) {
      const inp = rows.nth(i).locator('td').nth(1).locator('input');
      out.push((await inp.count()) ? (await inp.inputValue()) : (await rows.nth(i).locator('td').nth(1).textContent())?.trim());
    }
    return out;
  };

  /* 导航：智能运营中心 → 商品创建 → 京麦 → 详情 */
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');
  const sub = page.locator('.ops-center .side .subnav:has-text("京麦")');
  if (!(await sub.isVisible())) {
    await page.click('.ops-center .side .nav-parent:has-text("商品创建")');
    await sub.waitFor({ state: 'visible' });
  }
  await sub.click();
  await page.waitForSelector(`${P} .create-page td.create-ops a`);
  await page.locator(`${P} .create-page td.create-ops a:has-text("详情")`).first().click();
  await page.waitForSelector(`${P} .jm-detail`);

  /* ① 其它信息整块移除 */
  const secTitles = (await page.locator(`${P} .jm-detail .sgd-sec-title`).allTextContents()).map((t) => t.trim());
  r.noOtherSec = !secTitles.includes('其它信息');
  r.noKv = (await page.locator(`${P} .jm-detail .jm-kv`).count()) === 0;
  r.noRadio = (await page.locator(`${P} .jm-detail .cpd-radio`).count()) === 0;

  /* ④ 限制文案：数量上下限 + 必选 */
  const notes = (await page.locator(`${P} .jm-detail .sgd-note`).allTextContents()).join('|');
  r.limitMain = notes.includes('最少1张、最多10张') && notes.includes('必填');
  r.limitRect = notes.includes('非必填，最多1张') && notes.includes('rectangleImages');
  r.limitPc = notes.includes('productDetailDesc.desc：必填，最少1张');
  r.limitVideo = notes.includes('非必填，0~5个');
  const mediaTitles = (await page.locator(`${P} .jm-detail .sgd-sec-title`).allTextContents()).map((t) => t.trim());
  r.appOptional = mediaTitles.some((t) => t.includes('APP端') && t.includes('非必填'));

  /* 进入编辑态 */
  await page.locator(`${P} .cpd-top-acts .sg-btn:text-is("编辑")`).click();
  await page.waitForTimeout(200);

  /* ② 属性值图标：每值 2 个 SVG 图标（属性图+删除），无 ◉/🗑 字符 */
  const firstCard = page.locator(`${P} .cpd-spec-card`).first();
  r.icoCount = (await firstCard.locator('.cpd-spec-input .cpd-ico').count()) === 4; /* 2 值 × 2 图标 */
  r.icoSvg = (await firstCard.locator('.cpd-spec-input .cpd-ico svg').count()) === 4;
  r.noGlyph = !((await firstCard.locator('.cpd-spec-input').allTextContents()).join('')).includes('◉');
  r.specNote = (await page.locator(`${P} .jm-spec-note`).count()) === 1;

  /* ③ 笛卡尔积：初始 2×2=4 */
  r.skuInit = (await skuNames()).length === 4;
  await page.screenshot({ path: `${OUT}/jm-spec-edit.png`, fullPage: true });

  /* 新增规格值 B2（规格=尊享款）→ 2×3=6，含「黑色 尊享款」 */
  await page.locator(`${P} .cpd-spec-card`).nth(1).locator('.cpd-spec-add input').fill('尊享款');
  await page.locator(`${P} .cpd-spec-card`).nth(1).locator('.cpd-spec-add input').press('Enter');
  await page.waitForTimeout(200);
  const afterAdd = await skuNames();
  r.skuAfterAdd = afterAdd.length === 6 && afterAdd.includes('黑色 尊享款') && afterAdd.includes('白色 尊享款');
  await page.screenshot({ path: `${OUT}/jm-spec-sku6.png`, fullPage: true });

  /* 删除属性值（颜色=白色）→ 1×3=3 */
  await page.locator(`${P} .cpd-spec-card`).first().locator('.cpd-spec-cell').nth(1).locator('.cpd-ico.danger').click();
  await page.waitForTimeout(200);
  const afterDel = await skuNames();
  r.skuAfterDel = afterDel.length === 3 && afterDel.every((n) => (n ?? '').startsWith('黑色'));

  /* 属性图图标点击提示 */
  await page.locator(`${P} .cpd-spec-card`).first().locator('.cpd-spec-cell').first().locator('.cpd-ico:not(.danger)').click();
  await page.waitForSelector('.toast-wrap .toast');
  r.attrImgToast = ((await page.locator('.toast-wrap .toast').last().textContent()) ?? '').includes('属性图');

  r.errors = errors.length === 0;
  if (errors.length) console.log('CONSOLE ERRORS:', errors);
  const fail = Object.entries(r).filter(([, v]) => !v);
  console.log(fail.length ? `FAIL ${fail.length}:` : 'ALL PASS', JSON.stringify(r, null, 1));
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
