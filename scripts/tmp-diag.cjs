/* 诊断：侧栏 LOGO 可点性 / 详芯片与主图垂直居中 / 批量弹窗横向溢出（多视口） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const VIEWPORTS = [
  { width: 1800, height: 900 },
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
];
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const out = [];
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('.top-tabs-item', { timeout: 60000 });
    await page.click('.top-tabs-item:has-text("智能运营中心")');
    await page.waitForSelector('.ops-center');
    if (!(await page.locator('.subnav:text-is("淘宝")').first().isVisible().catch(() => false))) {
      await page.click('.nav-text:has-text("商品创建")');
    }
    /* 1) 侧栏平台路由 tab 点击 */
    await page.click('.subnav:text-is("淘宝")');
    await page.waitForTimeout(300);
    const sideClick = {
      active: (await page.locator('.subnav:text-is("淘宝")').evaluate((el) => el.className)).includes('active'),
      table: await page.locator('section.page.show .create-table').isVisible().catch(() => false),
    };
    /* 2) 详芯片 vs 主图 垂直中心 */
    const centers = await page.locator('section.page.show .create-table tbody tr').first().evaluate((tr) => {
      const img = tr.querySelector('.create-thumb');
      const chip = tr.querySelector('.cp-quick-sku');
      const ri = img.getBoundingClientRect();
      const rc = chip.getBoundingClientRect();
      return { imgCy: Math.round(ri.top + ri.height / 2), chipCy: Math.round(rc.top + rc.height / 2) };
    });
    /* 3) 批量弹窗横向溢出 */
    await page.click('section.page.show .create-table tbody tr:nth-child(1) td:first-child .ib-check');
    await page.click('section.page.show .create-table tbody tr:nth-child(2) td:first-child .ib-check');
    await page.click('section.page.show .cp-selbar button:text-is("编辑商品信息")');
    await page.waitForSelector('.modal .cp-quick-table');
    const overflow = await page.locator('.modal').evaluate((m) => {
      const body = m.querySelector('.modal-body') || m;
      const tbl = m.querySelector('.cp-quick-table');
      return {
        modalW: m.clientWidth,
        bodyScrollW: body.scrollWidth,
        bodyClientW: body.clientWidth,
        tableScrollW: tbl.scrollWidth,
        tableClientW: tbl.clientWidth,
        hScroll: body.scrollWidth > body.clientWidth,
      };
    });
    await page.screenshot({ path: `d:/Qoder/Funion/screenshots/tmp-diag-${vp.width}.png` });
    out.push({ vp: vp.width, sideClick, centers, overflow });
    await page.close();
  }
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
