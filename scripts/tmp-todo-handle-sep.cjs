const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === '待办任务')?.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.replace(/\s/g, '').endsWith('待处理的'))?.click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('.qc-todo-card')?.click());
  await page.waitForTimeout(500);

  const viewInfo = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-handle-drawer');
    return { opened: !!d, aifb: d ? d.querySelectorAll('.qhd-aifb-t,.qhd-q,.qhd-in,.qhd-ta,.qhd-radio').length : -1, foot: [...(d?.querySelectorAll('.qhd-foot .btn') ?? [])].map((b) => b.textContent.trim()) };
  });
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-handle-view-noaifb.png' });

  await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-handle-drawer');
    [...(d?.querySelectorAll('.qhd-foot .btn') ?? [])].find((b) => b.textContent.trim() === '处理')?.click();
  });
  await page.waitForTimeout(500);

  const handleInfo = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-handle-drawer');
    const fix = d?.querySelector('.qhd-fix');
    const comp = d?.querySelector('.qhd-compose');
    const body = d?.querySelector('.qhd-body');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      aifb: d ? d.querySelectorAll('.qhd-aifb-t,.qhd-aifb-s,.qhd-q,.qhd-qhead,.qhd-qsub,.qhd-in,.qhd-ta,.qhd-radio').length : -1,
      fixBg: cs(fix)?.backgroundColor,
      fixBorderTop: `${cs(fix)?.borderTopWidth} ${cs(fix)?.borderTopColor}`,
      fixShadow: cs(fix)?.boxShadow,
      compBg: cs(comp)?.backgroundColor,
      bodyBg: cs(body)?.backgroundColor,
      foot: [...(d?.querySelectorAll('.qhd-foot .btn') ?? [])].map((b) => b.textContent.trim()),
      tabs: [...(d?.querySelectorAll('.qd-tabs button') ?? [])].map((b) => b.textContent.trim()),
      onTab: d?.querySelector('.qd-tabs button.on')?.textContent.trim(),
    };
  });
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-handle-compose-band.png' });
  console.log(JSON.stringify({ viewInfo, handleInfo, errs }, null, 2));
  await browser.close();
})();
