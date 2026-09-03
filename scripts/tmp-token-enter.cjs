/* 验证：令牌管理内层账号卡片新增「进入」按钮 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("令牌管理")');
  await page.waitForSelector('.token-manage');
  results['token.noCreateBtn'] = (await page.locator('.token-manage .tm-btn:has-text("新建令牌")').count()) === 0;
  /* 进入第一个平台卡片，查看账号令牌列表 */
  await page.click('.tm-plat-card:first-child');
  await page.waitForSelector('.tm-grid .tm-item');
  const enterLinks = page.locator('.tm-item-foot .tm-enter');
  results['token.enterCount'] = (await enterLinks.count()) > 0;
  results['token.enterText'] = ((await enterLinks.first().textContent()) || '').trim() === '进入';
  results['token.deleteStillThere'] = (await page.locator('.tm-item-foot a:has-text("删除")').count()) > 0;
  const firstCardTxt = (await page.locator('.tm-grid .tm-item').first().textContent()) || '';
  results['token.creator'] = firstCardTxt.includes('创建人') && firstCardTxt.includes('周梦琪');
  await page.screenshot({ path: `${OUT}/ops-verify-token-enter.png` });
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  Object.entries(results).forEach(([k, v]) => console.log(`${v ? 'PASS' : 'FAIL'}  ${k}`));
  console.log(fail.length ? `\n${fail.length} FAILED` : '\nALL PASS');
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
