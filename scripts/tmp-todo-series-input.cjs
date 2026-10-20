/* 验证：发起待办-系列编码改输入模糊查询（候选/选中收拢/优化范围后置/清除/预选） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const r = {};
const fieldOf = (page, label) => page.evaluate((lb) => {
  const f = [...document.querySelectorAll('.qc-todo-create .sg-field')].find((x) => x.querySelector('label')?.textContent.includes(lb));
  return f ? f.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : null;
}, label);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 2000, height: 1130 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务')?.click());
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelector('.qc-todo-new')?.click());
  await page.waitForSelector('.qc-todo-create');
  await page.waitForTimeout(400);

  /* 选优化类型=编码优化 */
  await page.click('.qc-todo-create .sg-field:has(label:text("优化类型")) .bselect-trigger');
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('.bselect-menu .bselect-opt')].find((o) => o.textContent.trim() === '编码优化')?.click());
  await page.waitForTimeout(400);

  /* 1. 输入框态：占位/无优化范围 */
  r.inputPlaceholder = await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-sbox .sg-input')?.placeholder ?? null);
  r.scopeBefore = await fieldOf(page, '优化范围');

  /* 2. 输入模糊查询 */
  await page.fill('.qc-todo-create .qc-tc-sbox .sg-input', '挂钩');
  await page.waitForTimeout(400);
  r.hits = await page.evaluate(() => [...document.querySelectorAll('.qc-todo-create .qc-tc-srow')].map((b) => b.textContent.trim()));
  r.hitAllMatch = r.hits.every((t) => t.includes('挂钩'));
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-series-input-hits.png' });

  /* 3. 选中：收拢+优化范围出现 */
  const first = r.hits[0];
  await page.click('.qc-todo-create .qc-tc-srow');
  await page.waitForTimeout(400);
  r.afterPick = {
    inputVal: await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-sbox .sg-input')?.value ?? null),
    popGone: await page.evaluate(() => !document.querySelector('.qc-todo-create .qc-tc-spop')),
    scope: await fieldOf(page, '优化范围'),
    picked: first,
  };
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-series-input-picked.png' });

  /* 4. 指定商品编码：编码清单全勾选 */
  await page.evaluate(() => [...document.querySelectorAll('.qc-todo-create .qc-tc-types button')].find((b) => b.textContent.trim() === '指定商品编码')?.click());
  await page.waitForTimeout(300);
  r.codes = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.qc-todo-create .qc-tc-coderow')];
    return { n: rows.length, checked: rows.filter((x) => x.querySelector('.checkbox')?.classList.contains('on') || x.querySelector('input')?.checked).length, hint: document.querySelector('.qc-todo-create .qc-tc-codehint')?.textContent.trim() };
  });

  /* 5. 改输入＝放弃选择：范围收起+无匹配 */
  await page.fill('.qc-todo-create .qc-tc-sbox .sg-input', '挂钩zzz');
  await page.waitForTimeout(400);
  r.afterEdit = { scope: await fieldOf(page, '优化范围'), empty: await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-sempty')?.textContent.trim() ?? null) };

  /* 6. 清除钮 */
  await page.click('.qc-todo-create .qc-tc-sbox .sg-clear');
  await page.waitForTimeout(300);
  r.afterClear = { inputVal: await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-sbox .sg-input')?.value ?? null), popGone: await page.evaluate(() => !document.querySelector('.qc-todo-create .qc-tc-spop')) };

  /* 7. 监控列表入口预选 */
  await page.evaluate(() => document.querySelector('.qc-todo-create .drawer-head .x')?.click());
  await page.waitForTimeout(500);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '监控列表')?.click());
  await page.waitForSelector('.qc-center-page table.qc-wide tbody tr', { timeout: 30000 });
  await page.waitForTimeout(800);
  r.presetRow = await page.evaluate(() => {
    const trs = [...document.querySelectorAll('.qc-center-page table.qc-wide tbody tr')].filter((t) => !t.classList.contains('expand-row'));
    const tr = trs.find((t) => [...t.querySelectorAll('.qc-op-col a')].some((a) => a.textContent.trim() === '创建优化任务'));
    if (!tr) return null;
    const name = (tr.children[1]?.textContent ?? '').trim().split('关联ID数')[0];
    [...tr.querySelectorAll('.qc-op-col a')].find((a) => a.textContent.trim() === '创建优化任务').click();
    return name;
  });
  await page.waitForSelector('.qc-todo-create');
  await page.waitForTimeout(500);
  r.preset = {
    inputVal: await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-sbox .sg-input')?.value ?? null),
    scope: await fieldOf(page, '优化范围'),
    rowName: r.presetRow,
  };
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-series-input-preset.png' });

  r.errors = errors.slice(0, 5);
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
