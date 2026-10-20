const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => ({
    overlay: document.querySelector('vite-error-overlay') ? document.querySelector('vite-error-overlay').shadowRoot.textContent.slice(0, 600) : null,
    topTabs: [...document.querySelectorAll('.top-tabs-item')].map(e => e.textContent.trim() + (e.className.includes('active') ? '*' : '')),
    navTexts: [...document.querySelectorAll('.qc-nav-text')].map(e => e.textContent.trim()),
    hash: location.hash,
  }));
  console.log(JSON.stringify(info, null, 2));
  console.log('ERRORS', errors.slice(0, 3));
  await browser.close();
})();
