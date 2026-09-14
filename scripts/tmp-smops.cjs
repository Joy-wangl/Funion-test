/* 顺买头部「前往智能运营中心」按钮验证：
   1) 按钮位于头部操作区（使用教程左侧、同排），含 LOGO 图与文字；
   2) 侧栏底部旧入口已移除；
   3) 点击跨应用跳转：顶层 tab 激活智能运营中心且 ops-center 挂载。
   截图注意：node 子进程写工作区外会被沙箱虚拟化，先落 .shots-tmp 再 Copy-Item 到 screenshots/ */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/.shots-tmp';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.click('text=顺买商机');
  await page.waitForSelector('.sm-login-btn');
  await page.click('.sm-login-btn');
  await page.waitForSelector('.sm-head-actions .sm-ops-go');

  /* 1) 头部按钮：LOGO + 文字，与使用教程同排且在其左侧 */
  const btn = page.locator('.sm-head-actions .sm-ops-go');
  results.headBtn =
    (await btn.count()) === 1 &&
    (await btn.locator('img[src="/logos/ops-logo.png"]').count()) === 1 &&
    ((await btn.innerText()).trim() === '前往智能运营中心');
  const boxes = await page.evaluate(() => {
    const g = document.querySelector('.sm-head-actions .sm-ops-go').getBoundingClientRect();
    const t = [...document.querySelectorAll('.sm-head-actions .sm-btn')].find((b) => b.textContent.includes('使用教程')).getBoundingClientRect();
    return { sameRow: Math.abs(g.top - t.top) < 4, leftOf: g.right <= t.left + 1, sameHeight: Math.abs(g.height - t.height) < 2 };
  });
  results.headPos = boxes.sameRow && boxes.leftOf && boxes.sameHeight;

  /* 2) 侧栏旧入口已移除 */
  results.noSideEntry = (await page.locator('.sm-side-entry').count()) === 0;

  /* 截图：头部按钮区 */
  await page.screenshot({ path: `${OUT}/sm-verify-opsentry.png` });

  /* 3) 点击跨应用跳转 */
  await btn.click();
  await page.waitForSelector('.ops-center');
  const activeTab = await page.evaluate(() => document.querySelector('.top-tabs-item.is-active')?.textContent?.trim());
  results.tabActive = activeTab === '智能运营中心';

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'ALL PASS' : `${fail} FAILED`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
