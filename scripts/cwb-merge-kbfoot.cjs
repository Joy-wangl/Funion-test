const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.cwb-tabs button')].find((b) => b.textContent.trim() === '商品知识')?.click(); });
  await page.waitForTimeout(900);
  const st = await page.evaluate(() => {
    const body = document.querySelector('.cwb-board .cwb-body');
    const foot = document.querySelector('.cwb-kb-foot');
    const fr = foot?.getBoundingClientRect();
    const br = body.getBoundingClientRect();
    return { nav: [...document.querySelectorAll('.cwb-tabs button')].filter((b) => b.classList.contains('on')).map((b) => b.textContent.trim()), footBtns: [...(foot?.querySelectorAll('button') ?? [])].map((b) => b.textContent.trim()), footBottomGap: Math.round(window.innerHeight - (fr?.bottom ?? 0)), bodyBottom: Math.round(br.bottom), overlay: fr ? fr.top < br.bottom : false };
  });
  await page.screenshot({ path: 'D:/PM.funion/screenshots/cwb-merge-kbfoot.png' });
  console.log(JSON.stringify({ st, errors }));
  await browser.close();
})();
