/* 临时验证：各店铺卡账号表同列位置一致（固定列宽、左对齐） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-page .rc-tree');
  await page.click('.rc-menu-item:has-text("实时客服接待")');
  await page.waitForSelector('.rc-live-stores');
  await page.waitForTimeout(300);

  const tables = page.locator('.rc-acc-table');
  const n = await tables.count();
  results['twoStores'] = n >= 2;

  /* 两张表各列表头 x 坐标一致（±2px） */
  const xsOf = async (t) => {
    const ths = t.locator('thead th');
    const out = [];
    for (let i = 0; i < (await ths.count()); i++) {
      const b = await ths.nth(i).boundingBox();
      out.push(b ? Math.round(b.x) : -1);
    }
    return out;
  };
  const a = await xsOf(tables.nth(0));
  const b = await xsOf(tables.nth(1));
  results['cols.aligned'] = JSON.stringify(a) === JSON.stringify(b);
  results['cols.leftAligned'] = a.every((x, i) => i === 0 || x > a[i - 1]);

  /* 账号名超长仍省略（fixed 布局不撑破） */
  results['name.ellipsis'] = (await page.locator('.rc-acc-name').first().evaluate((el) => getComputedStyle(el).textOverflow)) === 'ellipsis';

  await page.screenshot({ path: `${OUT}/rc-verify-live-cols.png`, fullPage: true });
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify({ colXs: a, colXs2: b, ...results }, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
