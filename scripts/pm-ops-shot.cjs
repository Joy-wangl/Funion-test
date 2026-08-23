/* 验证：运营组管理-操作列顺序 + 转交专员一对一选人 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForTimeout(500);
  await page.click('.nav-parent:has-text("权限设置")');
  await page.waitForTimeout(300);
  await page.click('.subnav:has-text("运营组管理")');
  await page.waitForTimeout(500);

  // 展开第一个组（组长行/专员行操作列顺序）
  await page.screenshot({ path: `${OUT}/pm-ops-1-list.png` });

  // 转交专员 → 一对一选人弹窗
  await page.click('text=转交专员 >> visible=true >> nth=0');
  await page.waitForSelector('.member-transfer');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/pm-ops-2-transfer-spec.png` });

  await browser.close();
  console.log('pm ops shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
