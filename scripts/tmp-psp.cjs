/* 临时验证：平台/店铺配置抽屉百店量级交互（默认收起＋搜索过滤＋caret 展开不误勾选） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.top-tabs-item', { timeout: 60000 });

  /* 设置 → 角色管理 → 打开第一个范围配置抽屉 */
  await page.click('.ops-center .nav-parent:has-text("设置")');
  await page.click('.ops-center .subnav:text-is("角色管理")');
  await page.waitForSelector('.og-tab', { timeout: 30000 });
  await page.click('.og-tab:text-is("权限配置")');
  await page.waitForSelector('.perm-scope .link', { timeout: 30000 });
  await page.locator('.perm-scope .link').first().click();
  await page.waitForSelector('.psp-drawer', { timeout: 10000 });

  const sum = () => page.locator('.psp-sum').textContent();
  const visShops = () => page.locator('.psp-shops:visible').count();

  /* 1. 默认全收起：8 平台卡、0 展开店铺区、8 个 caret */
  results['plats8'] = (await page.locator('.psp-plat').count()) === 8;
  results['collapsedDefault'] = (await visShops()) === 0;
  results['carets8'] = (await page.locator('.psp-caret').count()) === 8;

  /* 2. caret 展开第一组：店铺区可见 2 行；展开动作不改变已选汇总 */
  const sum0 = await sum();
  await page.locator('.psp-plat').nth(0).locator('.psp-caret').click();
  results['expand1'] = (await visShops()) === 1 && (await page.locator('.psp-plat').nth(0).locator('.psp-shop:visible').count()) === 2;
  results['caretNoSel'] = (await sum()) === sum0;
  results['caretOpen'] = await page.locator('.psp-plat').nth(0).locator('.psp-caret.open').count() === 1;

  /* 3. 单店勾选/取消：行高亮与汇总同步 */
  const shopRow = page.locator('.psp-plat').nth(0).locator('.psp-shop:visible').first();
  await shopRow.click();
  const sum1 = await sum();
  results['shopOn'] = (await shopRow.count()) === 1 && (await page.locator('.psp-plat').nth(0).locator('.psp-shop.on:visible').count()) === 1 && sum1 !== sum0;
  await shopRow.click();
  results['shopOff'] = (await sum()) === sum0;

  /* 4. 收起第一组；收起态点平台头整组勾选翻转（该 scope 默认全选，按状态翻转断言）再还原 */
  await page.locator('.psp-plat').nth(0).locator('.psp-caret').click();
  results['collapse1'] = (await visShops()) === 0;
  const chip1 = () => page.locator('.psp-plat').nth(1).locator('.psp-count').textContent();
  const c0 = await chip1();
  await page.locator('.psp-plat').nth(1).locator('.psp-plat-head .psp-name').click();
  const c1 = await chip1();
  const s1 = await sum();
  await page.locator('.psp-plat').nth(1).locator('.psp-plat-head .psp-name').click();
  results['platToggle'] = c1 !== c0 && (await chip1()) === c0 && (await sum()) === sum0 && s1 !== sum0;

  /* 5. 搜索 Funion：命中 3 组强制展开、5 行店铺；清除钮恢复全量收起态 */
  await page.fill('.psp-search input', 'Funion');
  results['searchGroups'] = (await page.locator('.psp-plat').count()) === 3;
  results['searchOpen'] = (await visShops()) === 3 && (await page.locator('.psp-shop:visible').count()) === 5;
  results['clearBtn'] = await page.locator('.psp-clear').isVisible();
  await page.screenshot({ path: `${OUT}/tmp-psp-search.png` });
  await page.click('.psp-clear');
  results['clearReset'] = (await page.inputValue('.psp-search input')) === '' && (await page.locator('.psp-plat').count()) === 8 && (await visShops()) === 0;

  /* 6. 无命中空态 */
  await page.fill('.psp-search input', 'zzz');
  results['empty'] = (await page.locator('.psp-empty').textContent()) === '无匹配店铺';

  await page.fill('.psp-search input', '');
  await page.locator('.psp-plat').nth(3).locator('.psp-caret').click();
  await page.screenshot({ path: `${OUT}/tmp-psp.png` });

  console.log(JSON.stringify(results, null, 2));
  const fail = Object.entries(results).filter(([, v]) => v !== true);
  console.log(fail.length ? `FAIL ${fail.length}: ${fail.map(([k]) => k).join(',')}` : 'ALL PASS');
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
