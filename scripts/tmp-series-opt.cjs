/* 验证：监控列表优化任务标签 / 查询条件 / 操作列二态 / 查看优化任务抽屉 / 趋势图优化周期色带 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
const r = {};

const rowsInfo = (page) => page.evaluate(() => {
  const trs = [...document.querySelectorAll('.qc-center-page table.qc-wide tbody tr')].filter((t) => !t.classList.contains('expand-row'));
  return trs.map((tr) => {
    const tagEl = tr.querySelector('.qc-sg-opttag');
    const ops = [...tr.querySelectorAll('.qc-op-col a')].map((a) => a.textContent.trim());
    return {
      code: (tr.children[1]?.textContent ?? '').trim().slice(0, 24),
      tag: !!tagEl,
      tagTitle: tagEl?.getAttribute('title') ?? '',
      ops,
    };
  });
});

const pickOpt = async (page, val) => {
  let opts = [];
  let clicked = false;
  for (let i = 0; i < 3 && !clicked; i++) {
    await page.evaluate(() => {
      const f = [...document.querySelectorAll('.qc-center-page .sg-field')].find((x) => x.querySelector('label')?.textContent.trim() === '优化任务');
      f?.querySelector('.bselect-trigger')?.click();
    });
    await page.waitForTimeout(320);
    const res = await page.evaluate((v) => {
      const list = [...document.querySelectorAll('.bselect-menu .bselect-opt')];
      const o = list.find((e) => e.textContent.trim() === v);
      if (o) o.click();
      return { opts: list.map((e) => e.textContent.trim()), ok: !!o };
    }, val);
    opts = res.opts;
    clicked = res.ok;
    if (!clicked) await page.waitForTimeout(300);
  }
  await page.waitForTimeout(250);
  await page.evaluate(() => [...document.querySelectorAll('.qc-center-page .sg-field-actions button')].find((b) => b.textContent.trim() === '查询').click());
  await page.waitForTimeout(1500);
  return { opts, clicked };
};

const totalOf = (page) => page.evaluate(() => {
  const el = [...document.querySelectorAll('.qc-center-page *')].find((e) => e.childElementCount === 0 && /共\s*\d/.test(e.textContent || ''));
  return el?.textContent.trim() ?? '';
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1760, height: 1040 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '监控列表')?.click());
  await page.waitForSelector('.qc-center-page table.qc-wide tbody tr', { timeout: 30000 });
  await page.waitForTimeout(1000);

  /* 1. 默认态：标签行 + 操作列二态 */
  const all = await rowsInfo(page);
  r.default = {
    total: await totalOf(page),
    rows: all.length,
    tagged: all.filter((x) => x.tag).length,
    viewOp: all.filter((x) => x.ops.includes('查看优化任务')).length,
    createOp: all.filter((x) => x.ops.includes('创建优化任务')).length,
    taggedRows: all.filter((x) => x.tag).map((x) => ({ code: x.code, t: x.tagTitle, ops: x.ops.filter((o) => o.includes('优化')) })),
  };
  r.optFilterExists = await page.evaluate(() => [...document.querySelectorAll('.qc-center-page .sg-field')].some((f) => f.querySelector('label')?.textContent.trim() === '优化任务'));
  await page.screenshot({ path: `${OUT}/series-opt-default.png`, fullPage: false });

  /* 2. 查询条件四档（下拉选项在首次展开时读取） */
  const p1 = await pickOpt(page, '优化中');
  r.optOptions = p1.opts;
  const mid = await rowsInfo(page);
  r.filterMid = { total: await totalOf(page), n: mid.length, allTagged: mid.every((x) => x.tag), ops: [...new Set(mid.flatMap((x) => x.ops.filter((o) => o.includes('优化'))))] };
  await page.screenshot({ path: `${OUT}/series-opt-filter-mid.png` });

  const p2 = await pickOpt(page, '已结束');
  const ended = await rowsInfo(page);
  r.filterEnded = { total: await totalOf(page), n: ended.length, tagged: ended.filter((x) => x.tag).length, ops: [...new Set(ended.flatMap((x) => x.ops.filter((o) => o.includes('优化'))))] };

  const p3 = await pickOpt(page, '无优化任务');
  const none = await rowsInfo(page);
  r.filterNone = { total: await totalOf(page), n: none.length, tagged: none.filter((x) => x.tag).length, ops: [...new Set(none.flatMap((x) => x.ops.filter((o) => o.includes('优化'))))] };
  await page.screenshot({ path: `${OUT}/series-opt-filter-none.png` });

  await pickOpt(page, '全部');
  r.filterAll = { total: await totalOf(page) };

  /* 3. 查看优化任务抽屉 */
  const target = await page.evaluate(() => {
    const trs = [...document.querySelectorAll('.qc-center-page table.qc-wide tbody tr')].filter((t) => !t.classList.contains('expand-row'));
    const tr = trs.find((t) => [...t.querySelectorAll('.qc-op-col a')].some((a) => a.textContent.trim() === '查看优化任务'));
    if (!tr) return null;
    const code = (tr.children[1]?.textContent ?? '').trim().slice(0, 30);
    const title = tr.querySelector('.qc-sg-opttag')?.getAttribute('title') ?? '';
    [...tr.querySelectorAll('.qc-op-col a')].find((a) => a.textContent.trim() === '查看优化任务').click();
    return `${code} || ${title}`;
  });
  r.viewTarget = target;
  await page.waitForTimeout(900);
  r.drawer = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-detail-drawer');
    return d ? { cls: d.className, text: d.innerText.replace(/\s+/g, ' ').slice(0, 260) } : null;
  });
  await page.screenshot({ path: `${OUT}/series-opt-view-drawer.png` });
  await page.evaluate(() => document.querySelector('.qc-todo-detail-drawer')?.closest('body') && (document.querySelector('.drawer-mask')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
  await page.waitForTimeout(600);
  r.drawerClosed = await page.evaluate(() => !document.querySelector('.qc-todo-detail-drawer'));

  /* 4. 趋势图优化周期色带 */
  await page.evaluate(() => {
    const trs = [...document.querySelectorAll('.qc-center-page table.qc-wide tbody tr')].filter((t) => !t.classList.contains('expand-row'));
    const tr = trs.find((t) => t.querySelector('.qc-sg-opttag'));
    if (tr) [...tr.querySelectorAll('.qc-op-col a')].find((a) => a.textContent.trim() === '趋势图')?.click();
  });
  await page.waitForTimeout(1100);
  r.trend = await page.evaluate(() => {
    const m = document.querySelector('.modal .metric-trend');
    const lb = document.querySelector('.metric-trend .mt-band-lb');
    const band = document.querySelector('.metric-trend .mt-band rect');
    return {
      modal: !!m,
      band: !!document.querySelector('.metric-trend .mt-band'),
      bandW: band ? Number(band.getAttribute('width')) : null,
      bandText: lb?.textContent?.trim() ?? null,
      dims: [...document.querySelectorAll('.modal .qc-range-toggle span, .modal .qc-range-toggle div')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 8),
    };
  });
  await page.screenshot({ path: `${OUT}/series-opt-trend-band.png` });
  await page.evaluate(() => document.querySelector('.modal .modal-head .x, .modal .mask-close, .mask')?.click());
  await page.waitForTimeout(600);

  /* 5. 创建优化任务（无标签行） */
  await page.evaluate(() => {
    const trs = [...document.querySelectorAll('.qc-center-page table.qc-wide tbody tr')].filter((t) => !t.classList.contains('expand-row'));
    const tr = trs.find((t) => [...t.querySelectorAll('.qc-op-col a')].some((a) => a.textContent.trim() === '创建优化任务'));
    if (tr) [...tr.querySelectorAll('.qc-op-col a')].find((a) => a.textContent.trim() === '创建优化任务').click();
  });
  await page.waitForTimeout(900);
  r.createDrawer = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-create');
    return d ? d.innerText.replace(/\s+/g, ' ').slice(0, 200) : null;
  });
  await page.screenshot({ path: `${OUT}/series-opt-create-drawer.png` });

  r.errors = errors.slice(0, 6);
  fs.writeFileSync(`${OUT}/../scripts/tmp-series-opt.json`, JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
