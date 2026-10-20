const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

const clickByText = (page, sel, txt) => page.evaluate(([s, t]) => {
  const el = [...document.querySelectorAll(s)].find((b) => b.textContent.replace(/\s/g, '') === t || b.textContent.replace(/\s/g, '').endsWith(t));
  if (el) el.click();
  return !!el;
}, [sel, txt]);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === '待办任务')?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.replace(/\s/g, '').endsWith('待处理的'))?.click(); });
  await page.waitForTimeout(400);

  const out = {};
  // 1) 驳回：抽屉内联表单
  await page.evaluate(() => { [...document.querySelectorAll('.qc-todo-card')].find((c) => c.textContent.includes('保温杯主图与详情页专项优化'))?.click(); });
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-todo-handle-drawer .qhd-foot .btn', '驳回');
  await page.waitForTimeout(400);
  out.rejectForm = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-handle-drawer');
    return {
      modal: !!document.querySelector('.modal .m-title') && [...document.querySelectorAll('.modal .m-title')].map((m) => m.textContent.trim()),
      lab: d?.querySelector('.qhd-fixlab')?.textContent.trim(),
      ph: d?.querySelector('.qhd-compose textarea')?.placeholder,
      ups: [...(d?.querySelectorAll('.qhd-up') ?? [])].map((b) => b.textContent.trim()),
      pick: !!d?.querySelector('.qhd-pick'),
      foot: [...(d?.querySelectorAll('.qhd-foot .btn') ?? [])].map((b) => b.textContent.trim()),
    };
  });
  await clickByText(page, '.qc-todo-handle-drawer .qhd-foot .btn', '提交');
  await page.waitForTimeout(400);
  out.rejectEmptyToast = await page.evaluate(() => [...document.querySelectorAll('.toast, .toast-item, [class*=toast]')].map((t) => t.textContent.trim()).filter(Boolean));
  await page.evaluate(() => { const ta = document.querySelector('.qc-todo-handle-drawer .qhd-compose textarea'); if (ta) { ta.value = '主图问题已复现，但优化周期与现有排期冲突，请调整后再发起。'; ta.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.waitForTimeout(200);
  // 上传附件：hidden input 在抽屉根，actForm 态下落入 actFiles
  await page.setInputFiles('.qc-todo-handle-drawer input[type="file"]:not([accept])', ['D:/PM.funion/package.json']);
  await page.waitForTimeout(400);
  out.rejectChips = await page.evaluate(() => [...document.querySelectorAll('.qc-todo-handle-drawer .qhd-chips .qhd-chip')].map((c) => c.textContent.trim()));
  await page.evaluate(() => { document.querySelector('.qc-todo-handle-drawer .qhd-chips .qhd-chip em')?.click(); });
  await page.waitForTimeout(300);
  out.rejectChipsAfterDrop = await page.evaluate(() => document.querySelectorAll('.qc-todo-handle-drawer .qhd-chips .qhd-chip').length);
  await page.setInputFiles('.qc-todo-handle-drawer input[type="file"]:not([accept])', ['D:/PM.funion/package.json']);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-act-reject-inline.png' });
  await clickByText(page, '.qc-todo-handle-drawer .qhd-foot .btn', '提交');
  await page.waitForTimeout(600);
  out.afterReject = await page.evaluate(() => ({
    drawer: !!document.querySelector('.qc-todo-handle-drawer'),
    firstCard: document.querySelector('.qc-todo-card .td-title')?.textContent.trim().slice(0, 20),
  }));
  // 回写核验：已处理 → 被驳回卡 → 页抽屉默认驳回原因页签应含附件芯片
  await page.evaluate(() => { const p = [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.replace(/\s/g, '').endsWith('已处理的')); p?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const c = [...document.querySelectorAll('.qc-todo-card')].find((x) => (x.querySelector('.td-title')?.textContent ?? '').includes('保温杯')); c?.click(); });
  await page.waitForTimeout(600);
  out.rejectAttInDetail = await page.evaluate(() => ({
    tab: document.querySelector('.qc-todo-page-drawer .qd-tabs .on, .qc-todo-page-drawer [class*=tab].on')?.textContent.trim(),
    reason: document.querySelector('.qc-todo-page-drawer .qd-body')?.textContent.trim().slice(0, 40),
    atts: [...document.querySelectorAll('.qc-todo-page-drawer .qd-atts .qd-att, .qc-todo-page-drawer .qd-atts > *')].map((a) => a.textContent.trim()).slice(0, 4),
  }));
  await clickByText(page, '.qc-todo-page-drawer .qd-foot .btn', '关闭');
  await page.waitForTimeout(400);
  await page.evaluate(() => { const p = [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.replace(/\s/g, '').endsWith('待处理的')); p?.click(); });
  await page.waitForTimeout(500);

  // 2) 转交：选人＋原因
  await page.evaluate(() => document.querySelector('.qc-todo-card')?.click());
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-todo-handle-drawer .qhd-foot .btn', '转交');
  await page.waitForTimeout(400);
  out.transferForm = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-handle-drawer');
    return {
      lab: d?.querySelector('.qhd-fixlab')?.textContent.trim(),
      pick: d?.querySelector('.qhd-picklab')?.textContent.trim(),
      bs: d?.querySelector('.qhd-pickbs .bselect-text')?.textContent.trim(),
      ph: d?.querySelector('.qhd-compose textarea')?.placeholder,
    };
  });
  await clickByText(page, '.qc-todo-handle-drawer .qhd-foot .btn', '提交');
  await page.waitForTimeout(400);
  out.transferNoPersonToast = await page.evaluate(() => [...document.querySelectorAll('[class*=toast]')].map((t) => t.textContent.trim()).filter(Boolean));
  // 打开气泡选人
  await page.evaluate(() => { document.querySelector('.qc-todo-handle-drawer .qhd-pickbs .bselect-trigger')?.click(); });
  await page.waitForTimeout(500);
  out.bsOptions = await page.evaluate(() => [...document.querySelectorAll('.bselect-menu .bselect-opt')].map((o) => o.textContent.trim()).slice(0, 6));
  out.bsMenuBox = await page.evaluate(() => { const m = document.querySelector('.bselect-menu'); if (!m) return null; const r = m.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && r.height > 0 }; });
  await page.evaluate(() => { const o = document.querySelector('.bselect-menu .bselect-opt'); if (o) o.click(); });
  await page.waitForTimeout(400);
  out.bsPicked = await page.evaluate(() => document.querySelector('.qc-todo-handle-drawer .qhd-pickbs .bselect-text')?.textContent.trim());
  await page.evaluate(() => { const ta = document.querySelector('.qc-todo-handle-drawer .qhd-compose textarea'); if (ta) { ta.value = '售后口径归客服会话组维护，转给对应同学跟进。'; ta.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-act-transfer-inline.png' });
  await clickByText(page, '.qc-todo-handle-drawer .qhd-foot .btn', '提交');
  await page.waitForTimeout(600);
  out.afterTransfer = await page.evaluate(() => ({ drawer: !!document.querySelector('.qc-todo-handle-drawer'), toasts: [...document.querySelectorAll('[class*=toast]')].map((t) => t.textContent.trim()).filter(Boolean) }));
  out.errs = errs;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
