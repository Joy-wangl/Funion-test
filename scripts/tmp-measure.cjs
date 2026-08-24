/* 临时：测量展开态收起按钮水平位置 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 1080 } });
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.click('.top-tabs-item:has-text("运营中心")');
  await p.waitForSelector('.ops-center .side');
  const s = await p.locator('.ops-center .side').boundingBox();
  const t = await p.locator('.ops-center .side-foot .ops-side-toggle').boundingBox();
  const v = await p.locator('.ops-center .side-foot .side-version').boundingBox();
  console.log('side', s.x, s.width, 'toggle', t.x, t.width, 'version', v.x, v.width);
  console.log('toggleCenter', t.x + t.width / 2, 'sideCenter', s.x + s.width / 2);
  await p.screenshot({ path: 'd:/Qoder/Funion/vue-verify-sidefoot.png', clip: { x: 0, y: 60, width: 220, height: 1020 } });
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
