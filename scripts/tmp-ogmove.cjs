/* 临时验证：助理「移动至」— 改挂本组其它专员/组长、跨组挂组长 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("运营中心")');
  const ogEntry = page.locator('text=运营组管理').first();
  if (!(await ogEntry.isVisible().catch(() => false))) await page.click('text=权限设置');
  await ogEntry.click();
  await page.waitForSelector('.og-md');

  const results = {};
  await page.click('.og-md-item:has-text("黄亚芳大组")');
  await page.waitForSelector('.og-detail .og-tr:has-text("运营组长")');
  await page.click('.og-tr.spec:has-text("孙倩")');
  await page.waitForSelector('.og-tr.sub:has-text("何静")');

  /* ---------- A. 组内改挂：何静 孙倩→刘洋 ---------- */
  await page.click('.og-tr.sub:has-text("何静") button:has-text("移动至")');
  await page.waitForSelector('.modal:has-text("移动助理")');
  results['move.modalTitle'] = (await page.locator('.modal .m-title:has-text("移动助理")').count()) === 1;

  // 挂靠上级含组长选项
  await page.click('.modal .form-item:nth-child(2) .bselect-trigger');
  await page.waitForSelector('.bselect-menu');
  results['move.parentIncludesLeader'] = (await page.locator('.bselect-opt:has-text("（组长）")').count()) >= 1;
  await page.click('.bselect-opt:has-text("刘洋")');
  await page.click('.modal button:has-text("确认移动")');

  await page.waitForSelector('.og-tr.spec:has-text("刘洋") .og-g-count:has-text("2助理")');
  results['move.targetBadge2'] = true;
  results['move.sourceBadge2'] = (await page.locator('.og-tr.spec:has-text("孙倩") .og-g-count:has-text("2助理")').count()) === 1;

  /* ---------- B. 跨组改挂：罗彬 → 徐佳华大组·组长 ---------- */
  await page.click('.og-tr.sub:has-text("罗彬") button:has-text("移动至")');
  await page.waitForSelector('.modal:has-text("移动助理")');
  await page.click('.modal .form-item:nth-child(1) .bselect-trigger');
  await page.waitForSelector('.bselect-menu');
  await page.click('.bselect-opt:has-text("徐佳华大组")');
  // 挂靠上级自动代入目标组第一个候选（组长徐佳华）
  await page.waitForTimeout(100);
  results['move.crossParentAuto'] = (await page.locator('.modal .form-item:nth-child(2) .bselect-text:has-text("徐佳华（组长）")').count()) === 1;
  await page.click('.modal button:has-text("确认移动")');

  await page.click('.og-md-item:has-text("徐佳华大组")');
  await page.waitForSelector('.og-detail .og-tr:has-text("运营组长")');
  results['move.crossLeaderBadge'] = (await page.locator('.og-detail .og-tr:has-text("运营组长") .og-g-count:has-text("1助理")').count()) === 1;
  await page.click('.og-detail .og-tr:has-text("运营组长")');
  await page.waitForSelector('.og-detail .og-tr.sub:has-text("罗彬")');
  results['move.crossRowUnderLeader'] = true;

  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-ogmove.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'OGMOVE VERIFY OK' : `OGMOVE VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
