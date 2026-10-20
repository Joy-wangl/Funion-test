/* 验证：豁免机制删除申诉豁免（旧存储含申诉规则须被过滤、类型下拉四档、条件行无状态选择器） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
const r = {};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  /* 预置旧存储：含一条申诉豁免规则，验证加载时被过滤 */
  await page.addInitScript(() => {
    localStorage.setItem('funion:auditExempts', JSON.stringify([
      { id: 'ex1', type: '新品豁免', name: '首次上架不足15天', cond: '商品首次上架 ≤ 15 天', conds: [{ metric: 'shelfDays', op: '≤', value: 15 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-12 09:00:00' },
      { id: 'ex4', type: '申诉豁免', name: '差评申诉受理中', cond: '差评申诉状态 = 受理中', conds: [{ metric: 'appealState', op: '≤', value: 0, state: '受理中' }], mode: '延迟考核', value: 7, enabled: true, updatedAt: '2026-10-12 09:00:00' },
    ]));
  });

  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '豁免机制').click());
  await page.waitForSelector('.qc-au-tbl tbody tr');
  r.rows = await page.evaluate(() => [...document.querySelectorAll('.qc-au-tbl tbody tr')].map((tr) => tr.children[0].textContent.trim() + '|' + tr.children[1].textContent.trim()));
  r.hasAppeal = await page.evaluate(() => document.body.innerText.includes('申诉豁免') || document.body.innerText.includes('差评申诉'));
  r.sub = await page.evaluate(() => document.querySelector('.qc-pm-sub')?.textContent.trim());
  r.tip = await page.evaluate(() => document.querySelector('.qc-au-tip')?.textContent.trim());
  await page.screenshot({ path: `${OUT}/exempt-no-appeal.png` });

  /* 新增抽屉：类型下拉四档、条件行=指标+比较符+阈值（无状态选择器） */
  await page.click('.qc-au-card-hd button:has-text("新增豁免")');
  await page.waitForSelector('.drawer.qc-au-dr');
  await page.click('.drawer.qc-au-dr .sg-field:has(label:text("豁免类型")) .bselect-trigger');
  await page.waitForTimeout(250);
  r.typeOpts = await page.evaluate(() => [...document.querySelectorAll('.bselect-menu .bselect-label')].map((e) => e.textContent.trim()));
  await page.evaluate(() => [...document.querySelectorAll('.bselect-menu .bselect-opt')].find((o) => o.textContent.includes('新链接豁免'))?.click());
  await page.waitForTimeout(250);
  r.condRow = await page.evaluate(() => {
    const row = document.querySelector('.drawer.qc-au-dr .qc-au-row');
    return {
      selects: [...row.querySelectorAll('.sg-select')].length,
      hasState: !!row.querySelector('.qc-au-state'),
      valUnit: row.querySelector('.qc-au-vunit')?.textContent.trim(),
      when: row.querySelector('.qc-au-when')?.textContent.trim(),
    };
  });
  r.genName = await page.evaluate(() => document.querySelector('.drawer.qc-au-dr .qc-au-readonly')?.value);
  await page.screenshot({ path: `${OUT}/exempt-drawer-no-appeal.png` });
  await page.click('.drawer.qc-au-dr .drawer-foot button:has-text("取消")');
  await page.waitForTimeout(250);

  /* 编辑存量规则：条件行同样无状态选择器 */
  await page.evaluate(() => [...document.querySelectorAll('.qc-au-tbl tbody tr')].find((tr) => tr.textContent.includes('新品豁免')).querySelector('.qc-au-ops a').click());
  await page.waitForSelector('.drawer.qc-au-dr');
  r.editCondRow = await page.evaluate(() => {
    const row = document.querySelector('.drawer.qc-au-dr .qc-au-row');
    return { selects: [...row.querySelectorAll('.sg-select')].length, hasState: !!row.querySelector('.qc-au-state') };
  });
  await page.click('.drawer.qc-au-dr .drawer-foot button:has-text("取消")');

  r.errors = errors.slice(0, 6);
  fs.writeFileSync('D:/PM.funion/scripts/tmp-exempt-del.json', JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message.split('\n')[0]); console.log(JSON.stringify(r, null, 2)); process.exit(1); });
