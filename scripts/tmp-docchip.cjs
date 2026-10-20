/* 文档芯片重构核对：卡面 .td-file / 详情 .qd-att / 上传区 .qc-tc-file
   断言：描边文档图标(色随类型)、名称超长省略、类型·大小副行；旧「文」灰方块已移除 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

const poll = async (page, fn, arg, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    if (await page.evaluate(fn, arg)) return true;
    await page.waitForTimeout(200);
  }
  return false;
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  const out = {};

  const navTo = async (name) => {
    let ok = false;
    for (let i = 0; i < 75; i++) {
      if (await page.evaluate((n) => [...document.querySelectorAll('.qc-nav-text')].some((e) => e.textContent.trim() === n), name)) { ok = true; break; }
      await page.waitForTimeout(200);
    }
    if (!ok) throw new Error('nav not found ' + name);
    await page.evaluate((n) => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === n).click(), name);
    await page.waitForTimeout(500);
  };

  await navTo('待办任务');
  await poll(page, () => [...document.querySelectorAll('.qc-todo-pill button')].length > 0);

  /* 遍历 pill 找到含文档芯片的卡 */
  const pillCount = await page.evaluate(() => document.querySelectorAll('.qc-todo-pill button').length);
  let found = false;
  for (let p = 0; p < pillCount && !found; p++) {
    await page.evaluate((i) => document.querySelectorAll('.qc-todo-pill button')[i].click(), p);
    await page.waitForTimeout(400);
    found = await poll(page, () => !!document.querySelector('.qc-todo-card .td-file'), undefined, 2500);
  }
  out.foundCardChip = found;

  /* ---------- 卡面文档芯片 ---------- */
  out.cardChip = await page.evaluate(() => {
    const chip = document.querySelector('.qc-todo-card .td-file');
    if (!chip) return null;
    const ic = chip.querySelector('.tf-ic');
    const b = chip.querySelector('.tf-tx b');
    const i = chip.querySelector('.tf-tx i');
    const cs = ic ? getComputedStyle(ic) : null;
    let ell = null;
    if (b) {
      const old = b.textContent;
      b.textContent = '这是一个非常非常非常长的文档名称用于测试省略号截断展示效果.xlsx';
      const bcs = getComputedStyle(b);
      ell = { textOverflow: bcs.textOverflow, overflow: bcs.overflow, whiteSpace: bcs.whiteSpace, clipped: b.scrollWidth > b.clientWidth, scrollW: b.scrollWidth, clientW: b.clientWidth };
      b.textContent = old;
    }
    const r = chip.getBoundingClientRect();
    return {
      hasOldKind: !!chip.querySelector('.th.kind'),
      hasOldNm: !!chip.querySelector('.nm'),
      icTag: ic ? ic.tagName : null,
      icColor: cs ? cs.color : null,
      name: b ? b.textContent.trim() : null,
      sub: i ? i.textContent.trim() : null,
      chipH: Math.round(r.height),
      ell,
    };
  });
  const card = await page.$('.qc-todo-card:has(.td-file)');
  if (card) await card.screenshot({ path: `${OUT}/docchip-card.png` });

  /* ---------- 详情附件芯片（事项页签，抽屉类型自适应） ---------- */
  const DRAWERS = ['.qc-todo-page-drawer', '.qc-todo-handle-drawer', '.qc-todo-detail-drawer'];
  await page.evaluate(() => document.querySelector('.qc-todo-card:has(.td-file)').click());
  await poll(page, (sels) => sels.some((s) => document.querySelector(s)), DRAWERS);
  const drawerSel = await page.evaluate((sels) => sels.find((s) => document.querySelector(s)) || null, DRAWERS);
  out.drawerSel = drawerSel;
  if (drawerSel) {
    const hasItems = await page.evaluate((s) => [...document.querySelectorAll(s + ' .qd-tabs button')].some((b) => b.textContent.trim() === '事项'), drawerSel);
    out.hasItemsTab = hasItems;
    if (hasItems) {
      await page.evaluate((s) => [...document.querySelectorAll(s + ' .qd-tabs button')].find((b) => b.textContent.trim() === '事项').click(), drawerSel);
      await page.waitForTimeout(350);
    }
    out.detailAtt = await page.evaluate((s) => {
      const att = document.querySelector(s + ' .qd-att');
      if (!att) return null;
      const ic = att.querySelector('.ic');
      const b = att.querySelector('.tx b');
      const cs = ic ? getComputedStyle(ic) : null;
      const r = ic ? ic.getBoundingClientRect() : null;
      return {
        icTag: ic ? ic.tagName : null,
        icColor: cs ? cs.color : null,
        icBg: cs ? cs.backgroundColor : null,
        icBox: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
        name: b ? b.textContent.trim() : null,
        nameOverflow: b ? getComputedStyle(b).textOverflow : null,
        sub: att.querySelector('.tx i') ? att.querySelector('.tx i').textContent.trim() : null,
        count: document.querySelectorAll(s + ' .qd-att').length,
      };
    }, drawerSel);
    await page.screenshot({ path: `${OUT}/docchip-detail.png` });
    await page.evaluate((s) => { const c = document.querySelector(s + ' .qd-close') || document.querySelector(s + ' .drawer-foot button'); if (c) c.click(); }, drawerSel);
    await poll(page, (s) => !document.querySelector(s), drawerSel);
  }

  /* ---------- 上传区文档芯片（发起待办抽屉，注入多类型文件） ---------- */
  await page.evaluate(() => document.querySelector('.qc-todo-new').click());
  await poll(page, () => !!document.querySelector('.qc-todo-create input[type=file]'));
  await page.setInputFiles('.qc-todo-create input[type=file]', [
    { name: '这是一个非常非常非常长的销售明细报表用于测试省略号.xlsx', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('x') },
    { name: '产品说明书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') },
    { name: '会议纪要.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('x') },
    { name: '归档.zip', mimeType: 'application/zip', buffer: Buffer.from('x') },
  ]);
  await poll(page, () => document.querySelectorAll('.qc-todo-create .qc-tc-file').length >= 4);
  out.uploadRows = await page.evaluate(() => {
    return [...document.querySelectorAll('.qc-todo-create .qc-tc-file')].map((row) => {
      const ic = row.querySelector('.tf-ic');
      const nm = row.querySelector('.nm');
      const sz = row.querySelector('.sz');
      const cs = ic ? getComputedStyle(ic) : null;
      let clipped = null;
      if (nm) { const ncs = getComputedStyle(nm); clipped = { textOverflow: ncs.textOverflow, isClipped: nm.scrollWidth > nm.clientWidth }; }
      return {
        icTag: ic ? ic.tagName : null,
        icColor: cs ? cs.color : null,
        hasOldKind: !!row.querySelector('.th.kind'),
        name: nm ? nm.textContent.trim() : null,
        size: sz ? sz.textContent.trim() : null,
        clipped,
      };
    });
  });
  const upBox = await page.$('.qc-todo-create .qc-tc-files');
  if (upBox) await upBox.screenshot({ path: `${OUT}/docchip-upload.png` });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
