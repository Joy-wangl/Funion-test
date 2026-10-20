const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const BASE = 'http://127.0.0.1:5173/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => { [...document.querySelectorAll('.top-tabs-item')].find(e => e.textContent.includes('品控-线上'))?.click(); });
  await page.waitForTimeout(500);

  // sample every 25ms while each mock list mounts; flag any frame where loading + empty-state coexist
  const samples = { flash: 0, loadingFrames: 0, emptyFrames: 0, total: 0 };
  await page.exposeFunction('__noop', () => {});
  const check = async (navText) => {
    await page.evaluate((t) => { [...document.querySelectorAll('.qc-side *')].filter(e => e.children.length === 0 && e.textContent.trim() === t)[0]?.click(); }, navText);
    for (let i = 0; i < 40; i++) {
      const s = await page.evaluate(() => {
        const tbl = document.querySelector('.qc-center-page table');
        if (!tbl) return null;
        const loading = tbl.classList.contains('is-loading');
        const emptyTxt = /暂无数据|无匹配/.test(tbl.textContent);
        return { loading, emptyTxt };
      });
      if (s) { samples.total++; if (s.loading) samples.loadingFrames++; if (s.emptyTxt) samples.emptyFrames++; if (s.loading && s.emptyTxt) samples.flash++; }
      await page.waitForTimeout(25);
    }
  };
  for (const nav of ['监控列表', '店铺列表', '店铺商品', '售后列表', '评价列表']) await check(nav);
  console.log('SAMPLES', JSON.stringify(samples));
  console.log(samples.flash === 0 ? 'NO-FLASH PASS' : 'FLASH FAIL: ' + samples.flash);
  await browser.close();
})();
