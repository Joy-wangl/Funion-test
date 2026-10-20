/* 探针：我发起 + 新优化类型页签 → 卡片与右侧详情(.qc-todo-detail) 类型闭环 */
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

  for (const pill of ['已处理的', '我发起的']) {
    await clickByText(page, 'button', pill);
    await page.waitForTimeout(300);
    for (const ty of ['系列编码优化', '商品编码优化']) {
      await clickByText(page, '.tc-typerow .tc-typeitem', ty);
      await page.waitForTimeout(300);
      const cards = await page.evaluate(() => [...document.querySelectorAll('.qc-todo-card .td-title')].map((e) => e.textContent.trim()));
      await page.evaluate(() => document.querySelector('.qc-todo-card')?.click());
      await page.waitForTimeout(300);
      const det = await page.evaluate(() => {
        const d = document.querySelector('.qc-todo-detail');
        if (!d) return 'no-detail';
        return (d.querySelector('.qd-id')?.textContent.trim() ?? '') + ' | ' + (d.querySelector('.qd-title, b')?.textContent.trim() ?? '');
      });
      console.log(`[${pill}][${ty}] cards=${JSON.stringify(cards)} detail=${det}`);
    }
  }
  await browser.close();
})();
