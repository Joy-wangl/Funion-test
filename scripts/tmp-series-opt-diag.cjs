/* 诊断：监控列表首列结构 / 优化任务标签位置 / 筛选后总数 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1760, height: 1040 } });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '监控列表')?.click());
  await page.waitForSelector('.qc-center-page table.qc-wide tbody tr', { timeout: 30000 });
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const tbls = [...document.querySelectorAll('.qc-center-page table.qc-wide')];
    const trs = tbls.flatMap((t) => [...t.querySelectorAll('tbody tr')]).filter((t) => !t.classList.contains('expand-row'));
    const tr = trs.find((t) => [...t.querySelectorAll('.qc-op-col a')].some((a) => a.textContent.trim() === '查看优化任务'));
    return {
      tables: tbls.length,
      rows: trs.length,
      cells: [...(tr ?? trs[0]).children].map((td, i) => `${i}:${td.className}|${td.textContent.trim().slice(0, 30)}`),
      tagCell: tr ? [...tr.children].findIndex((td) => td.querySelector('.qc-sg-opttag')) : -1,
      tagCount: document.querySelectorAll('.qc-center-page .qc-sg-opttag').length,
      total: [...document.querySelectorAll('.qc-center-page .ib-pagination, .qc-center-page [class*="pag"]')].map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 80)),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
