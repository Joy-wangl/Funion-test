/* 验证：监控列表操作列「问题处理」融合弹窗（责任部门 + 取消命中 + 标记问题商品）与「关联ID」跳转店铺商品查询 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const BASE = 'http://127.0.0.1:5173/';

const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);

const lastToast = (page) =>
  page.evaluate(() => {
    const t = [...document.querySelectorAll('.toast .msg')];
    return t.length ? t[t.length - 1].textContent.trim() : '';
  });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const r = {};
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(400);
  await clickByText(page, '.qc-side .qc-subnav', '监控列表');
  await page.waitForSelector('.qc-center-page tbody tr');
  await page.waitForTimeout(400);

  /* 1) 操作列链接 */
  const ops = await page.evaluate(() => {
    const tr = document.querySelector('.qc-center-page tbody tr');
    return [...tr.querySelectorAll('.qc-op-col a')].map((a) => a.textContent.trim());
  });
  console.log('ops:', JSON.stringify(ops));
  r['ops.links'] = JSON.stringify(ops) === JSON.stringify(['查看详情', '趋势图', '问题处理', '关联ID']);
  const idCount = await page.evaluate(() => {
    const txt = document.querySelector('.qc-center-page tbody tr .col-name').textContent;
    return Number((txt.match(/关联ID数：(\d+)/) || [])[1] || 0);
  });
  const firstCode = await page.evaluate(() => {
    const txt = document.querySelector('.qc-center-page tbody tr .col-name').textContent;
    return txt;
  });
  console.log('idCount:', idCount);
  await page.screenshot({ path: `${OUT}/act-ops-col.png`, clip: await page.evaluate(() => {
    const b = document.querySelector('.qc-center-page tbody tr').getBoundingClientRect();
    return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(1600, b.width), height: Math.min(400, b.height) };
  }) });

  /* 2) 打开问题处理弹窗 */
  await clickByText(page, '.qc-center-page tbody tr .qc-op-col a', '问题处理');
  await page.waitForSelector('.qc-act');
  await page.waitForTimeout(300);
  const modal = await page.evaluate(() => {
    const m = document.querySelector('.pm-page .modal');
    const secs = [...m.querySelectorAll('.qc-act-t')].map((x) => x.textContent.trim());
    const depts = [...m.querySelectorAll('.qc-act-depts .duty-opt')].map((x) => x.textContent.trim());
    const rows = [...m.querySelectorAll('.qc-act-tb tbody tr')];
    const foot = [...m.querySelectorAll('.modal-foot .btn')].map((b) => ({ t: b.textContent.trim(), d: b.disabled }));
    return {
      title: m.querySelector('.m-title').textContent.trim(),
      sub: m.querySelector('.m-sub').textContent.trim(),
      secs,
      depts,
      activeDept: (m.querySelector('.qc-act-depts .duty-opt.active') || {}).textContent,
      rows: rows.length,
      codes: rows.map((tr) => tr.querySelector('.qc-act-code').textContent.trim()),
      cancelDisabled: rows.map((tr) => tr.querySelectorAll('input[type=checkbox]')[0].disabled),
      markChecked: rows.map((tr) => tr.querySelectorAll('input[type=checkbox]')[1].checked),
      allLinks: [...m.querySelectorAll('.qc-act-all')].map((x) => x.textContent.trim()),
      foot,
      width: m.getBoundingClientRect().width,
    };
  });
  console.log('modal:', JSON.stringify(modal, null, 1));
  r['modal.title'] = modal.title === '问题处理';
  r['modal.sections'] = JSON.stringify(modal.secs) === JSON.stringify(['责任部门', '命中处理']);
  r['modal.depts'] = modal.depts.length >= 4 && modal.depts[0].includes('自动归属');
  r['modal.rowsMatchIds'] = modal.rows === idCount;
  r['modal.confirmDisabledInit'] = modal.foot.some((b) => b.t === '确认' && b.d);
  r['modal.noOverflow'] = modal.width <= 1600;
  await page.screenshot({ path: `${OUT}/act-modal.png` });

  /* 3) 勾选一个可取消命中的编码 → 确认 */
  const cancelIdx = modal.cancelDisabled.findIndex((d) => !d);
  console.log('cancelIdx:', cancelIdx);
  r['has.cancelableRow'] = cancelIdx >= 0;
  if (cancelIdx >= 0) {
    await page.evaluate((i) => {
      const rows = [...document.querySelectorAll('.qc-act-tb tbody tr')];
      rows[i].querySelectorAll('input[type=checkbox]')[0].click();
    }, cancelIdx);
    await page.waitForTimeout(200);
    const enabled = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.pm-page .modal .modal-foot .btn')].find((x) => x.textContent.trim() === '确认');
      return !b.disabled;
    });
    r['confirm.enabledAfterPick'] = enabled;
    await page.screenshot({ path: `${OUT}/act-modal-picked.png` });
    await clickByText(page, '.pm-page .modal .modal-foot .btn', '确认');
    await page.waitForTimeout(400);
    const t1 = await lastToast(page);
    console.log('toast1:', t1);
    r['toast.cancel'] = t1.includes('已取消命中 1 个商品编码');
    r['modal.closed'] = !(await page.evaluate(() => !!document.querySelector('.qc-act')));
    await page.screenshot({ path: `${OUT}/act-after-cancel.png` });

    /* 重开：被取消的编码不再列出 */
    await clickByText(page, '.qc-center-page tbody tr .qc-op-col a', '问题处理');
    await page.waitForSelector('.qc-act');
    await page.waitForTimeout(250);
    const rows2 = await page.evaluate(() => [...document.querySelectorAll('.qc-act-tb tbody tr .qc-act-code')].map((x) => x.textContent.trim()));
    console.log('rows2:', JSON.stringify(rows2));
    r['cancel.removesRow'] = rows2.length === modal.rows - 1 && !rows2.includes(modal.codes[cancelIdx]);

    /* 4) 标记问题商品 */
    await page.evaluate(() => {
      const tr = document.querySelector('.qc-act-tb tbody tr');
      tr.querySelectorAll('input[type=checkbox]')[1].click();
    });
    await page.waitForTimeout(200);
    await clickByText(page, '.pm-page .modal .modal-foot .btn', '确认');
    await page.waitForTimeout(400);
    const t2 = await lastToast(page);
    console.log('toast2:', t2);
    r['toast.mark'] = t2.includes('已标记 1 个商品编码为问题商品');

    /* 重开校验回显：已标记芯片 + 勾选态 */
    await clickByText(page, '.qc-center-page tbody tr .qc-op-col a', '问题处理');
    await page.waitForSelector('.qc-act');
    await page.waitForTimeout(250);
    const echo = await page.evaluate(() => {
      const tr = document.querySelector('.qc-act-tb tbody tr');
      return {
        marked: !!tr.querySelector('.tag.mark'),
        checked: tr.querySelectorAll('input[type=checkbox]')[1].checked,
      };
    });
    console.log('echo:', JSON.stringify(echo));
    r['mark.echo'] = echo.marked && echo.checked;
    await page.screenshot({ path: `${OUT}/act-modal-marked.png` });

    /* 5) 责任部门改为具体部门 */
    const dept = await page.evaluate(() => {
      const opts = [...document.querySelectorAll('.qc-act-depts .duty-opt')];
      const t = opts.find((o) => !o.textContent.includes('自动归属'));
      t.click();
      return t.textContent.trim();
    });
    await page.waitForTimeout(200);
    await clickByText(page, '.pm-page .modal .modal-foot .btn', '确认');
    await page.waitForTimeout(400);
    const t3 = await lastToast(page);
    console.log('toast3:', t3, '| dept:', dept);
    r['toast.duty'] = t3.includes(`责任部门已改为「${dept}」`);
    const dutyChip = await page.evaluate(() => {
      const tr = document.querySelector('.qc-center-page tbody tr');
      const star = tr.querySelector('.tag.duty-tag .duty-star');
      return { star: !!star, text: (tr.querySelector('.tag.duty-tag') || {}).textContent };
    });
    console.log('dutyChip:', JSON.stringify(dutyChip));
    r['duty.starInRow'] = dutyChip.star && (dutyChip.text || '').includes(dept);
    await page.evaluate(() => document.body.click());
  }

  /* 6) 关联ID 跳转店铺商品并按编码查询 */
  await clickByText(page, '.qc-center-page tbody tr .qc-op-col a', '关联ID');
  await page.waitForSelector('.qc-sg-table');
  await page.waitForTimeout(500);
  const jump = await page.evaluate(() => {
    const input = document.querySelector('.qc-ss-page .sg-input');
    const rows = [...document.querySelectorAll('.qc-sg-table tbody tr')];
    const activeNav = (document.querySelector('.qc-side .qc-subnav.active') || {}).textContent;
    return {
      q: input ? input.value : null,
      placeholder: input ? input.placeholder : null,
      rows: rows.length,
      firstRow: rows.length ? rows[0].textContent.replace(/\s+/g, ' ').slice(0, 90) : '',
      nav: (activeNav || '').trim(),
      empty: !!document.querySelector('.qc-sg-table tbody tr td[colspan]'),
    };
  });
  console.log('jump:', JSON.stringify(jump, null, 1));
  r['jump.nav'] = jump.nav.includes('店铺商品');
  r['jump.qFilled'] = !!jump.q && /SP-\d+/.test(jump.q);
  r['jump.hasRows'] = jump.rows > 0 && !jump.empty;
  await page.screenshot({ path: `${OUT}/act-goods-jump.png` });

  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
