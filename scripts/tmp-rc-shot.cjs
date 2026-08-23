/* 临时验证：聚合接待·转移会话仅在线可选 + 值班监控弹窗重排 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-view .rc-tree');

  const results = {};

  /* ---- 转移会话：仅在线可选 ---- */
  await page.click('.rc-row-agent .rc-btn-manual:has-text("转移会话")');
  await page.waitForSelector('.mask .modal .rc-casc');
  const memText = await page.textContent('.mask .rc-casc-members');
  results['tr.onlyOnline'] = !memText.includes('离线') && !memText.includes('小休') && memText.trim().length > 0;
  // 切换到一个含离线成员的组，计数应只统计在线（断言成员行均无离线/小休标签即可）
  await page.click('.mask .rc-casc-g:has-text("天猫一组")');
  await page.waitForTimeout(150);
  const memText2 = await page.textContent('.mask .rc-casc-members');
  results['tr.groupSwitchOnlyOnline'] = !memText2.includes('离线') && !memText2.includes('小休');
  await page.screenshot({ path: `${OUT}/vue-verify-rc-transfer.png` });
  await page.click('.mask .modal-foot button:has-text("取消")');
  await page.waitForSelector('.mask .modal', { state: 'detached' });

  /* ---- 值班监控：头部人员 + 下划线 tab + 右侧统计 ---- */
  await page.click('.rc-row-agent .rc-ops a:has-text("值班监控")');
  await page.waitForSelector('.mask .modal .rc-mon');
  results['mon.subPerson'] = ((await page.textContent('.mask .modal-head .m-sub')) ?? '').includes('ID:');
  results['mon.underlineTab'] = (await page.locator('.mask .rc-mon-tab.on').count()) === 1;
  results['mon.statsRight'] = (await page.locator('.mask .rc-mon-body .rc-mon-stats .rc-mon-stat').count()) === 7;
  // tab 切换
  await page.click('.mask .rc-mon-tab:has-text("登录状态")');
  await page.waitForTimeout(150);
  results['mon.tabSwitch'] = ((await page.textContent('.mask .rc-mon-legend')) ?? '').includes('登出');
  await page.screenshot({ path: `${OUT}/vue-verify-rc-monitor.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'RC VERIFY OK' : `RC VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
