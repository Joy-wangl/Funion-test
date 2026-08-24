/* 临时验证：我的创作→编辑应用 打开编辑页且回填 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLEERROR:', m.text()); });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-side-user');

  const results = {};
  await page.click('.ap-side-user');
  await page.waitForSelector('.ap-mine-head');
  results['mine.view'] = true;

  await page.click('.ap-grid.mine .ap-act.caret >> nth=0');
  await page.waitForSelector('.ap-menu button:has-text("编辑应用")');
  results['mine.menuEdit'] = true;
  await page.click('.ap-menu button:has-text("编辑应用")');
  await page.waitForSelector('.ap-create');
  results['edit.heading'] = (await page.locator('.ap-create h2').textContent())?.trim() === '编辑应用';
  results['edit.namePrefilled'] = (await page.locator('.ap-create input').first().inputValue()) === '勤劳小蜜蜂';

  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-acedit.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'ACEDIT VERIFY OK' : `ACEDIT VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
