/* 临时验证：Funion-智能运营中心.html 单文件导出（file:// 离线打开）
   覆盖：渲染 / 品牌logo / 全量图片加载 / 动态平台logo（发布到抽屉）/ 页面切换 / 控制台报错 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const { pathToFileURL } = require('node:url');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const results = {};

  const url = pathToFileURL('d:/Qoder/Funion/Funion-智能运营中心.html').href;
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('.ops-center', { timeout: 30000 });

  /* 1. 外壳与品牌 */
  results['title'] = (await page.title()) === '智能运营中心';
  results['brand'] = (await page.locator('.ops-brand-name').textContent()) === '智能运营中心';
  const brandOk = await page.locator('.ops-brand-logo').evaluate((img) => img.complete && img.naturalWidth > 0);
  results['brandLogo'] = brandOk;

  /* 2. 默认页（内部商机）渲染 + 全量图片加载检查 */
  await page.waitForTimeout(600);
  results['defaultPage'] = await page.locator('.ops-center .subnav.active, .ops-center .nav.active').first().isVisible();
  const imgs = await page.locator('.ops-center img').all();
  let broken = [];
  for (const img of imgs) {
    const ok = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
    if (!ok) broken.push(await img.getAttribute('src'));
  }
  results['imgsTotal'] = imgs.length;
  results['imgsBroken'] = broken.length === 0 ? 'none' : broken.slice(0, 5).join(',');
  await page.screenshot({ path: `${OUT}/ops-html-verify-internal.png` });

  /* 3. 运营驾驶舱 */
  await page.click('.ops-center .nav-text:has-text("运营驾驶舱")');
  await page.waitForSelector('.dash-toolbar', { timeout: 10000 });
  results['dashboard'] = await page.locator('.dash-toolbar').isVisible();
  await page.screenshot({ path: `${OUT}/ops-html-verify-dashboard.png` });

  /* 4. 商品创建-淘宝 → 发布到抽屉 → 第二步店铺列表（动态 /logos/${...}.png 改写验证） */
  await page.click('.ops-center .nav-text:has-text("商品创建")');
  await page.waitForSelector('.ops-center .subnav:has-text("淘宝")', { timeout: 10000 });
  await page.click('.ops-center .subnav:has-text("淘宝")');
  await page.waitForSelector('.create-table', { timeout: 10000 });
  await page.locator('.create-table a:has-text("发布到")').first().click();
  await page.waitForSelector('.cp-pub-drawer', { timeout: 10000 });
  /* 第一步：选发布方式 → 下一步，进入第二步店铺列表 */
  await page.locator('.cp-pub-radios label:has-text("直接上架")').click();
  await page.locator('.cp-pub-foot .cp-btn.primary:has-text("下一步")').click();
  await page.waitForSelector('.cp-pub-shop', { timeout: 10000 });
  await page.waitForTimeout(400);
  const shopImgs = await page.locator('.cp-pub-shop img').all();
  let shopBroken = [];
  for (const img of shopImgs) {
    const ok = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
    if (!ok) shopBroken.push(await img.getAttribute('src'));
  }
  results['pubDrawerShopImgs'] = `${shopImgs.length} 张，失效：${shopBroken.length === 0 ? '无' : shopBroken.join(',')}`;
  await page.screenshot({ path: `${OUT}/ops-html-verify-pubdrawer.png` });
  await page.locator('.cp-drawer-mask').click({ position: { x: 20, y: 20 } });
  await page.waitForSelector('.cp-pub-drawer', { state: 'detached', timeout: 10000 });

  /* 5. 权限设置子页（复用 permission 基础层；.pm-page 无自身盒模型，改断言表格可见） */
  await page.click('.ops-center .nav-text:has-text("权限设置")');
  await page.waitForSelector('.ops-center .subnav:has-text("成员管理")', { timeout: 10000 });
  await page.click('.ops-center .subnav:has-text("成员管理")');
  await page.waitForTimeout(500);
  results['permPage'] = await page.locator('.pm-page table').first().isVisible();
  await page.screenshot({ path: `${OUT}/ops-html-verify-perm.png` });

  results['consoleErrors'] = errors.length === 0 ? 'none' : errors.slice(0, 5).join(' | ');
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  const fail = Object.entries(results).filter(([k, v]) =>
    ['title', 'brand', 'brandLogo', 'dashboard', 'permPage'].includes(k) && v !== true);
  if (fail.length || errors.length || broken.length || shopBroken.length) process.exit(1);
})();
