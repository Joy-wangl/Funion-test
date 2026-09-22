/* 验证：发布到抽屉离线店铺禁选＋前往登录桥接账号管理（卖家离线账号同源） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  if (!(await page.locator('.subnav:text-is("淘宝")').first().isVisible().catch(() => false))) {
    await page.click('.nav-text:has-text("商品创建")');
  }
  await page.click('.subnav:text-is("淘宝")');
  await page.waitForSelector('section.page.show .create-table:visible');

  /* 打开发布到抽屉 → 第一步选策略 → 第二步选店铺 */
  await page.locator('a:has-text("发布到")').locator('visible=true').first().click();
  await page.waitForSelector('.cp-pub-drawer');
  await page.locator('.cp-pub-strat:has-text("13245")').click();
  await page.locator('.cp-pub-drawer button:has-text("下一步")').click();
  await page.locator('.cp-pub-caret').first().click();
  await page.waitForSelector('.cp-pub-shop:visible');

  /* 离线店铺：万福日用百货 / 云朵礼遇（账号管理卖家离线账号同源） */
  const offRows = page.locator('.cp-pub-shop.offline');
  results['off.twoRows'] = (await offRows.count()) === 2;
  const offTxt = (await offRows.allTextContents()).join('|');
  results['off.names'] = offTxt.includes('万福日用百货') && offTxt.includes('云朵礼遇');
  results['off.badge'] = (await page.locator('.cp-pub-shop.offline .cp-pub-offline:text-is("离线")').count()) === 2;
  results['off.checkDisabled'] = (await page.locator('.cp-pub-shop.offline input.ib-check').evaluateAll((els) => els.every((e) => e.disabled))) === true;
  /* 在线店铺仍可勾选 */
  results['off.onlineEnabled'] = await page.locator('.cp-pub-shop:not(.offline) input.ib-check').first().isEnabled();
  /* 全选不含离线：淘宝 14 店 - 离线 2 = 12 */
  await page.locator('.cp-pub-group-head input.ib-check').click();
  results['off.selectAllSkipOffline'] = (await page.locator('.cp-pub-footinfo').textContent()).includes('共 12 个店铺');
  await page.locator('.cp-pub-group-head input.ib-check').click();
  await page.locator('.cp-pub-shop.offline', { hasText: '万福日用百货' }).screenshot({ path: `${OUT}/tmp-puboff.png` });

  /* 前往登录：关抽屉 → 账号管理页 + 管理抽屉落在该离线账号 */
  await page.locator('.cp-pub-shop.offline', { hasText: '万福日用百货' }).locator('.cp-pub-gologin').click();
  results['off.drawerClosed'] = (await page.locator('.cp-pub-drawer').count()) === 0;
  await page.waitForSelector('.smg-drawer:visible');
  const acctName = await page.locator('.smg-dr-field:has-text("账号名称") input').inputValue();
  results['off.acctDrawer'] = acctName.includes('万福日用百货');
  results['off.drGoLogin'] = await page.locator('.smg-dr-foot button:has-text("前往登录")').isVisible();
  results['off.badge6'] = (await page.locator('.ops-nav-badge').first().textContent()) === '6';
  await page.screenshot({ path: `${OUT}/tmp-puboff-am.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
