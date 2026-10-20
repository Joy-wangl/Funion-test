/* 验证：权重配置页首平台切换（各平台权重不一致＋编辑回滚＋按平台持久化） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
const r = {};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const dims = () => page.evaluate(() => [...document.querySelectorAll('.qc-au-dim .qc-au-num')].map((i) => i.value));
  const gateNums = () => page.evaluate(() => [...document.querySelectorAll('.qc-au-gate-row .qc-au-num')].map((i) => i.value));
  const cycleOn = () => page.evaluate(() => document.querySelector('.qc-au-pill.on')?.textContent.trim());
  const indWs = () => page.evaluate(() => [...document.querySelectorAll('.qc-au-wtbl tbody tr td:nth-child(3) .qc-au-num')].map((i) => i.value));
  const plat = async (name) => {
    await page.evaluate((t) => [...document.querySelectorAll('.qc-au-platbar .tc-typeitem')].find((b) => b.textContent.includes(t)).click(), name);
    await page.waitForTimeout(200);
  };

  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '权重配置').click());
  await page.waitForSelector('.qc-au-platbar');
  r.tabs = await page.evaluate(() => [...document.querySelectorAll('.qc-au-platbar .tc-typeitem')].map((b) => b.textContent.trim() + (b.classList.contains('active') ? '*' : '')));
  r.logoOk = await page.evaluate(() => [...document.querySelectorAll('.qc-au-platbar .plat-logo')].every((i) => i.naturalWidth > 0));
  r.taobao = { dims: await dims(), cycle: await cycleOn() };
  await page.screenshot({ path: `${OUT}/audit-weight-plat-taobao.png` });

  await plat('抖音');
  r.douyin = { dims: await dims(), cycle: await cycleOn(), indW: await indWs() };
  await page.screenshot({ path: `${OUT}/audit-weight-plat-douyin.png` });

  await plat('快手');
  r.kuaishou = { dims: await dims(), gate: await gateNums() };

  /* 编辑中切平台：回滚当前平台改动并退出编辑 */
  await page.click('.qc-au-head button:has-text("编辑")');
  await page.fill('.qc-au-dim .qc-au-num', '45');
  await page.waitForTimeout(150);
  r.editingMid = await page.locator('.qc-au-foot').count();
  await plat('抖音');
  r.afterSwitchWhileEdit = { foot: await page.locator('.qc-au-foot').count(), dims: await dims() };
  await plat('快手');
  r.kuaishouRollback = await dims();

  /* 按平台持久化：抖音改 41/24/35（合计仍100，否则保存被校验拦截）→ 重载后仍在 */
  await plat('抖音');
  await page.click('.qc-au-head button:has-text("编辑")');
  const dimInputs = await page.$$('.qc-au-dim .qc-au-num');
  await dimInputs[0].fill('41');
  await dimInputs[1].fill('24');
  await page.click('.qc-au-foot button:has-text("保存配置")');
  await page.waitForTimeout(300);
  /* 重载后可能被并发 HMR 打回壳页：守卫重导航直到权重配置页就位 */
  const navWeight = async () => {
    for (let i = 0; i < 4; i++) {
      try {
        await page.evaluate(() => { const el = [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '权重配置'); if (el) el.click(); });
        await page.waitForSelector('.qc-au-platbar', { timeout: 3000 });
        return;
      } catch {
        await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
      }
    }
    throw new Error('navWeight: 权重配置页无法就位');
  };
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await navWeight();
  await plat('抖音');
  r.douyinPersist = await dims();
  await plat('淘宝');
  r.taobaoAfter = await dims();
  /* 清理：抖音恢复默认并保存 */
  await plat('抖音');
  await page.click('.qc-au-head button:has-text("编辑")');
  await page.click('.qc-au-foot button:has-text("恢复默认")');
  await page.click('.qc-au-foot button:has-text("保存配置")');
  await page.waitForTimeout(300);
  r.douyinReset = await dims();

  r.errors = errors.slice(0, 6);
  fs.writeFileSync('D:/PM.funion/scripts/tmp-audit-plat.json', JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message.split('\n')[0]); console.log(JSON.stringify(r, null, 2)); process.exit(1); });
