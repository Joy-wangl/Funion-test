const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const logs = [];
  page.on('console', (m) => {
    const text = `[${m.type()}] ${m.text()}`;
    logs.push(text);
    console.log(text);
  });
  page.on('pageerror', (e) => {
    const text = `[pageerror] ${e.message}`;
    logs.push(text);
    console.log(text);
  });
  page.on('requestfailed', (req) => {
    const text = `[requestfailed] ${req.url()} ${req.failure()?.errorText || ''}`;
    logs.push(text);
    console.log(text);
  });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/debug-root.png` });
  fs.writeFileSync(`${OUT}/debug-root-logs.txt`, logs.join('\n'), 'utf-8');
  const topTabsCount = await page.locator('.top-tabs-item').count();
  const appHeaderCount = await page.locator('.app-header').count();
  console.log('top-tabs count:', topTabsCount);
  console.log('app-header count:', appHeaderCount);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
