/* 诊断2：优化任务筛选是否生效（读回选中值 + 共N条 + 行ops） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const snap = (page) => page.evaluate(() => {
  const fields = [...document.querySelectorAll('.qc-center-page .sg-field')];
  const f = fields.find((x) => x.querySelector('label')?.textContent.trim() === '优化任务');
  const trs = [...document.querySelectorAll('.qc-center-page table.qc-wide tbody tr')].filter((t) => !t.classList.contains('expand-row'));
  const total = [...document.querySelectorAll('.qc-center-page *')].map((e) => e.childElementCount === 0 ? e.textContent : '').find((t) => /共\s*\d/.test(t || '')) ?? '';
  return {
    sel: f?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    total: total.trim(),
    rows: trs.length,
    view: trs.filter((t) => [...t.querySelectorAll('.qc-op-col a')].some((a) => a.textContent.trim() === '查看优化任务')).length,
    create: trs.filter((t) => [...t.querySelectorAll('.qc-op-col a')].some((a) => a.textContent.trim() === '创建优化任务')).length,
    tags: document.querySelectorAll('.qc-center-page .qc-sg-opttag').length,
  };
});
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1760, height: 1040 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '监控列表')?.click());
  await page.waitForSelector('.qc-center-page table.qc-wide tbody tr', { timeout: 30000 });
  await page.waitForTimeout(600);
  console.log('default', JSON.stringify(await snap(page)));
  for (const v of ['优化中', '已结束', '无优化任务', '全部']) {
    await page.click('.qc-center-page .sg-field:has(label:text("优化任务")) .bselect-trigger');
    await page.waitForTimeout(300);
    const clicked = await page.evaluate((val) => {
      const o = [...document.querySelectorAll('.bselect-menu .bselect-opt')].find((e) => e.textContent.trim() === val);
      if (!o) return false;
      o.click(); return true;
    }, v);
    await page.waitForTimeout(300);
    const q = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.qc-center-page .sg-field-actions button')].find((x) => x.textContent.trim() === '查询');
      if (!b) return false; b.click(); return true;
    });
    await page.waitForTimeout(1200);
    console.log(v, 'clicked=' + clicked, 'query=' + q, JSON.stringify(await snap(page)));
  }
  console.log('errs', JSON.stringify(errs.slice(0, 4)));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
