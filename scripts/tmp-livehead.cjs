/* 临时验证：平台订单分流＝操作按钮，置于店铺头部右端 */
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

  const head = page.locator('.rc-store').first().locator('.rc-store-head');
  const link = head.locator('.rc-link:has-text("平台订单分流")');
  const refresh = head.locator('button:has-text("刷新店铺数据")');
  results['link.exists'] = (await link.count()) === 1;
  results['rate.kept'] = (await head.locator('.rc-store-m:has-text("回复率")').count()) === 1;

  const headBox = await head.boundingBox();
  const linkBox = await link.boundingBox();
  const refBox = await refresh.boundingBox();
  /* 位于刷新按钮右侧（操作组），且贴近头部右端 */
  results['pos.rightOfRefresh'] = !!linkBox && !!refBox && linkBox.x > refBox.x + refBox.width - 2;
  results['pos.rightEdge'] = !!linkBox && !!headBox && Math.abs(headBox.x + headBox.width - (linkBox.x + linkBox.width)) < 8;
  /* 与头部指标同一行（未换行掉队） */
  const nameBox = await head.locator('.rc-store-name').boundingBox();
  results['pos.sameLine'] = !!linkBox && !!nameBox && Math.abs(linkBox.y + linkBox.height / 2 - (nameBox.y + nameBox.height / 2)) < 20;

  await page.screenshot({ path: `${OUT}/rc-verify-live-head.png` });
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
