const { chromium } = require('./.playwright/package');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 2560, height: 1600 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 智能运营中心 → 商机中心 → 市场商机
  await page.evaluate(() => {
    const e = Array.from(document.querySelectorAll('*')).find((x) => x.children.length === 0 && x.textContent.trim() === '运营中心');
    if (e) e.closest('a, button, li, div').click();
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll('.ops-center .subnav')).find((x) => x.textContent.includes('市场商机'));
    if (s) s.click();
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.mk2-tab')).find((x) => x.textContent.trim() === '竞店商品');
    if (t) t.click();
  });
  await page.waitForTimeout(900);

  const r = await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    if (!mk) return { found: false };
    const secs = [...mk.querySelectorAll('.mk-jd-sec')].map((e) => e.textContent.trim());
    const filters = [...mk.querySelectorAll('.sg-filter')];
    const acts = (el) => (el ? [...el.querySelectorAll('.sg-actions button')].map((b) => b.textContent.trim()) : []);
    const goodsSec = mk.querySelector('.mk-jd-sec-gap') ? mk.querySelector('.mk-jd-sec-gap').parentElement.parentElement : null;
    const tables = [...mk.querySelectorAll('table.mk-jd-table')];
    const ths = tables.map((t) => [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim()));
    const goodsTable = tables[1];
    const rows = goodsTable ? [...goodsTable.querySelectorAll('tbody tr')] : [];
    const rowInfo = rows.slice(0, 6).map((tr) => ({
      name: tr.querySelector('.sg-thumb') ? (tr.querySelectorAll('td')[1] || {}).innerText : null,
      match: (tr.querySelector('.mk-hits, .mk-nomatch') || {}).textContent?.trim() ?? '',
      acts: [...tr.querySelectorAll('.actions-col a, .actions-col button')].map((a) => a.textContent.trim()),
    }));
    const taskActs = [...(tables[0] ? tables[0].querySelectorAll('tbody tr:first-child .actions-col a, tbody tr:first-child .actions-col button') : [])].map((a) => a.textContent.trim());
    return {
      found: true,
      hasSubseg: !!mk.querySelector('.mk-jd-subseg'),
      secs,
      filterCount: filters.length,
      taskActs,
      goodsActs: acts(filters[1]),
      ths,
      rowInfo,
      hasBack: [...mk.querySelectorAll('.sg-actions button, .sg-actions a')].some((b) => b.textContent.trim() === '返回'),
      pag: [...mk.querySelectorAll('.ib-pageinfo')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()),
    };
  });
  console.log(JSON.stringify(r, null, 2));

  // 交互：任务行「店铺商品」→ 商品段店铺名预填 + 滚动
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const t = mk.querySelectorAll('table.mk-jd-table')[0];
    const a = [...t.querySelectorAll('tbody tr:first-child .actions-col a')].find((x) => x.textContent.trim() === '店铺商品');
    if (a) a.click();
  });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const fs = mk.querySelectorAll('.sg-filter');
    const shopInput = fs[1] ? fs[1].querySelectorAll('.sg-input')[1] : null;
    return { shopVal: shopInput ? shopInput.value : null, scrollY: window.scrollY, secTop: mk.querySelector('.mk-jd-sec-gap')?.getBoundingClientRect().top };
  });
  console.log(JSON.stringify({ before, after }, null, 2));

  // 收起/展开
  const fold = await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const btn = [...mk.querySelectorAll('.sg-actions button')].find((b) => /收起|展开/.test(b.textContent));
    if (!btn) return { found: false };
    btn.click();
    return { found: true, text: btn.textContent.trim() };
  });
  await page.waitForTimeout(500);
  const foldAfter = await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const fs = mk.querySelectorAll('.sg-filter');
    const btn = [...mk.querySelectorAll('.sg-actions button')].find((b) => /收起|展开/.test(b.textContent));
    return { text: btn ? btn.textContent.trim() : null, fields: fs[0] ? fs[0].querySelectorAll('.sg-field').length : null };
  });
  console.log(JSON.stringify({ fold, foldAfter }, null, 2));

  await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const btn = [...mk.querySelectorAll('.sg-actions button')].find((b) => /收起|展开/.test(b.textContent));
    if (btn && btn.textContent.includes('展开')) btn.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'D:/PM.funion/screenshots/mk-jd-onepage.png' });

  console.log('CONSOLE_ERRORS', JSON.stringify(errs));
  await browser.close();
  process.exit(0);
})();
