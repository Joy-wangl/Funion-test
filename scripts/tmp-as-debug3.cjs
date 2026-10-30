const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.click('.top-tabs-item:has-text("AI作图中心")');
  await page.waitForSelector('.as-wb', { timeout: 30000 });
  await page.waitForTimeout(1000);

  const acts = await page.locator('.as-act').all();
  console.log('found .as-act count', acts.length);
  for (let i = 0; i < acts.length; i++) {
    const txt = await acts[i].innerText();
    const on = await acts[i].evaluate((el) => el.classList.contains('on'));
    console.log(i, txt.split('\n')[0], 'on=', on);
  }

  // click first one via JS
  await page.locator('.as-act').first().evaluate((el) => el.click());
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/as-debug5.png` });

  const onAfter = await page.locator('.as-act').first().evaluate((el) => el.classList.contains('on'));
  console.log('first act on after click:', onAfter);
  await browser.close();
})();
