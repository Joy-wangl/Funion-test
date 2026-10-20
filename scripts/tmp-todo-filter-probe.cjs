/* 探针：待办筛选行（类型页签 vs 右侧操作组）在两栏/三栏态的几何与折叠计数 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  for (let i = 0; i < 20; i++) {
    if (await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].some((e) => e.textContent.trim() === '待办任务'))) break;
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务').click());
  await page.waitForSelector('.qc-todo-page');
  await page.evaluate(() => [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.includes('我发起')).click());
  await page.waitForTimeout(400);

  const geom = () => page.evaluate(() => {
    const box = document.querySelector('.qc-todo-filter');
    const row = document.querySelector('.tc-typerow');
    const right = document.querySelector('.qc-todo-fright');
    const tabs = [...row.querySelectorAll('.tc-typeitem')].filter((t) => t.offsetParent !== null);
    const lab = row.querySelector('.qc-todo-morelabel');
    const g = (e) => (e ? { x: Math.round(e.getBoundingClientRect().x), w: Math.round(e.getBoundingClientRect().width), top: Math.round(e.getBoundingClientRect().top) } : null);
    return {
      box: g(box), row: g(row), right: g(right),
      rowClient: row.clientWidth,
      visTabs: tabs.map((t) => t.textContent.trim()),
      lastTab: g(tabs[tabs.length - 1]),
      lab: g(lab),
      rowScroll: row.scrollWidth,
      rowContentRight: Math.max(...[...row.children].filter((c) => c.offsetParent !== null).map((c) => Math.round(c.getBoundingClientRect().right))),
      rightX: g(right)?.x,
      search: g(right.querySelector('.qc-todo-search')),
    };
  });

  const out = { noDetail: await geom() };
  await page.locator('.qc-todo-card').nth(1).click({ position: { x: 300, y: 24 } });
  await page.waitForSelector('.qc-todo-detail');
  await page.waitForTimeout(600);
  out.twoColDetail = await geom();
  await page.click('.qc-todo-detail .qd-close');
  await page.waitForTimeout(400);
  await page.locator('.qc-todo-card').nth(2).click({ position: { x: 300, y: 24 } });
  await page.waitForSelector('.qc-todo-handlers');
  await page.waitForTimeout(600);
  out.threeCol = await geom();
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message.split('\n')[0]); process.exit(1); });
