const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  const navs = await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].map((n) => n.textContent.trim()));
  await page.evaluate(() => { [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === '店铺列表')?.click(); });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const has = document.body.textContent.includes('沐辰优选');
    const links = [...document.querySelectorAll('a')].filter((a) => a.textContent.trim() === '优化任务').length;
    const rowEl = [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && el.textContent.trim() === '沐辰优选').map((el) => el.closest('tr')?.className ?? el.parentElement?.className);
    return { has, links, rowEl: rowEl.slice(0, 3) };
  });
  console.log(JSON.stringify({ navs, info, errs }, null, 2));
  await browser.close();
})();
