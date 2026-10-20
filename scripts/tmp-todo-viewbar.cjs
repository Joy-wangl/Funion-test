/* 查看态顶带白底＋底栏白底分割线按钮靠右 验证 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === '待办任务')?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.replace(/\s/g, '').endsWith('待处理的'))?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.querySelector('.qc-todo-card')?.click(); });
  await page.waitForTimeout(700);
  const out = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-handle-drawer');
    const idbar = d?.querySelector('.qhd-idbar');
    const bar = d?.querySelector('.qhd-bar');
    const foot = bar?.querySelector('.qhd-foot');
    const btns = [...(foot?.querySelectorAll('.btn') ?? [])];
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const dr = d?.getBoundingClientRect();
    const lr = btns.length ? btns[btns.length - 1].getBoundingClientRect() : null;
    return {
      idbarBg: cs(idbar)?.backgroundColor,
      barBg: cs(bar)?.backgroundColor,
      barBorderTop: cs(bar)?.borderTopWidth + ' ' + cs(bar)?.borderTopColor,
      barShadow: cs(bar)?.boxShadow,
      footJustify: cs(foot)?.justifyContent,
      gapRight: dr && lr ? Math.round(dr.right - lr.right) : null,
      btns: btns.map((b) => b.textContent.trim()),
      bodyBg: cs(d?.querySelector('.qhd-body'))?.backgroundColor,
    };
  });
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-view-whitebar.png' });
  out.errs = errs;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
