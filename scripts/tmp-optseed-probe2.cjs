/* 探针2：我发起 下 全部 / 商品编码优化 的卡片清单，定位 TD-011 归属 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const BASE = 'http://127.0.0.1:5173/';
const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav-text', '待办任务');
  await page.waitForTimeout(600);
  await clickByText(page, 'button', '我发起的');
  await page.waitForTimeout(400);
  const dump = () => page.evaluate(() => ({
    pill: [...document.querySelectorAll('button')].filter((b) => b.className.includes('pill') || b.closest('.qc-todo-pills')).map((b) => b.textContent.trim() + (b.className.includes('active') || b.className.includes('on') ? '*' : '')),
    cards: [...document.querySelectorAll('.qc-todo-card .td-title')].map((e) => e.textContent.trim()),
    activeTab: [...document.querySelectorAll('.tc-typeitem')].filter((b) => b.className.includes('active')).map((b) => b.textContent.trim()),
  }));
  console.log('mine+全部:', JSON.stringify(await dump()));
  await clickByText(page, '.tc-typerow .tc-typeitem', '商品编码优化');
  await page.waitForTimeout(400);
  console.log('mine+商品编码优化:', JSON.stringify(await dump()));
  await browser.close();
})();
