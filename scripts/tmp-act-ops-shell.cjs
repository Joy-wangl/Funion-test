/* 验证：运维管理后台壳 监控列表「问题处理」弹窗仅责任部门节、无关联ID入口 */
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
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const r = {};
  await clickByText(page, '.top-tabs-item', '运维管理后台');
  await page.waitForTimeout(400);
  await clickByText(page, '.qc-side .qc-nav', '监控列表');
  await page.waitForSelector('.qc-center-page tbody tr');
  await page.waitForTimeout(400);
  const ops = await page.evaluate(() => {
    const tr = document.querySelector('.qc-center-page tbody tr');
    return [...tr.querySelectorAll('.qc-op-col a')].map((a) => a.textContent.trim());
  });
  console.log('ops:', JSON.stringify(ops));
  r['ops.noCodesLink'] = !ops.includes('关联ID') && ops.includes('问题处理');
  await clickByText(page, '.qc-center-page tbody tr .qc-op-col a', '问题处理');
  await page.waitForSelector('.qc-act');
  await page.waitForTimeout(250);
  const modal = await page.evaluate(() => {
    const m = document.querySelector('.pm-page .modal');
    return {
      secs: [...m.querySelectorAll('.qc-act-t')].map((x) => x.textContent.trim()),
      hasTable: !!m.querySelector('.qc-act-tb'),
      depts: m.querySelectorAll('.qc-act-depts .duty-opt').length,
    };
  });
  console.log('modal:', JSON.stringify(modal));
  r['modal.dutyOnly'] = JSON.stringify(modal.secs) === JSON.stringify(['责任部门']) && !modal.hasTable && modal.depts >= 4;
  /* 选一个部门并确认 */
  const dept = await page.evaluate(() => {
    const t = [...document.querySelectorAll('.qc-act-depts .duty-opt')].find((o) => !o.textContent.includes('自动归属'));
    t.click();
    return t.textContent.trim();
  });
  await page.waitForTimeout(200);
  await clickByText(page, '.pm-page .modal .modal-foot .btn', '确认');
  await page.waitForTimeout(400);
  const t = await page.evaluate(() => {
    const x = [...document.querySelectorAll('.toast .msg')];
    return x.length ? x[x.length - 1].textContent.trim() : '';
  });
  console.log('toast:', t);
  r['toast.duty'] = t.includes(`责任部门已改为「${dept}」`);
  await page.screenshot({ path: 'D:/PM.funion/screenshots/act-modal-ops-shell.png' });
  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
